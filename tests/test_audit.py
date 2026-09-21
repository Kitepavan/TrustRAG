"""Audit and query traces use isolated stores and never call an external LLM."""

import json

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.api import query
from backend.rag import secure_retrieval
from backend.security import audit
from backend.security.auth import create_jwt_token
from backend.security.hashing import compute_sha256_str


@pytest.fixture(autouse=True)
def isolated_audit(tmp_path, monkeypatch):
    monkeypatch.setattr(audit, "AUDIT_DB", tmp_path / "audit.sqlite3")


def headers(username="admin"):
    return {"Authorization": "Bearer " + create_jwt_token({"username": username})}


def test_query_trace_and_audit_access(monkeypatch):
    text = "Public holiday calendar."
    candidates = [
        {"chunk_id": "public", "text": text, "score": 0.1,
         "metadata": {"document_id": "public", "sha256": "digest", "text_sha256": compute_sha256_str(text)}},
        {"chunk_id": "restricted-id", "text": "Confidential salary", "score": 0.2,
         "metadata": {"document_id": "restricted-id", "sha256": "digest", "text_sha256": compute_sha256_str("Confidential salary")}},
    ]
    monkeypatch.setattr(query, "embed_query", lambda _: [0.1])
    monkeypatch.setattr(secure_retrieval, "query_chunks", lambda **_: candidates)
    monkeypatch.setattr(secure_retrieval, "verified_documents", lambda docs: {doc: {
        "sha256": "digest", "integrity_ok": True, "trust_status": "Trusted",
        "access_level": "PUBLIC" if doc == "public" else "HR_CONFIDENTIAL",
    } for doc in docs})
    monkeypatch.setattr(query, "generate_answer", lambda *_: "Calendar answer")
    with TestClient(app) as client:
        response = client.post("/query", headers=headers("emp_user"), json={"question": "private query must not be logged"})
        assert response.status_code == 200
        body = response.json()
        assert body["audit_recorded"] is True
        assert len(body["sources"]) == 1
        stages = {row["stage"]: row for row in body["pipeline_log"]}
        assert stages["retrieval"]["count"] == 2
        assert stages["BLOCKED_UNAUTHORIZED_RBAC"]["count"] == 1
        assert stages["context"]["count"] == 1
        assert "restricted-id" not in json.dumps(body)
        assert client.get("/audit/events").status_code == 401
        assert client.get("/audit/events", headers=headers("emp_user")).status_code == 403
        events = client.get("/audit/events", headers=headers()).json()["events"]
        assert events[0]["event_type"] == "QUERY_COMPLETED"
        assert events[0]["request_id"] == body["request_id"]
        assert "private query" not in json.dumps(events)
        assert "Confidential salary" not in json.dumps(events)


def test_audit_pagination_and_filtering():
    for index in range(3):
        assert audit.record_event("admin", "TEST_EVENT", "warning", str(index))
    audit.record_event("admin", "OTHER_EVENT")
    page = audit.list_events(limit=2, severity="warning")
    assert len(page["events"]) == 2
    assert page["next_cursor"] is not None
    next_page = audit.list_events(limit=2, before=page["next_cursor"], severity="warning")
    assert len(next_page["events"]) == 1
    assert next_page["next_cursor"] is None
    assert len(audit.list_events(event_type="OTHER_EVENT")["events"]) == 1


def test_no_context_failure_and_baseline_events(monkeypatch):
    monkeypatch.setattr(query, "embed_query", lambda _: [0.1])
    monkeypatch.setattr(secure_retrieval, "query_chunks", lambda **_: [])
    with TestClient(app) as client:
        response = client.post("/query", headers=headers(), json={"question": "hello"})
        assert response.json()["pipeline_log"][-1]["message"].endswith("LLM not called.")
        assert audit.list_events()["events"][0]["event_type"] == "QUERY_NO_CONTEXT"
        assert client.post("/query", headers=headers("emp_user"), json={"question": "hello", "mode": "baseline"}).status_code == 403
        assert audit.list_events()["events"][0]["event_type"] == "BASELINE_ACCESS_DENIED"
        response = client.post("/query", headers=headers(), json={"question": "hello", "mode": "baseline"})
        assert any(row["stage"] == "security_filters" for row in response.json()["pipeline_log"])
        assert audit.list_events(event_type="BASELINE_MODE_USED")["events"]
        def fail(_):
            raise RuntimeError("private exception")
        monkeypatch.setattr(query, "embed_query", fail)
        response = client.post("/query", headers=headers(), json={"question": "hello"})
        assert response.status_code == 503
        assert response.json()["audit_recorded"] is True
        assert "private exception" not in response.text


def test_upload_persists_audit_event(monkeypatch):
    from backend.api import documents
    monkeypatch.setattr(documents, "embed_chunks", lambda chunks: [dict(c, embedding=[0.1, 0.2, 0.3]) for c in chunks])
    with TestClient(app) as client:
        response = client.post("/documents/upload", headers=headers(),
                               files={"file": ("calendar.txt", b"The office is open on Monday.", "text/plain")})
        assert response.status_code == 200
        body = response.json()
        events = client.get("/audit/events?event_type=UPLOAD_COMPLETED", headers=headers()).json()["events"]
        assert len(events) == 1
        assert events[0]["details"]["document_id"] == body["document_id"]
        assert "The office" not in json.dumps(events)
        rejected = client.post("/documents/upload", headers=headers(), files={"file": ("bad.exe", b"data")})
        assert rejected.status_code == 400
        assert audit.list_events(event_type="UPLOAD_REJECTED")["events"]


def test_audit_failure_does_not_raise(tmp_path, monkeypatch):
    monkeypatch.setattr(audit, "AUDIT_DB", tmp_path)
    assert audit.record_event("admin", "TEST_EVENT") is False
