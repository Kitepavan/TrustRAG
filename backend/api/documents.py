import json
import logging
import os
import shutil
import tempfile
import threading
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from backend.rag.ingestion import ingest_document
from backend.rag.embedding import embed_chunks
from backend.rag.vectorstore import add_chunks

router = APIRouter(prefix="/documents", tags=["documents"])

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("data/trusted")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

METADATA_FILE = UPLOAD_DIR / "_metadata.json"

_metadata_lock = threading.Lock()


def get_metadata_store() -> dict:
    """Load document metadata from JSON file."""
    if METADATA_FILE.exists():
        with open(METADATA_FILE, "r") as f:
            return json.load(f)
    return {}


def save_metadata_store(store: dict):
    """Save document metadata to JSON file."""
    with open(METADATA_FILE, "w") as f:
        json.dump(store, f, indent=2)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    uploaded_by: str = Form("unknown"),
):
    """Upload and ingest a document (PDF, DOCX, TXT)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in {".pdf", ".docx", ".txt"}:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {suffix}. Allowed: .pdf, .docx, .txt",
        )

    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum size: 50MB",
        )

    tmp_path = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        shutil.copyfileobj(file.file, tmp_path)
        tmp_path.close()

        result = ingest_document(tmp_path.name, file.filename, uploaded_by)

        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["errors"])

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
async def list_documents():
    """List all uploaded documents with metadata."""
    metadata = get_metadata_store()
    documents = []

    # Iterate metadata (source of truth) and stat the stored file for size
    for doc_id, meta in metadata.items():
        doc_info = dict(meta)
        stored_name = meta.get("stored_filename") or meta.get("filename", "")
        stored = UPLOAD_DIR / stored_name
        if stored.is_file():
            doc_info["size_bytes"] = stored.stat().st_size
        else:
            doc_info["size_bytes"] = 0
        documents.append(doc_info)

    documents.sort(key=lambda d: d.get("uploaded_at", ""), reverse=True)

    return {"documents": documents, "count": len(documents)}


@router.get("/{document_id}")
async def get_document(document_id: str):
    """Get metadata for a specific document."""
    metadata = get_metadata_store()
    if document_id not in metadata:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    return metadata[document_id]
