"""
TrustRAG — shared pytest configuration.

Ensures a JWT signing secret exists before any backend module is imported, so the
fail-closed behavior in auth.py does not break the suite in environments where .env
is not loaded. Tests create their own tokens, so any stable value is fine here.
"""

import os
import tempfile
from pathlib import Path

import pytest

os.environ["TRUSTRAG_DEMO_MODE"] = "true"
os.environ.setdefault("TRUSTRAG_JWT_SECRET", "trustrag-test-signing-secret")

# Import-time stores and relative runtime paths must never target the user's data.
_test_root = tempfile.TemporaryDirectory(prefix="trustrag-tests-")
_original_cwd = Path.cwd()
os.chdir(_test_root.name)


@pytest.fixture(autouse=True)
def isolated_stores(tmp_path, monkeypatch):
    from backend.security import document_store, signature, provenance
    from backend.api import documents
    from backend.rag import ingestion, vectorstore
    import chromadb

    upload_dir = tmp_path / "trusted"
    upload_dir.mkdir()
    monkeypatch.setattr(document_store, "UPLOAD_DIR", upload_dir)
    monkeypatch.setattr(document_store, "METADATA_FILE", upload_dir / "_metadata.json")
    monkeypatch.setattr(documents, "UPLOAD_DIR", upload_dir)
    monkeypatch.setattr(documents, "METADATA_FILE", upload_dir / "_metadata.json")
    monkeypatch.setattr(signature, "DEFAULT_PRIVATE_KEY_PATH", tmp_path / "keys" / "private.pem")
    monkeypatch.setattr(signature, "DEFAULT_PUBLIC_KEY_PATH", tmp_path / "keys" / "public.pem")
    tracker = provenance.ProvenanceTracker(tmp_path / "provenance.json")
    monkeypatch.setattr(provenance, "provenance_tracker", tracker)
    monkeypatch.setattr(ingestion, "provenance_tracker", tracker)
    client = chromadb.EphemeralClient()
    collection = client.create_collection("test-" + tmp_path.name.replace("_", "-"))
    monkeypatch.setattr(vectorstore, "_collection", collection)
    yield
    client.delete_collection(collection.name)


def pytest_sessionfinish(session, exitstatus):
    os.chdir(_original_cwd)
    _test_root.cleanup()
