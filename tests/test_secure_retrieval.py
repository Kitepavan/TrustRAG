"""
TrustRAG — Stage 11 Secure Retrieval Unit Tests
"""

import pytest
from backend.rag.secure_retrieval import secure_retrieve_chunks, build_secure_context


def test_secure_retrieval_filtering():
    dummy_embedding = [0.01] * 768

    user_emp = {"username": "emp_user", "role": "Employee", "clearance_tags": ["PUBLIC", "INTERNAL"]}
    user_admin = {"username": "admin", "role": "Admin", "clearance_tags": ["PUBLIC", "INTERNAL", "HR_CONFIDENTIAL", "RESTRICTED"]}

    # Baseline mode returns raw candidates
    baseline_results = secure_retrieve_chunks(dummy_embedding, user=user_emp, top_k=3, mode="baseline")
    assert isinstance(baseline_results, list)

    # Secure mode filters out quarantined / unauthorized items
    secure_results = secure_retrieve_chunks(dummy_embedding, user=user_emp, top_k=3, mode="secure")
    assert isinstance(secure_results, list)
    for chunk in secure_results:
        meta = chunk.get("metadata", {})
        assert meta.get("trust_status") != "Quarantined"


def test_build_secure_context():
    chunks = [
        {
            "chunk_id": "chunk_1",
            "text": "Enterprise Firewall Policy: Port 443 must be open.",
            "metadata": {"document_id": "DOC-101", "trust_status": "Trusted"},
        }
    ]

    context = build_secure_context(chunks)
    assert "<trusted_context>" in context
    assert "[Source 1 | ID: DOC-101 | Security Status: Trusted]" in context
    assert "Enterprise Firewall Policy" in context
    assert "</trusted_context>" in context
