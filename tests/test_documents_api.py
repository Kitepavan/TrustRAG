"""
TrustRAG — Documents API Security Integration Tests
"""

import io
from pathlib import Path
from fastapi import UploadFile
from fastapi.testclient import TestClient

from backend.main import app
from backend.security.auth import create_jwt_token
from backend.security.signature import ensure_enterprise_keys, sign_data

client = TestClient(app)


def _auth(username: str = "admin") -> dict:
    """Bearer header for one of the demo personas."""
    return {"Authorization": f"Bearer {create_jwt_token({'username': username})}"}


def test_upload_and_list_documents_security():
    priv, pub = ensure_enterprise_keys()
    doc_bytes = b"TrustRAG Document Security Test API Content"
    signature_b64 = sign_data(doc_bytes, priv)

    # 0. Anonymous upload is rejected before anything is written to the store.
    anon_res = client.post(
        "/documents/upload",
        files={"file": ("api_test_doc.txt", io.BytesIO(doc_bytes), "text/plain")},
        data={"access_level": "INTERNAL", "signature_b64": signature_b64},
    )
    assert anon_res.status_code == 401

    # 1. Upload valid signed file as an authenticated admin
    file_obj = io.BytesIO(doc_bytes)
    response = client.post(
        "/documents/upload",
        files={"file": ("api_test_doc.txt", file_obj, "text/plain")},
        data={"access_level": "INTERNAL", "signature_b64": signature_b64},
        headers=_auth("admin"),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "api_test_doc.txt"
    assert data["is_signed"] is True
    assert data["signature_valid"] is True
    assert data["trust_status"] == "Trusted"
    assert data["access_level"] == "INTERNAL"
    # uploaded_by is bound to the authenticated principal, never a client form field.
    assert data["uploaded_by"] == "admin"
    assert "sha256" in data

    # 2. List documents (authenticated)
    list_res = client.get("/documents/", headers=_auth("admin"))
    assert list_res.status_code == 200
    docs = list_res.json()["documents"]
    found = [d for d in docs if d["document_id"] == data["document_id"]]
    assert len(found) == 1
    assert found[0]["trust_status"] == "Trusted"
    assert found[0]["signature_valid"] is True
    assert found[0]["integrity_ok"] is True

    # 3. Document metadata is not reachable anonymously.
    assert client.get("/documents/").status_code == 401


def test_upload_stages_file_on_destination_filesystem(monkeypatch, tmp_path):
    import backend.api.documents as documents
    import backend.security.audit as audit

    monkeypatch.setattr(audit, "AUDIT_DB", tmp_path / "audit.sqlite3")
    monkeypatch.setattr(
        documents,
        "ingest_document",
        lambda **kwargs: {
            "status": "processed",
            "document_id": "DOC-STAGING-TEST",
            "filename": kwargs["filename"],
            "sha256": "a" * 64,
            "is_signed": False,
            "signature_valid": False,
            "trust_status": "Suspicious",
            "access_level": kwargs["access_level"],
            "uploaded_by": kwargs["uploaded_by"],
            "uploaded_at": "2026-10-15T00:00:00+00:00",
            "total_pages": 1,
            "total_chars": 20,
            "chunks": [{"chunk_id": "chunk-staging-test", "text": "Upload staging test."}],
        },
    )
    monkeypatch.setattr(documents, "embed_chunks", lambda chunks: chunks)
    monkeypatch.setattr(documents, "add_chunks", lambda chunks: len(chunks))
    original_temp_file = documents.tempfile.NamedTemporaryFile
    staged_paths = []

    def track_staged_file(*args, **kwargs):
        staged_file = original_temp_file(*args, **kwargs)
        staged_paths.append(Path(staged_file.name))
        return staged_file

    monkeypatch.setattr(documents.tempfile, "NamedTemporaryFile", track_staged_file)
    response = documents.upload_document(
        file=UploadFile(filename="cross_device.txt", file=io.BytesIO(b"Upload staging test.")),
        access_level="INTERNAL",
        signature_b64=None,
        user={"username": "admin", "clearance_tags": ["INTERNAL"]},
    )

    assert response["filename"] == "cross_device.txt"
    assert staged_paths[0].parent == documents.UPLOAD_DIR


def test_delete_document_removes_file_metadata_provenance_and_chunks():
    import pytest
    import backend.api.documents as documents
    from backend.rag import vectorstore
    from backend.security.provenance import ProvenanceRecord, provenance_tracker

    document_id = "DOC-DELETE-TEST"
    stored_name = f"{document_id}.txt"
    (documents.UPLOAD_DIR / stored_name).write_text("delete me", encoding="utf-8")
    metadata = {
        document_id: {
            "document_id": document_id,
            "filename": "delete-me.txt",
            "stored_filename": stored_name,
            "access_level": "INTERNAL",
            "trust_status": "Trusted",
        }
    }
    documents.save_metadata_store(metadata)
    provenance_tracker.record_provenance(ProvenanceRecord(
        document_id=document_id, filename="delete-me.txt", sha256_hash="a" * 64,
        signature_valid=True,
    ))
    vectorstore.add_chunks([{
        "chunk_id": "delete-chunk", "text": "delete me", "embedding": [0.1, 0.2],
        "document_id": document_id,
    }])

    response = documents.delete_document(document_id, user={
        "username": "admin", "role": "Admin",
        "clearance_tags": ["PUBLIC", "INTERNAL", "HR_CONFIDENTIAL", "IT_SEC_CONFIDENTIAL", "RESTRICTED"],
    })

    assert response == {"document_id": document_id, "deleted": True}
    assert not (documents.UPLOAD_DIR / stored_name).exists()
    assert document_id not in documents.get_metadata_store()
    assert provenance_tracker.get_provenance(document_id) is None
    assert vectorstore.get_collection().get(where={"document_id": document_id})["ids"] == []


def test_delete_document_requires_privileged_role():
    import pytest
    import backend.api.documents as documents
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as error:
        documents.delete_document("DOC-DELETE-TEST", user={"username": "emp_user", "role": "Employee"})
    assert error.value.status_code == 403


def test_delete_document_requires_clearance_for_classification():
    import pytest
    import backend.api.documents as documents
    from fastapi import HTTPException

    document_id = "DOC-CLEARANCE-TEST"
    stored_name = f"{document_id}.txt"
    (documents.UPLOAD_DIR / stored_name).write_text("hr data", encoding="utf-8")
    documents.save_metadata_store({
        document_id: {
            "document_id": document_id,
            "filename": "hr.txt",
            "stored_filename": stored_name,
            "access_level": "HR_CONFIDENTIAL",
            "trust_status": "Trusted",
        }
    })

    it_security = {"username": "sec_admin", "role": "IT_Security",
                   "clearance_tags": ["PUBLIC", "INTERNAL", "IT_SEC_CONFIDENTIAL"]}
    with pytest.raises(HTTPException) as error:
        documents.delete_document(document_id, user=it_security)
    assert error.value.status_code == 403
    assert (documents.UPLOAD_DIR / stored_name).exists()
    assert document_id in documents.get_metadata_store()


def _seed_signed_document_for_promotion(document_id, trust_status):
    import backend.api.documents as documents
    from backend.security.hashing import compute_sha256_bytes

    private_key, _ = ensure_enterprise_keys()
    content = b"Verified document for admin trust promotion."
    signature = sign_data(content, private_key)
    stored_name = f"{document_id}.txt"
    (documents.UPLOAD_DIR / stored_name).write_bytes(content)
    documents.save_metadata_store({document_id: {
        "document_id": document_id,
        "filename": "verified.txt",
        "stored_filename": stored_name,
        "sha256": compute_sha256_bytes(content),
        "is_signed": True,
        "signature_b64": signature,
        "signature_valid": True,
        "trust_status": trust_status,
        "access_level": "INTERNAL",
    }})
    return content, signature


def test_admin_promotes_suspicious_document_to_trusted(monkeypatch, tmp_path):
    import backend.api.documents as documents
    from backend.rag import vectorstore
    from backend.security import audit
    from backend.security.provenance import ProvenanceRecord, provenance_tracker

    document_id = "DOC-PROMOTE-TEST"
    content, signature = _seed_signed_document_for_promotion(document_id, "Suspicious")
    from backend.security.hashing import compute_sha256_bytes
    digest = compute_sha256_bytes(content)
    provenance_tracker.record_provenance(ProvenanceRecord(
        document_id=document_id, filename="verified.txt", sha256_hash=digest,
        signature_valid=True, trust_status="Suspicious",
    ))
    vectorstore.add_chunks([{
        "chunk_id": "promote-test-chunk", "text": content.decode(), "embedding": [0.2, 0.8],
        "document_id": document_id, "sha256": digest, "signature_valid": True,
        "trust_status": "Suspicious", "access_level": "INTERNAL",
    }])
    monkeypatch.setattr(audit, "AUDIT_DB", tmp_path / "audit.sqlite3")

    result = documents.promote_suspicious_document(
        document_id,
        documents.TrustPromotionRequest(reason="Verified with the official source."),
        user={"username": "admin", "role": "Admin", "clearance_tags": ["PUBLIC", "INTERNAL"]},
    )

    assert result["trust_status"] == "Trusted"
    assert documents.get_metadata_store()[document_id]["trust_status"] == "Trusted"
    assert vectorstore.get_collection().get(where={"document_id": document_id})["metadatas"][0]["trust_status"] == "Trusted"
    assert provenance_tracker.get_provenance(document_id).trust_status == "Trusted"
    event = audit.list_events(event_type="ADMIN_TRUST_PROMOTION")["events"][0]
    assert event["details"]["document_id"] == document_id
    assert event["details"]["reason"] == "Verified with the official source."
    assert signature not in str(event["details"])


def test_admin_cannot_promote_quarantined_document(monkeypatch):
    import pytest
    import backend.api.documents as documents
    from fastapi import HTTPException

    document_id = "DOC-QUARANTINE-IMMUTABLE"
    _seed_signed_document_for_promotion(document_id, "Quarantined")

    with pytest.raises(HTTPException) as error:
        documents.promote_suspicious_document(
            document_id,
            documents.TrustPromotionRequest(reason="Reviewed by an administrator."),
            user={"username": "admin", "role": "Admin"},
        )

    assert error.value.status_code == 400
    assert documents.get_metadata_store()[document_id]["trust_status"] == "Quarantined"


def test_only_admin_can_promote_suspicious_document():
    import pytest
    import backend.api.documents as documents
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as error:
        documents.promote_suspicious_document(
            "DOC-NOT-REACHED",
            documents.TrustPromotionRequest(reason="Reviewed by an administrator."),
            user={"username": "emp_user", "role": "Employee"},
        )

    assert error.value.status_code == 403
