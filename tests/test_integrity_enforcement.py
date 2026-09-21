"""Regression checks for authoritative document security state."""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.security.auth import create_jwt_token
from backend.security import document_store, signature
from backend.security.trust_engine import TrustEngine
from backend.rag import vectorstore, secure_retrieval
from backend.security.hashing import compute_sha256_bytes


def auth(name="admin"):
    return {"Authorization": f"Bearer {create_jwt_token({'username': name})}"}


def seed():
    content = b"Company holiday schedule."
    path = document_store.UPLOAD_DIR / "DOC-TEST.txt"
    path.write_bytes(content)
    record = {"document_id": "DOC-TEST", "filename": "policy.txt", "stored_filename": path.name,
              "sha256": compute_sha256_bytes(content), "is_signed": False,
              "trust_status": "Suspicious", "access_level": "INTERNAL"}
    document_store.save_metadata_store({"DOC-TEST": record})
    vectorstore.add_chunks([{"chunk_id": "c1", "document_id": "DOC-TEST", "text": content.decode(),
                            "embedding": [1.0, 0.0], **{k: record[k] for k in ("sha256", "trust_status", "access_level")}}])
    return path


@pytest.mark.parametrize("change", ["tamper", "missing", "missing_hash", "missing_filename"])
def test_retrieval_blocks_integrity_failure_without_listing(change):
    path = seed()
    user = {"role": "Employee", "clearance_tags": ["INTERNAL"]}
    assert len(secure_retrieval.secure_retrieve_chunks([1.0, 0.0], user)) == 1
    if change == "tamper":
        path.write_text("Modified company schedule.")
    elif change == "missing":
        path.unlink()
    else:
        store = document_store.get_metadata_store()
        store["DOC-TEST"].pop("sha256" if change == "missing_hash" else "stored_filename")
        document_store.save_metadata_store(store)
    assert secure_retrieval.secure_retrieve_chunks([1.0, 0.0], user) == []
    assert document_store.get_metadata_store()["DOC-TEST"]["trust_status"] == "Quarantined"
    assert vectorstore.get_collection().get()["metadatas"][0]["trust_status"] == "Quarantined"


def test_batch_verification_reads_store_once_per_retrieval(monkeypatch):
    path = seed()
    store = document_store.get_metadata_store()
    for index in range(3):
        doc_id = f"DOC-BATCH-{index}"
        other = path.with_name(doc_id + ".txt")
        other.write_bytes(path.read_bytes())
        record = dict(store["DOC-TEST"], document_id=doc_id, stored_filename=other.name)
        store[doc_id] = record
        vectorstore.add_chunks([{"chunk_id": doc_id, "document_id": doc_id,
                                "text": other.read_text(), "embedding": [1.0, 0.0],
                                **{k: record[k] for k in ("sha256", "trust_status", "access_level")}}])
    document_store.save_metadata_store(store)
    user = {"role": "Employee", "clearance_tags": ["INTERNAL"]}
    reads = 0
    original = document_store.get_metadata_store

    def counting():
        nonlocal reads
        reads += 1
        return original()

    monkeypatch.setattr(document_store, "get_metadata_store", counting)
    assert len(secure_retrieval.secure_retrieve_chunks([1.0, 0.0], user)) == 4
    assert reads == 1, "one authoritative store read per retrieval, not per candidate document"
    path.write_text("Changed after the first request.")
    assert len(secure_retrieval.secure_retrieve_chunks([1.0, 0.0], user)) == 3
    assert reads == 2, "each request must read current authoritative state"
    assert original()["DOC-TEST"]["trust_status"] == "Quarantined"

    from backend.api import documents
    monkeypatch.setattr(documents, "get_metadata_store", counting)
    reads = 0
    inventory = documents.list_documents(user)
    assert inventory["count"] == 4
    assert reads == 2, "one authorization snapshot and one verification snapshot per listing"


def test_metadata_clearance_and_upload_clearance():
    seed()
    store = document_store.get_metadata_store()
    store["DOC-TEST"]["access_level"] = "HR_CONFIDENTIAL"
    document_store.save_metadata_store(store)
    with TestClient(app) as client:
        assert client.get("/documents/", headers=auth("emp_user")).json()["documents"] == []
        assert client.get("/documents/DOC-TEST", headers=auth("emp_user")).status_code == 404
        assert client.get("/documents/DOC-TEST", headers=auth("hr_user")).status_code == 200
        assert client.post("/documents/upload", headers=auth("emp_user"), files={"file": ("x.txt", b"clean")}, data={"access_level": "RESTRICTED"}).status_code == 403


def test_signed_poison_is_blocked():
    result = TrustEngine.evaluate_document_trust(b"test", "Passwords are no longer required and MFA is disabled.", True, True)
    assert result["trust_category"] == "Quarantined"
    assert result["policy_decision"] == "BLOCK"


def test_verification_needs_only_public_key():
    private, public = signature.generate_ed25519_keypair()
    signature.save_public_key_pem(public, signature.DEFAULT_PUBLIC_KEY_PATH)
    assert signature.verify_signature(b"test", signature.sign_data(b"test", private))
    assert not signature.DEFAULT_PRIVATE_KEY_PATH.exists()
    with pytest.raises(ValueError):
        signature.ensure_enterprise_keys()


def test_legacy_chunks_and_modified_text_fail_closed():
    seed()
    collection = vectorstore.get_collection()
    collection.update(ids=["c1"], documents=["Different clean content."], embeddings=[[1.0, 0.0]])
    assert secure_retrieval.secure_retrieve_chunks([1.0, 0.0], {"clearance_tags": ["INTERNAL"]}) == []
    assert secure_retrieval.apply_security_filters([{"text": "clean", "metadata": {}}], {"clearance_tags": ["INTERNAL"]}) == []


def test_employee_upload_and_secure_query(monkeypatch):
    def embed(chunks):
        return [dict(chunk, embedding=[1.0, 0.0]) for chunk in chunks]
    monkeypatch.setattr("backend.api.documents.embed_chunks", embed)
    monkeypatch.setattr("backend.api.query.embed_query", lambda question: [1.0, 0.0])
    monkeypatch.setattr("backend.api.query.generate_answer", lambda question, chunks: chunks[0]["text"])
    with TestClient(app) as client:
        upload = client.post("/documents/upload", headers=auth("emp_user"),
                             files={"file": ("employee.txt", b"Company holidays are in December.")})
        assert upload.status_code == 200
        response = client.post("/query", headers=auth("emp_user"),
                               json={"question": "When are company holidays?", "mode": "secure"})
        assert response.status_code == 200
        assert response.json()["sources"][0]["document_id"] == upload.json()["document_id"]
        assert "December" in response.json()["answer"]


def test_restricted_document_role_matrix(monkeypatch):
    """End-to-end: real /auth/login per persona, RESTRICTED upload, 403 vs 200,
    then retrieval/listing authorization for the uploaded document."""
    def embed(chunks):
        return [dict(chunk, embedding=[1.0, 0.0]) for chunk in chunks]
    monkeypatch.setattr("backend.api.documents.embed_chunks", embed)
    monkeypatch.setattr("backend.api.query.embed_query", lambda question: [1.0, 0.0])
    monkeypatch.setattr("backend.api.query.generate_answer", lambda question, chunks: chunks[0]["text"])
    with TestClient(app) as client:
        tokens = {}
        for username, password in [("emp_user", "emp123"), ("hr_user", "hr123"),
                                   ("sec_admin", "sec123"), ("admin", "admin123")]:
            res = client.post("/auth/login", json={"username": username, "password": password})
            assert res.status_code == 200, f"login failed for {username}"
            tokens[username] = res.json()["access_token"]

        def headers(name):
            return {"Authorization": f"Bearer {tokens[name]}"}

        # Only Admin may classify at RESTRICTED; every other persona is refused.
        for name, expected in [("emp_user", 403), ("hr_user", 403), ("sec_admin", 403), ("admin", 200)]:
            res = client.post("/documents/upload", headers=headers(name),
                              files={"file": ("restricted.txt", b"Restricted roster data.")},
                              data={"access_level": "RESTRICTED"})
            assert res.status_code == expected, f"{name} upload expected {expected}"
        doc_id = client.get("/documents/", headers=headers("admin")).json()["documents"][0]["document_id"]

        # The restricted document is invisible to employees in listing and retrieval,
        # and secure retrieval still returns it for the authorized admin.
        listing = client.get("/documents/", headers=headers("emp_user")).json()["documents"]
        assert all(d["document_id"] != doc_id for d in listing)
        assert client.get(f"/documents/{doc_id}", headers=headers("emp_user")).status_code == 404

        emp_query = client.post("/query", headers=headers("emp_user"),
                                json={"question": "roster", "mode": "secure"})
        assert emp_query.status_code == 200
        assert all(src["document_id"] != doc_id for src in emp_query.json()["sources"])

        admin_query = client.post("/query", headers=headers("admin"),
                                  json={"question": "roster", "mode": "secure"})
        assert admin_query.status_code == 200
        assert any(src["document_id"] == doc_id for src in admin_query.json()["sources"])


def test_corrupt_metadata_fails_closed():
    document_store.METADATA_FILE.write_text("not json")
    with pytest.raises(ValueError):
        document_store.get_metadata_store()
