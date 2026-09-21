"""
TrustRAG — Stage 7 Document Security & Integrity Unit Tests
"""

import tempfile
from pathlib import Path
import pytest

from backend.security.hashing import compute_sha256_bytes, compute_sha256_str
from backend.security.signature import (
    generate_ed25519_keypair,
    sign_data,
    verify_signature,
    ensure_enterprise_keys,
)
from backend.security.provenance import ProvenanceTracker, ProvenanceRecord
from backend.rag.ingestion import ingest_document


def test_sha256_hashing():
    text = "TrustRAG Enterprise Document Content"
    expected_hash = "68c17b5e43a9911e3b0eebf5f73edaa3856e4c73bf540a7b461869e5bd9c7e0f"  # illustrative sha256
    hash1 = compute_sha256_str(text)
    hash2 = compute_sha256_bytes(text.encode("utf-8"))
    assert hash1 == hash2
    assert len(hash1) == 64


def test_ed25519_signing_and_verification():
    data = b"CONFIDENTIAL IT SECURITY POLICY 2026"
    priv, pub = generate_ed25519_keypair()

    # Sign data
    signature = sign_data(data, priv)
    assert isinstance(signature, str)
    assert len(signature) > 0

    # Verify original data
    assert verify_signature(data, signature, pub) is True

    # Verify tampered data
    tampered_data = b"CONFIDENTIAL IT SECURITY POLICY 2026 - MODIFIED"
    assert verify_signature(tampered_data, signature, pub) is False

    # Verify bad signature string
    assert verify_signature(data, "invalid_base64_sig!!!", pub) is False


def test_provenance_tracking():
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "provenance_test.json"
        tracker = ProvenanceTracker(log_path=log_file)

        rec = ProvenanceRecord(
            document_id="DOC-TEST1234",
            filename="security_policy.pdf",
            sha256_hash="a" * 64,
            signature_valid=True,
            uploader="alice_admin",
            trust_status="Trusted",
        )
        tracker.record_provenance(rec)

        loaded = tracker.get_provenance("DOC-TEST1234")
        assert loaded is not None
        assert loaded.filename == "security_policy.pdf"
        assert loaded.signature_valid is True
        assert loaded.trust_status == "Trusted"
        assert loaded.uploader == "alice_admin"


@pytest.mark.parametrize("signed", [False, True])
def test_ingestion_reads_binary_content_only_for_signatures(tmp_path, monkeypatch, signed):
    import builtins
    from backend.rag import ingestion

    content = b"Enterprise guidelines: all servers must use MFA."
    path = tmp_path / "guidelines.txt"
    path.write_bytes(content)
    private_key, _ = ensure_enterprise_keys()
    signature = sign_data(content, private_key) if signed else None
    binary_reads = []

    def tracked_open(file, mode="r", *args, **kwargs):
        if mode == "rb":
            binary_reads.append(file)
        return builtins.open(file, mode, *args, **kwargs)

    monkeypatch.setattr(ingestion, "open", tracked_open, raising=False)
    result = ingestion.ingest_document(str(path), path.name, signature_b64=signature)

    assert len(binary_reads) == int(signed)
    assert result["sha256"] == compute_sha256_bytes(content)
    assert result["signature_valid"] is signed
    assert result["trust_status"] == ("Trusted" if signed else "Suspicious")
    assert result["chunks"]


def test_ingestion_security_flow():
    priv, pub = ensure_enterprise_keys()

    with tempfile.NamedTemporaryFile(suffix=".txt", mode="wb", delete=False) as f:
        content = b"TrustRAG Enterprise Guidelines\nAll servers must use MFA."
        f.write(content)
        tmp_path = f.name

    try:
        # Scenario A: Signed & Valid
        valid_sig = sign_data(content, priv)
        res_valid = ingest_document(
            file_path=tmp_path,
            filename="guidelines.txt",
            uploaded_by="sec_team",
            signature_b64=valid_sig,
        )
        assert res_valid["status"] == "processed"
        assert res_valid["is_signed"] is True
        assert res_valid["signature_valid"] is True
        assert res_valid["trust_status"] == "Trusted"

        # Scenario B: Tampered signature / signature mismatch
        bad_sig = sign_data(b"Different data", priv)
        res_tampered = ingest_document(
            file_path=tmp_path,
            filename="guidelines.txt",
            uploaded_by="attacker",
            signature_b64=bad_sig,
        )
        assert res_tampered["status"] == "processed"
        assert res_tampered["is_signed"] is True
        assert res_tampered["signature_valid"] is False
        assert res_tampered["trust_status"] == "Quarantined"

        # Scenario C: Unsigned
        res_unsigned = ingest_document(
            file_path=tmp_path,
            filename="guidelines.txt",
            uploaded_by="guest",
            signature_b64=None,
        )
        assert res_unsigned["status"] == "processed"
        assert res_unsigned["is_signed"] is False
        assert res_unsigned["signature_valid"] is False
        assert res_unsigned["trust_status"] == "Suspicious"

    finally:
        Path(tmp_path).unlink(missing_ok=True)
