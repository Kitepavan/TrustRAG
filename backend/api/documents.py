import os
import json
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from backend.rag.ingestion import ingest_document
from backend.rag.embedding import embed_chunks
from backend.rag.vectorstore import add_chunks, get_collection_count

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = Path("data/trusted")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

METADATA_FILE = UPLOAD_DIR / "_metadata.json"


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

    tmp_path = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        shutil.copyfileobj(file.file, tmp_path)
        tmp_path.close()

        result = ingest_document(tmp_path.name, file.filename, uploaded_by)

        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["errors"])

        embedded = embed_chunks(result["chunks"])
        stored = add_chunks(embedded)

        dest = UPLOAD_DIR / file.filename
        os.replace(tmp_path.name, str(dest))

        # Store metadata for richer document listing
        metadata = get_metadata_store()
        metadata[result["document_id"]] = {
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
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path.name):
            os.unlink(tmp_path.name)


@router.get("/")
async def list_documents():
    """List all uploaded documents with metadata."""
    metadata = get_metadata_store()
    documents = []

    # Iterate files on disk
    for f in UPLOAD_DIR.iterdir():
        if f.is_file() and f.name != "_metadata.json":
            doc_info = {
                "filename": f.name,
                "size_bytes": f.stat().st_size,
            }
            # Merge stored metadata if available
            for doc_id, meta in metadata.items():
                if meta.get("filename") == f.name:
                    doc_info.update(meta)
                    break
            documents.append(doc_info)

    return {"documents": documents, "count": len(documents)}


@router.get("/{document_id}")
async def get_document(document_id: str):
    """Get metadata for a specific document."""
    metadata = get_metadata_store()
    if document_id not in metadata:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    return metadata[document_id]
