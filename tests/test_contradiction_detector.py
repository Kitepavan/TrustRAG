"""Consensus contradiction detector + admin override; no model or external services."""

from fastapi.testclient import TestClient

from backend.main import app
from backend.security.auth import create_jwt_token
from backend.security.hashing import compute_sha256_str
from backend.security import document_store
import backend.security.contradiction_detector as contradiction_detector
from backend.security.contradiction_detector import (
    scan_for_consensus_contradiction,
    scan_chunk_for_contradiction,
)
from backend.security.hashing import compute_sha256_bytes
from backend.security.trust_engine import TrustEngine
from backend.rag import vectorstore


def auth(name):
    return {"Authorization": f"Bearer {create_jwt_token({'username': name})}"}


def stub_query(texts, statuses=None, document_ids=None, scores=None):
    statuses = statuses or ["Trusted"] * len(texts)
    document_ids = document_ids or [f"DOC-T{i}" for i in range(len(texts))]
    scores = scores or [0.1] * len(texts)

    def q(query_embedding=None, top_k=5, **kw):
        return [
            {"chunk_id": f"c{i}", "text": text, "score": scores[i],
             "metadata": {"document_id": document_ids[i], "trust_status": statuses[i],
                          "sha256": f"sha-{document_ids[i]}",
                          "text_sha256": compute_sha256_str(text)}}
            for i, text in enumerate(texts)
        ]
    return q


def scan_with_sources(monkeypatch, text, neighbors, verified=None, exclude_document_id=None):
    verified = verified or {
        neighbor["metadata"]["document_id"]: {
            "document_id": neighbor["metadata"]["document_id"],
            "trust_status": neighbor["metadata"]["trust_status"],
            "integrity_ok": True,
            "sha256": neighbor["metadata"]["sha256"],
        }
        for neighbor in neighbors
    }
    monkeypatch.setattr(
        contradiction_detector,
        "verified_documents",
        lambda document_ids: {document_id: verified.get(document_id) for document_id in document_ids},
        raising=False,
    )
    return scan_for_consensus_contradiction(
        text, exclude_document_id=exclude_document_id, embed_fn=embed,
        query_fn=lambda query_embedding=None, top_k=5: neighbors,
    )


def embed(texts):
    return [[1.0] * 8 for _ in texts]


def test_cold_start_never_blocks():
    long_claim = "Passwords are no longer required for any employee workstation access today."
    assert scan_for_consensus_contradiction(long_claim)["is_contradiction"] is False


def test_paraphrase_passes(monkeypatch):
    neighbors = stub_query([
        "Passwords must be rotated every 90 days for all employees.",
        "Every employee must change passwords every 90 days for compliance.",
    ])(top_k=5)
    res = scan_with_sources(
        monkeypatch,
        "Passwords must be rotated every 90 days for security compliance purposes.",
        neighbors,
    )
    assert res["decision"] == "clear"
    assert res["is_contradiction"] is False


def test_numeric_flip_contradicts_and_quarantines_even_when_signed(monkeypatch):
    base = ["Passwords must be changed every 90 days for all employees.",
            "All staff must rotate passwords every 90 days for account security."]
    res = scan_with_sources(
        monkeypatch,
        "Passwords are no longer required and MFA is now unlimited for everyone here.",
        stub_query(base)(top_k=5),
    )
    assert res["decision"] == "quarantine"
    assert res["is_contradiction"] is True
    verdict = TrustEngine.evaluate_document_trust(
        b"x", "Passwords are no longer required.", True, True, contradiction_result=res)
    assert verdict["trust_category"] == "Quarantined"
    assert any("CONSENSUS_CONTRADICTION" in r for r in verdict["reasons"])


def test_unseen_topic_leave_contradiction(monkeypatch):
    base = ["Annual leave is 12 days per year for all staff members.",
            "Staff annual leave allowance is fixed at 12 days per year."]
    res = scan_with_sources(
        monkeypatch,
        "Annual leave is now unlimited for all staff members effective immediately.",
        stub_query(base)(top_k=5),
    )
    assert res["decision"] == "quarantine"
    assert res["is_contradiction"] is True
    assert len(res["evidence"]) == 2


def test_tiny_chunk_skipped():
    assert scan_chunk_for_contradiction("tiny")["is_contradiction"] is False




def test_quarantined_neighbor_is_ignored(monkeypatch):
    neighbors = stub_query(
        ["Passwords must be rotated every 90 days for all staff."],
        statuses=["Quarantined"],
    )(top_k=5)
    result = scan_with_sources(
        monkeypatch,
        "Passwords are no longer required for every employee workstation.",
        neighbors,
    )
    assert result["decision"] == "clear"
    assert result["evidence"] == []


def test_integrity_failed_neighbor_is_ignored(monkeypatch):
    neighbors = stub_query(
        ["Passwords must be rotated every 90 days for all staff."],
    )(top_k=5)
    document_id = neighbors[0]["metadata"]["document_id"]
    result = scan_with_sources(
        monkeypatch,
        "Passwords are no longer required for every employee workstation.",
        neighbors,
        verified={document_id: {"document_id": document_id, "trust_status": "Quarantined", "integrity_ok": False}},
    )
    assert result["decision"] == "clear"
    assert result["evidence"] == []


def test_candidate_document_is_excluded(monkeypatch):
    neighbors = stub_query(
        ["Passwords must be rotated every 90 days for all staff."],
        document_ids=["DOC-CANDIDATE"],
    )(top_k=5)
    result = scan_with_sources(
        monkeypatch,
        "Passwords are no longer required for every employee workstation.",
        neighbors,
        exclude_document_id="DOC-CANDIDATE",
    )
    assert result["decision"] == "clear"
    assert result["evidence"] == []


def test_duplicate_chunks_count_as_one_source(monkeypatch):
    neighbors = stub_query(
        ["Passwords must be rotated every 90 days for all staff.",
         "Every employee must change passwords every 90 days for security."],
        document_ids=["DOC-T1", "DOC-T1"],
    )(top_k=5)
    result = scan_with_sources(
        monkeypatch,
        "Passwords are no longer required for every employee workstation.",
        neighbors,
    )
    assert result["decision"] == "suspicious"
    assert len(result["evidence"]) == 1


def test_two_trusted_sources_can_quarantine_contradiction(monkeypatch):
    neighbors = stub_query(
        ["Passwords must be rotated every 90 days for all staff.",
         "Every employee must change passwords every 90 days for security."],
    )(top_k=5)
    result = scan_with_sources(
        monkeypatch,
        "Passwords are no longer required for every employee workstation.",
        neighbors,
    )
    assert result["decision"] == "quarantine"
    assert {item["document_id"] for item in result["evidence"]} == {"DOC-T0", "DOC-T1"}


def test_one_trusted_source_only_marks_suspicious(monkeypatch):
    neighbors = stub_query(["Passwords must be rotated every 90 days for all staff."])(top_k=5)
    result = scan_with_sources(
        monkeypatch,
        "Passwords are no longer required for every employee workstation.",
        neighbors,
    )
    assert result["decision"] == "suspicious"


def test_suspicious_only_sources_never_quarantine(monkeypatch):
    neighbors = stub_query(
        ["Passwords must be rotated every 90 days for all staff.",
         "Every employee must change passwords every 90 days for security."],
        statuses=["Suspicious", "Suspicious"],
    )(top_k=5)
    result = scan_with_sources(
        monkeypatch,
        "Passwords are no longer required for every employee workstation.",
        neighbors,
    )
    assert result["decision"] == "suspicious"


def test_cold_start_returns_clear_complete(monkeypatch):
    monkeypatch.setattr(contradiction_detector, "verified_documents", lambda _ids: {}, raising=False)
    result = scan_for_consensus_contradiction(
        "Passwords are no longer required for every employee workstation.",
        embed_fn=embed,
        query_fn=lambda query_embedding=None, top_k=5: [],
    )
    assert result["decision"] == "clear"
    assert result["complete"] is True


def test_neighbor_lookup_failure_returns_unavailable(monkeypatch):
    monkeypatch.setattr(contradiction_detector, "verified_documents", lambda _ids: {}, raising=False)
    def fail_query(query_embedding=None, top_k=5):
        raise RuntimeError("vector store unavailable")
    result = scan_for_consensus_contradiction(
        "Passwords are no longer required for every employee workstation.",
        embed_fn=embed,
        query_fn=fail_query,
    )
    assert result["decision"] == "unavailable"
    assert result["complete"] is False


def test_modified_neighbor_chunk_is_ignored(monkeypatch):
    neighbor = {
        "chunk_id": "c1",
        "text": "Passwords must be rotated every 90 days for all staff.",
        "score": 0.1,
        "metadata": {
            "document_id": "DOC-T1",
            "trust_status": "Trusted",
            "sha256": "sha-file",
            "text_sha256": "stale-chunk-digest",
        },
    }
    result = scan_with_sources(
        monkeypatch,
        "Passwords are no longer required for every employee workstation.",
        [neighbor],
        verified={"DOC-T1": {
            "document_id": "DOC-T1", "trust_status": "Trusted",
            "integrity_ok": True, "sha256": "sha-file",
        }},
    )
    assert result["decision"] == "clear"
    assert result["evidence"] == []


def test_chunk_scan_passes_self_exclusion_to_consensus(monkeypatch):
    import backend.security.contradiction_detector as detector
    captured = {}

    def capture(text, **kwargs):
        captured.update(kwargs)
        return {"decision": "clear", "complete": True}

    monkeypatch.setattr(detector, "scan_for_consensus_contradiction", capture)
    detector.scan_chunk_for_contradiction("A long enough source claim with sufficient text.", exclude_document_id="DOC-SELF")
    assert captured["exclude_document_id"] == "DOC-SELF"
