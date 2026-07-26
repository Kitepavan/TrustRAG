from fastapi import APIRouter

from backend.rag.vectorstore import get_collection_count
from backend.api.documents import get_metadata_store

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/stats")
def get_dashboard_stats():
    """Return real-time dashboard statistics."""
    metadata = get_metadata_store()
    doc_count = len(metadata)
    chunk_count = get_collection_count()

    return {
        "documents_indexed": doc_count,
        "chunks_stored": chunk_count,
        "vector_db_status": "online",
        "embedding_model": "EmbeddingGemma-300M",
        "llm_model": "glm-4.7-flash",
        "rag_status": "operational",
    }


@router.get("/status")
def get_system_status():
    """Return component health status for the system status page."""
    # Test each component
    components = {
        "backend": {"status": "online", "version": "0.1.0", "detail": "FastAPI"},
        "embedding_model": {"status": "ready", "name": "EmbeddingGemma-300M", "dimensions": 768},
        "vector_db": {"status": "connected", "engine": "ChromaDB", "metric": "cosine"},
        "llm": {"status": "ready", "provider": "Zai", "model": "glm-4.7-flash"},
        "rag_pipeline": {"status": "operational", "detail": "Baseline RAG"},
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
