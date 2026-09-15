import logging
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from backend.rag.embedding import embed_query
from backend.rag.secure_retrieval import secure_retrieve_chunks
from backend.rag.llm import generate_answer
from backend.security.auth import get_current_user_required, user_can_run_baseline

router = APIRouter(tags=["query"])

logger = logging.getLogger(__name__)


class QueryRequest(BaseModel):
    question: str
    top_k: int = Field(3, ge=1, le=50)  # bounded: unbounded top_k inflates fetch_k*3 and DB load
    mode: str = "secure"  # "secure" (TrustRAG) or "baseline" (Unfiltered RAG)


@router.post("/query")
def query_rag(
    req: QueryRequest,
    user: Dict[str, Any] = Depends(get_current_user_required),
):
    """Query the RAG pipeline with security filtering and RBAC (or baseline mode)."""
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if req.mode not in ("secure", "baseline"):
        raise HTTPException(status_code=400, detail=f"Invalid mode: {req.mode}. Use 'secure' or 'baseline'.")

    # Baseline mode bypasses every defense filter, so it is restricted to privileged
    # roles; it exists only as the unfiltered control for the Stage 12 comparison.
    if req.mode == "baseline" and not user_can_run_baseline(user):
        raise HTTPException(
            status_code=403,
            detail="Baseline (unfiltered) mode requires Admin or IT_Security clearance.",
        )

    query_embedding = embed_query(req.question)
    results = secure_retrieve_chunks(
        query_embedding=query_embedding,
        user=user,
        top_k=req.top_k,
        mode=req.mode,
    )

    if not results:
        return {
            "answer": "No authorized, trusted documents were found matching your query.",
            "sources": [],
            "mode": req.mode,
            "user_role": user["role"],
        }

    try:
        answer = generate_answer(req.question, results)
    except Exception as e:
        logger.exception("LLM call failed during query")
        raise HTTPException(
            status_code=502,
            detail="The language model service is currently unavailable. Please try again later.",
        ) from e

    sources = [
        {
            "chunk_id": r["chunk_id"],
            "document_id": r.get("metadata", {}).get("document_id", ""),
            "page": r.get("metadata", {}).get("page_number", ""),
            "trust_status": r.get("metadata", {}).get("trust_status", "Suspicious"),
            "score": r.get("score", 0.0),
            "text_preview": r.get("text", "")[:200],
        }
        for r in results
    ]

    return {
        "answer": answer,
        "sources": sources,
        "mode": req.mode,
        "user_role": user["role"],
    }
