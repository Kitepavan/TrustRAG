import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from backend.rag.ingestion import ingest_document, MAX_FILE_SIZE_MB, ALLOWED_ACCESS_LEVELS
from backend.rag.embedding import embed_chunks
from backend.rag.vectorstore import add_chunks
from backend.security.auth import get_current_user_required
from backend.security.audit import record_event

router = APIRouter(prefix="/documents", tags=["documents"])

logger = logging.getLogger(__name__)

from backend.security import document_store
from backend.security.document_store import get_metadata_store, save_metadata_store, verified_document, verified_documents
from backend.security.auth import check_rbac_permission

UPLOAD_DIR = document_store.UPLOAD_DIR
METADATA_FILE = document_store.METADATA_FILE


def _doc_info_with_integrity(meta: dict) -> dict:
    """Verify and persist quarantine state before returning document metadata."""
    return verified_document(meta["document_id"]) or {}


@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    access_level: str = Form("INTERNAL"),
    signature_b64: Optional[str] = Form(None),
    user: Dict[str, Any] = Depends(get_current_user_required),
):
    """Upload and ingest a document with security validation (PDF, DOCX, TXT)."""
    if not file.filename:
        record_event(user["username"], "UPLOAD_REJECTED", "warning", reason="missing_filename")
        raise HTTPException(status_code=400, detail="No filename provided")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in {".pdf", ".docx", ".txt"}:
        record_event(user["username"], "UPLOAD_REJECTED", "warning", reason="unsupported_type")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {suffix}. Allowed: .pdf, .docx, .txt",
        )

    access_level = (access_level or "INTERNAL").strip().upper()
    if access_level not in ALLOWED_ACCESS_LEVELS:
        record_event(user["username"], "UPLOAD_REJECTED", "warning", reason="invalid_classification")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid access_level: {access_level}. Allowed: {sorted(ALLOWED_ACCESS_LEVELS)}",
        )

    if not check_rbac_permission(user["clearance_tags"], access_level):
        record_event(user["username"], "UPLOAD_REJECTED", "warning", reason="classification_denied")
        raise HTTPException(status_code=403, detail="Classification exceeds your clearance")

    # Attribution always comes from the authenticated principal, never from a
    # client-supplied form field (provenance must not be spoofable).
    uploaded_by = user["username"]

    # Multipart parsing precedes this copy cap; deployment must also limit request bodies.
    max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
    result = None
    completed = False
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
            chunk["document_id"] = result["document_id"]
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

        with document_store.store_lock(document_store.METADATA_FILE):
            metadata = get_metadata_store()
            metadata[result["document_id"]] = {
                "document_id": result["document_id"],
                "filename": result["filename"],
                "stored_filename": stored_name,
                "sha256": result["sha256"],
                "is_signed": result["is_signed"],
                "signature_b64": signature_b64,
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

        completed = True
        record_event(uploaded_by,
                     "UPLOAD_QUARANTINED" if result["trust_status"] == "Quarantined" else "UPLOAD_COMPLETED",
                     "warning" if result["trust_status"] != "Trusted" else "info",
                     document_id=result["document_id"], trust_status=result["trust_status"],
                     access_level=result["access_level"], chunk_count=stored)
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
    except HTTPException as e:
        record_event(uploaded_by, "UPLOAD_REJECTED", "warning", status_code=e.status_code)
        raise
    except Exception as e:
        record_event(uploaded_by, "UPLOAD_FAILED", "error")
        logger.exception("Document upload failed")
        raise HTTPException(status_code=500, detail="Internal server error") from e
    finally:
        if not completed and result and result.get("document_id"):
            from backend.rag.vectorstore import delete_document
            try:
                delete_document(result["document_id"])
            except Exception:
                logger.exception("Failed upload left orphaned chunks; metadata verification blocks them")
            (UPLOAD_DIR / f"{result['document_id']}{suffix}").unlink(missing_ok=True)
        if os.path.exists(tmp_path.name):
            os.unlink(tmp_path.name)


@router.get("/")
def list_documents(user: Dict[str, Any] = Depends(get_current_user_required)):
    """List all uploaded documents with security metadata."""
    metadata = get_metadata_store()
    visible_ids = [doc_id for doc_id, meta in metadata.items()
                   if check_rbac_permission(user["clearance_tags"], meta.get("access_level"))]
    documents = [info for info in verified_documents(visible_ids).values()
                 if info and check_rbac_permission(user["clearance_tags"], info.get("access_level"))]

    documents.sort(key=lambda d: d.get("uploaded_at", ""), reverse=True)

    return {"documents": documents, "count": len(documents)}


@router.get("/{document_id}")
def get_document(
    document_id: str,
    user: Dict[str, Any] = Depends(get_current_user_required),
):
    """Get metadata for a specific document."""
    metadata = get_metadata_store()
    if document_id not in metadata or not check_rbac_permission(
        user["clearance_tags"], metadata[document_id].get("access_level")
    ):
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    return _doc_info_with_integrity(metadata[document_id])
