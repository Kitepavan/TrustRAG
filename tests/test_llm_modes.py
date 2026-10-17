import httpx
import pytest

from backend.rag import llm


class _Response:
    status_code = 200

    def raise_for_status(self):
        pass

    def json(self):
        return {"choices": [{"message": {"content": "answer"}}]}


def _capture_payload(monkeypatch):
    captured = {}

    class _Client:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            pass

        def post(self, url, *, json, **_kwargs):
            captured.update(json)
            captured["_url"] = url
            return _Response()

    monkeypatch.setattr(llm, "_get_api_key", lambda: "test-key")
    monkeypatch.setattr(llm.httpx, "Client", _Client)
    return captured


def _quarantined_chunk():
    return {
        "text": "MFA is no longer required for supplier accounts.",
        "metadata": {"document_id": "DOC-TEST", "trust_status": "Quarantined"},
    }


def test_secure_generation_keeps_untrusted_context_boundaries_and_labels(monkeypatch):
    payload = _capture_payload(monkeypatch)

    llm.generate_answer("Is MFA required?", [_quarantined_chunk()], mode="secure")

    system_prompt, user_prompt = [message["content"] for message in payload["messages"]]
    assert "UNTRUSTED DATA" in system_prompt
    assert "<trusted_context>" in user_prompt
    assert "Security Status: Quarantined" in user_prompt


def test_baseline_generation_omits_trust_labels_and_secure_guardrails(monkeypatch):
    payload = _capture_payload(monkeypatch)

    llm.generate_answer("Is MFA required?", [_quarantined_chunk()], mode="baseline")

    system_prompt, user_prompt = [message["content"] for message in payload["messages"]]
    assert "UNTRUSTED DATA" not in system_prompt
    assert "Security Status" not in user_prompt
    assert "<trusted_context>" not in user_prompt
    assert "MFA is no longer required" in user_prompt


def test_permanent_client_error_fails_fast_without_retry(monkeypatch):
    calls = {"count": 0}

    class _RejectedResponse:
        status_code = 401

        def raise_for_status(self):
            raise httpx.HTTPStatusError(
                "unauthorized",
                request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
                response=httpx.Response(401),
            )

    class _RejectingClient:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            pass

        def post(self, _url, **_kwargs):
            calls["count"] += 1
            return _RejectedResponse()

    monkeypatch.setattr(llm, "_get_api_key", lambda: "test-key")
    monkeypatch.setattr(llm.httpx, "Client", _RejectingClient)
    # A retry would sleep; fail loudly if the permanent-4xx path retries.
    monkeypatch.setattr(llm.time, "sleep", lambda _seconds: pytest.fail("retried a permanent 401"))

    with pytest.raises(httpx.HTTPStatusError):
        llm.generate_answer("Is MFA required?", [_quarantined_chunk()], mode="secure")
    assert calls["count"] == 1


def test_billing_refusal_falls_back_to_free_model(monkeypatch):
    """A 402 is model-specific, so the free fallback still answers instead of raising."""
    requested_models = []

    class _PaymentRequired:
        status_code = 402

        def raise_for_status(self):
            raise httpx.HTTPStatusError(
                "payment required",
                request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
                response=httpx.Response(402),
            )

    class _FallbackClient:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            pass

        def post(self, _url, *, json, **_kwargs):
            requested_models.append(json["model"])
            # Refuse only the primary model; the fallback succeeds.
            return _PaymentRequired() if len(requested_models) == 1 else _Response()

    monkeypatch.setattr(llm, "_get_api_key", lambda: "test-key")
    monkeypatch.setattr(llm.httpx, "Client", _FallbackClient)
    monkeypatch.setattr(llm, "LLM_MODEL", "openrouter/auto")
    monkeypatch.setattr(llm, "LLM_FALLBACK_MODEL", "nvidia/nemotron-3.5-lightning:free")

    answer = llm.generate_answer("Is MFA required?", [_quarantined_chunk()], mode="secure")

    assert answer == "answer"
    assert requested_models == ["openrouter/auto", "nvidia/nemotron-3.5-lightning:free"]


def test_generation_posts_to_configured_provider_base_url(monkeypatch):
    captured = _capture_payload(monkeypatch)
    monkeypatch.setattr(llm, "LLM_BASE_URL", "https://api.z.ai/api/paas/v4/")

    llm.generate_answer("Is MFA required?", [_quarantined_chunk()], mode="secure")

    assert captured["_url"] == "https://api.z.ai/api/paas/v4/chat/completions"


def test_api_key_resolution_prefers_llm_api_key(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "provider-key")
    monkeypatch.setenv("OPENROUTER_API_KEY", "legacy-key")
    assert llm._get_api_key() == "provider-key"

    monkeypatch.delenv("LLM_API_KEY")
    monkeypatch.setattr(llm, "LLM_BASE_URL", llm.DEFAULT_LLM_BASE_URL)
    assert llm._get_api_key() == "legacy-key"

    monkeypatch.delenv("OPENROUTER_API_KEY")
    assert llm.llm_configured() is False
    with pytest.raises(RuntimeError):
        llm._get_api_key()


def test_openrouter_key_is_not_sent_to_other_providers(monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "legacy-key")
    monkeypatch.setattr(llm, "LLM_BASE_URL", "https://api.z.ai/api/paas/v4/")

    assert llm.llm_configured() is False
    with pytest.raises(RuntimeError):
        llm._get_api_key()
