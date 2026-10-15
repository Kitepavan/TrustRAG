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

        def post(self, _url, *, json, **_kwargs):
            captured.update(json)
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
