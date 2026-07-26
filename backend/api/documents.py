import os
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
    """List all uploaded documents."""
    docs = []
    for f in UPLOAD_DIR.iterdir():
        if f.is_file():
            docs.append({"filename": f.name, "size_bytes": f.stat().st_size})
    return {"documents": docs, "count": len(docs)}
