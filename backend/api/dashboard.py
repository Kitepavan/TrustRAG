import os

from fastapi import APIRouter, Depends
from backend.security.auth import get_current_user_required

from backend.rag.vectorstore import get_collection_count
from backend.api.documents import get_metadata_store
from backend.rag.llm import LLM_MODEL

router = APIRouter(tags=["dashboard"], dependencies=[Depends(get_current_user_required)])


@router.get("/dashboard/stats")
def get_dashboard_stats():
    """Return real-time dashboard statistics."""
    metadata = get_metadata_store()
    doc_count = len(metadata)

    try:
        chunk_count = get_collection_count()
        vector_db_status = "online"
        rag_status = "operational"
    except Exception:
        chunk_count = 0
        vector_db_status = "error"
        rag_status = "degraded"

    return {
        "documents_indexed": doc_count,
        "chunks_stored": chunk_count,
        "vector_db_status": vector_db_status,
        "embedding_model": "EmbeddingGemma-300M",
        "llm_provider": "OpenRouter",
        "llm_model": LLM_MODEL,
        "llm_status": "configured" if os.environ.get("OPENROUTER_API_KEY", "").strip() else "not_configured",
        "rag_status": rag_status,
    }


@router.get("/status")
def get_system_status():
    """Return component health status for the system status page."""
    # Test each component
    components = {
        "backend": {"status": "online", "version": "0.1.0", "detail": "FastAPI"},
        "embedding_model": {"status": "not_checked", "name": "EmbeddingGemma-300M", "dimensions": 768},
        "vector_db": {"status": "connected", "engine": "ChromaDB", "metric": "cosine"},
        "llm": {"status": "configured" if os.environ.get("OPENROUTER_API_KEY", "").strip() else "not_configured", "provider": "OpenRouter", "model": LLM_MODEL},
        "rag_pipeline": {"status": "not_checked", "detail": "Secure RAG; end-to-end readiness not probed"},
    }

    # Verify ChromaDB is actually reachable
    try:
        count = get_collection_count()
        components["vector_db"]["chunk_count"] = count
    except Exception:
        components["vector_db"]["status"] = "error"
        components["vector_db"]["detail"] = "Cannot connect to ChromaDB"
        components["rag_pipeline"]["status"] = "degraded"

    return components
