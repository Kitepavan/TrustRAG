import math
import json

import pytest

from backend.security import injection_detector as detector


class FakeResponse:
    status_code = 200

    def __init__(self, data):
        self.data = data

    def raise_for_status(self):
        return None

    def json(self):
        return self.data


def _fake_answers(**probabilities):
    return {"answers": {
        key: {"type": "noul", "noul": value}
        for key, value in probabilities.items()
    }}


def test_scanner_uses_systemone_and_reads_typed_yes_probability(monkeypatch):
    calls = []

    class Client:
        def __init__(self, **kwargs):
            assert kwargs["timeout"] > 0

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def post(self, url, *, json, headers):
            calls.append((url, json, headers))
            return FakeResponse(_fake_answers(item_0=0.9999))

    monkeypatch.setattr(detector.httpx, "Client", Client)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.delenv("TRUSTRAG_DECISION_URL", raising=False)
    monkeypatch.delenv("TRUSTRAG_DECISION_MODEL", raising=False)

    result = detector.scan_for_prompt_injection("A hidden instruction for the assistant.")

    assert result["is_injection"] is True
    assert result["risk_score"] == 0.9999
    url, payload, headers = calls[0]
    assert url == "https://openrouter.ai/api/v1/systemone"
    assert payload["model"] == "inception/mercury-decide:free"
    assert payload["questions"]["item_0"]["type"] == "noul"
    assert json.loads(payload["state"]) == {"item_0": "A hidden instruction for the assistant."}
    assert headers["Authorization"] == "Bearer test-key"


@pytest.mark.parametrize("bad_probability", [math.nan, -0.1, 1.1, "0.9", None])
def test_invalid_probability_fails_closed(monkeypatch, bad_probability):
    class Client:
        def __init__(self, **_kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def post(self, *_args, **_kwargs):
            return FakeResponse(_fake_answers(item_0=bad_probability))

    monkeypatch.setattr(detector.httpx, "Client", Client)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    result = detector.scan_for_prompt_injection("Text to inspect")

    assert result["scan_status"] == "unavailable"
    assert result["is_injection"] is True


def test_missing_answer_or_wrong_typed_answer_fails_closed(monkeypatch):
    class Client:
        def __init__(self, **_kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def post(self, *_args, **_kwargs):
            return FakeResponse({"answers": {"item_0": {"type": "choice", "noul": 0.0}}})

    monkeypatch.setattr(detector.httpx, "Client", Client)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    result = detector.scan_for_prompt_injection("Text to inspect")

    assert result["scan_status"] == "unavailable"
    assert result["is_injection"] is True


def test_provider_exception_fails_closed(monkeypatch):
    class Client:
        def __init__(self, **_kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def post(self, *_args, **_kwargs): raise TimeoutError("provider timeout")

    monkeypatch.setattr(detector.httpx, "Client", Client)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    result = detector.scan_for_prompt_injection("Text to inspect")

    assert result["scan_status"] == "unavailable"
    assert result["failure_code"] == "INJECTION_CLASSIFIER_UNAVAILABLE"


@pytest.mark.parametrize("response_failure", ["http", "json", "missing_answer"])
def test_bad_provider_responses_fail_closed(monkeypatch, response_failure):
    class Client:
        def __init__(self, **_kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def post(self, *_args, **_kwargs):
            if response_failure == "http":
                raise RuntimeError("non-success response")
            if response_failure == "json":
                return FakeResponse(ValueError("invalid JSON"))
            return FakeResponse({"answers": {}})

    monkeypatch.setattr(detector.httpx, "Client", Client)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    if response_failure == "json":
        def invalid_json(_self):
            raise ValueError("invalid JSON")
        monkeypatch.setattr(FakeResponse, "json", invalid_json)

    result = detector.scan_for_prompt_injection("Text to inspect")

    assert result["scan_status"] == "unavailable"
    assert result["is_injection"] is True


def test_long_text_is_segmented_and_any_positive_segment_blocks(monkeypatch):
    calls = []

    class Client:
        def __init__(self, **_kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def post(self, _url, *, json, **_kwargs):
            calls.append(json)
            positive = len(calls) == 2
            answers = {
                key: {"type": "noul", "noul": 1.0 if positive else 0.1}
                for key in json["questions"]
            }
            return FakeResponse({"answers": answers})

    monkeypatch.setattr(detector.httpx, "Client", Client)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    result = detector.scan_for_prompt_injection("safe text " * 4000)

    assert result["is_injection"] is True
    assert len(calls) > 1
    assert all(len(call["questions"]) <= detector.MAX_QUESTIONS_PER_REQUEST for call in calls)


def test_any_segment_provider_failure_keeps_whole_document_unavailable(monkeypatch):
    calls = 0

    class Client:
        def __init__(self, **_kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def post(self, _url, *, json, **_kwargs):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise TimeoutError("provider timeout")
            return FakeResponse({
                "answers": {
                    key: {"type": "noul", "noul": 0.1}
                    for key in json["questions"]
                }
            })

    monkeypatch.setattr(detector.httpx, "Client", Client)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    result = detector.scan_for_prompt_injection("supplier text " * 4000)

    assert result["scan_status"] == "unavailable"
    assert result["is_injection"] is True


def test_missing_key_fails_closed_without_text_in_error(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("TRUSTRAG_DECISION_API_KEY", raising=False)
    monkeypatch.delenv("TRUSTRAG_DECISION_URL", raising=False)
    monkeypatch.delenv("TRUSTRAG_DECISION_MODEL", raising=False)
    text = "private text that must not be returned"

    result = detector.scan_for_prompt_injection(text)

    assert result["scan_status"] == "unavailable"
    assert result["is_injection"] is True
    assert text not in str(result)


def test_non_text_input_fails_closed():
    result = detector.scan_prompt_injections([("bad", None)])

    assert result["bad"]["scan_status"] == "unavailable"
    assert result["bad"]["is_injection"] is True


def test_retrieval_batch_preserves_keys_and_fails_closed_for_failed_batch(monkeypatch):
    calls = []

    class Client:
        def __init__(self, **_kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def post(self, _url, *, json, **_kwargs):
            calls.append(json)
            return FakeResponse(_fake_answers(item_0=0.1 if len(calls) == 1 else 0.9))

    monkeypatch.setattr(detector.httpx, "Client", Client)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    results = detector.scan_prompt_injections([
        ("chunk-a", "supplier requirement"),
        ("chunk-b", "instruction-like content"),
    ])

    assert results["chunk-a"]["is_injection"] is False
    assert results["chunk-b"]["is_injection"] is True
    assert [json.loads(call["state"])["item_0"] for call in calls] == [
        "supplier requirement", "instruction-like content",
    ]


def test_decision_endpoint_env_override(monkeypatch):
    calls = []

    class Client:
        def __init__(self, **_kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def post(self, url, *, json, headers):
            calls.append((url, json, headers))
            return FakeResponse(_fake_answers(item_0=0.9))

    monkeypatch.setattr(detector.httpx, "Client", Client)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("TRUSTRAG_DECISION_URL", "http://127.0.0.1:8077/v1/systemone")
    monkeypatch.setenv("TRUSTRAG_DECISION_MODEL", "english")

    result = detector.scan_for_prompt_injection("Text to inspect")

    assert result["is_injection"] is True
    url, payload, _headers = calls[0]
    assert url == "http://127.0.0.1:8077/v1/systemone"
    assert payload["model"] == "english"


def test_truncated_state_fails_closed(monkeypatch):
    class Client:
        def __init__(self, **_kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def post(self, *_args, **_kwargs):
            return FakeResponse({**_fake_answers(item_0=0.0), "usage": {"truncated": True}})

    monkeypatch.setattr(detector.httpx, "Client", Client)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    result = detector.scan_for_prompt_injection("Text to inspect")

    assert result["scan_status"] == "unavailable"
    assert result["is_injection"] is True


def test_decision_api_key_preferred_over_openrouter_key(monkeypatch):
    calls = []

    class Client:
        def __init__(self, **_kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def post(self, url, *, json, headers):
            calls.append((url, headers))
            return FakeResponse(_fake_answers(item_0=0.1))

    monkeypatch.setattr(detector.httpx, "Client", Client)
    monkeypatch.setenv("TRUSTRAG_DECISION_API_KEY", "decision-key")
    monkeypatch.setenv("OPENROUTER_API_KEY", "legacy-key")
    monkeypatch.setenv("TRUSTRAG_DECISION_URL", "http://127.0.0.1:8077/v1/systemone")

    result = detector.scan_for_prompt_injection("Text to inspect")

    assert result["is_injection"] is False
    assert calls[0][1]["Authorization"] == "Bearer decision-key"


def test_custom_endpoint_without_any_key_sends_no_authorization(monkeypatch):
    calls = []

    class Client:
        def __init__(self, **_kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def post(self, url, *, json, headers):
            calls.append((url, headers))
            return FakeResponse(_fake_answers(item_0=0.1))

    monkeypatch.setattr(detector.httpx, "Client", Client)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("TRUSTRAG_DECISION_API_KEY", raising=False)
    monkeypatch.setenv("TRUSTRAG_DECISION_URL", "http://127.0.0.1:8077/v1/systemone")

    result = detector.scan_for_prompt_injection("Supplier text")

    assert result["is_injection"] is False and result["scan_status"] == "complete"
    assert "Authorization" not in calls[0][1]
