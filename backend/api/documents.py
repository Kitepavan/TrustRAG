import json
import logging
import os
import tempfile
import threading
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from backend.rag.ingestion import ingest_document, MAX_FILE_SIZE_MB, ALLOWED_ACCESS_LEVELS
from backend.rag.embedding import embed_chunks
from backend.rag.vectorstore import add_chunks
from backend.security.auth import get_current_user_required
from backend.security.hashing import compute_sha256_file

router = APIRouter(prefix="/documents", tags=["documents"])

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("data/trusted")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

METADATA_FILE = UPLOAD_DIR / "_metadata.json"

_metadata_lock = threading.Lock()


def get_metadata_store() -> dict:
    """Load document metadata from JSON file."""
    if METADATA_FILE.exists():
        try:
            with open(METADATA_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def save_metadata_store(store: dict):
    """Save document metadata to JSON file."""
    with open(METADATA_FILE, "w") as f:
        json.dump(store, f, indent=2)


def _doc_info_with_integrity(meta: dict) -> dict:
    """Build the response record for a document, re-verifying at-rest integrity.

    The recorded SHA-256 was computed at ingest time; if the stored file no longer
    matches it, the tamper-detection promise is honored by downgrading the response
    to Quarantined instead of trusting a stale label.
    """
    info = dict(meta)
    stored_name = meta.get("stored_filename")
    # Only ever resolve server-generated names (DOC-XXXXXXXX.ext); a client-supplied
    # filename is never trusted for the on-disk path.
    stored = UPLOAD_DIR / stored_name if stored_name and Path(stored_name).name == stored_name else None

    if stored and stored.is_file():
        info["size_bytes"] = stored.stat().st_size
        recorded_sha = meta.get("sha256")
        if recorded_sha:
            try:
                info["integrity_ok"] = compute_sha256_file(str(stored)) == recorded_sha
            except OSError:
                info["integrity_ok"] = False
            if not info.get("integrity_ok"):
                info["trust_status"] = "Quarantined"
                info["integrity_note"] = (
                    "At-rest file no longer matches the recorded SHA-256; quarantined."
                )
    else:
        info["size_bytes"] = 0
        info["integrity_ok"] = False

    return info


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    access_level: str = Form("INTERNAL"),
    signature_b64: Optional[str] = Form(None),
    user: Dict[str, Any] = Depends(get_current_user_required),
):
    """Upload and ingest a document with security validation (PDF, DOCX, TXT)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in {".pdf", ".docx", ".txt"}:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {suffix}. Allowed: .pdf, .docx, .txt",
        )

    access_level = (access_level or "INTERNAL").strip().upper()
    if access_level not in ALLOWED_ACCESS_LEVELS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid access_level: {access_level}. Allowed: {sorted(ALLOWED_ACCESS_LEVELS)}",
        )

    # Attribution always comes from the authenticated principal, never from a
    # client-supplied form field (provenance must not be spoofable).
    uploaded_by = user["username"]

    # Enforce the cap DURING streaming: file.size is the client's Content-Length,
    # which is absent or forgeable. Streaming with a running total closes the
    # disk-exhaustion vector the Content-Length check left open.
    max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
    tmp_path = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        total_written = 0
        while True:
            buf = file.file.read(1024 * 1024)
            if not buf:
                break
            total_written += len(buf)
            if total_written > max_bytes:
                tmp_path.close()
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size: {MAX_FILE_SIZE_MB}MB",
                )
            tmp_path.write(buf)
        tmp_path.close()

        result = ingest_document(
            file_path=tmp_path.name,
            filename=file.filename,
            uploaded_by=uploaded_by,
            signature_b64=signature_b64,
            access_level=access_level,
        )

        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["errors"])

        # Attach document security info to chunks before embedding & indexing
        for chunk in result["chunks"]:
            chunk["sha256"] = result["sha256"]
            chunk["signature_valid"] = result["signature_valid"]
            chunk["trust_status"] = result["trust_status"]
            chunk["access_level"] = result["access_level"]

        embedded = embed_chunks(result["chunks"])
        stored = add_chunks(embedded)

        # Server-side filename keyed by document_id: never trust the client
        # filename for the destination path (prevents path traversal).
        stored_name = f"{result['document_id']}{suffix}"
        dest = UPLOAD_DIR / stored_name
        os.replace(tmp_path.name, str(dest))

        with _metadata_lock:
            metadata = get_metadata_store()
            metadata[result["document_id"]] = {
                "document_id": result["document_id"],
                "filename": result["filename"],
                "stored_filename": stored_name,
                "sha256": result["sha256"],
                "is_signed": result["is_signed"],
                "signature_valid": result["signature_valid"],
                "trust_status": result["trust_status"],
                "access_level": result["access_level"],
                "uploaded_by": result["uploaded_by"],
                "uploaded_at": result["uploaded_at"],
                "total_pages": result["total_pages"],
                "total_chars": result["total_chars"],
                "total_chunks": stored,
                "status": result["status"],
            }
            save_metadata_store(metadata)

        return {
            "document_id": result["document_id"],
            "filename": result["filename"],
            "sha256": result["sha256"],
            "is_signed": result["is_signed"],
            "signature_valid": result["signature_valid"],
            "trust_status": result["trust_status"],
            "access_level": result["access_level"],
            "uploaded_by": result["uploaded_by"],
            "uploaded_at": result["uploaded_at"],
            "total_pages": result["total_pages"],
            "total_chars": result["total_chars"],
            "total_chunks": stored,
            "status": result["status"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Document upload failed")
        raise HTTPException(status_code=500, detail="Internal server error") from e
    finally:
        if os.path.exists(tmp_path.name):
            os.unlink(tmp_path.name)


@router.get("/")
async def list_documents(user: Dict[str, Any] = Depends(get_current_user_required)):
    """List all uploaded documents with security metadata."""
    metadata = get_metadata_store()
    documents = [_doc_info_with_integrity(meta) for meta in metadata.values()]

    documents.sort(key=lambda d: d.get("uploaded_at", ""), reverse=True)

    return {"documents": documents, "count": len(documents)}


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    user: Dict[str, Any] = Depends(get_current_user_required),
):
    """Get metadata for a specific document."""
    metadata = get_metadata_store()
    if document_id not in metadata:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    return _doc_info_with_integrity(metadata[document_id])
