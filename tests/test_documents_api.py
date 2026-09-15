"""
TrustRAG — Documents API Security Integration Tests
"""

import io
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
