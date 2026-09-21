"""Authoritative document metadata and at-rest integrity checks.

The local metadata, public key and provenance stores are trusted deployment state;
these checks do not defend against an administrator rewriting all of them.
"""

from contextlib import contextmanager
import fcntl
import json
import os
from pathlib import Path
import tempfile

from backend.security.hashing import compute_sha256_file
from backend.security.signature import verify_signature

UPLOAD_DIR = Path("data/trusted")
METADATA_FILE = UPLOAD_DIR / "_metadata.json"


@contextmanager
def store_lock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(str(path) + ".lock", "a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"Invalid object store: {path.name}")
    return value


def save_json(path: Path, value: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    name = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as handle:
            name = handle.name
            json.dump(value, handle, indent=2)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(name, path)
    finally:
        if name and os.path.exists(name):
            os.unlink(name)


def get_metadata_store() -> dict:
    return load_json(METADATA_FILE)


def save_metadata_store(store: dict):
    save_json(METADATA_FILE, store)


def check_integrity(meta: dict) -> dict:
    info = dict(meta, integrity_ok=False, size_bytes=0)
    name = meta.get("stored_filename")
    path = UPLOAD_DIR / name if isinstance(name, str) and Path(name).name == name else None
    try:
        if path and not path.is_symlink() and path.is_file() and meta.get("sha256"):
            info["size_bytes"] = path.stat().st_size
            info["integrity_ok"] = compute_sha256_file(str(path)) == meta["sha256"]
            if info["integrity_ok"] and meta.get("is_signed"):
                info["integrity_ok"] = verify_signature(path.read_bytes(), meta.get("signature_b64", ""))
    except (OSError, ValueError):
        info["integrity_ok"] = False
    if not info["integrity_ok"]:
        info["trust_status"] = "Quarantined"
        info["integrity_note"] = "Missing verification evidence or file integrity/signature check failed; quarantined."
    return info


def _propagate_quarantine(document_id: str, info: dict):
    if info.get("trust_status") != "Quarantined":
        return
    # Metadata is authoritative even if a secondary-store update fails.
    from backend.rag.vectorstore import quarantine_document
    from backend.security.provenance import provenance_tracker
    quarantine_document(document_id)
    record = provenance_tracker.get_provenance(document_id)
    if record and record.trust_status != "Quarantined":
        record.trust_status = "Quarantined"
        record.notes = info.get("integrity_note", "Quarantined by policy")
        provenance_tracker.record_provenance(record)


def verified_documents(document_ids: list[str]) -> dict[str, dict | None]:
    """Verify multiple documents in one locked read of the metadata store.

    File hashes and signatures are checked anew on every call. The snapshot is
    request-local; holding the metadata lock across the batch prevents lost updates.
    """
    if not document_ids:
        return {}
    results: dict[str, dict | None] = {}
    with store_lock(METADATA_FILE):
        store = get_metadata_store()
        changed = False
        for document_id in dict.fromkeys(document_ids):
            meta = store.get(document_id)
            if not meta:
                results[document_id] = None
                continue
            info = check_integrity(meta)
            if not info["integrity_ok"] and meta != info:
                store[document_id] = info
                changed = True
            results[document_id] = info
        if changed:
            save_metadata_store(store)
    for document_id, info in results.items():
        _propagate_quarantine(document_id, info or {})
    return results


def verified_document(document_id: str) -> dict | None:
    return verified_documents([document_id]).get(document_id)
