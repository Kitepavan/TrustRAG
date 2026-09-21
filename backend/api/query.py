import logging
from time import perf_counter
from uuid import uuid4

from fastapi.responses import JSONResponse
from backend.security.audit import record_event
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
    question: str = Field(min_length=1, max_length=8000)
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

    request_id = uuid4().hex
    started = perf_counter()
    pipeline_log = [{"stage": "authentication", "status": "passed", "message": f"Authenticated as {user['role']} in {req.mode} mode."}]

    def finish(event_type: str, severity: str = "info") -> dict:
        duration_ms = round((perf_counter() - started) * 1000, 2)
        persisted = record_event(user["username"], event_type, severity, request_id,
                                 mode=req.mode, duration_ms=duration_ms, pipeline_log=pipeline_log)
        return {"request_id": request_id, "pipeline_log": pipeline_log,
                "duration_ms": duration_ms, "audit_recorded": persisted}

    # Baseline mode bypasses every defense filter, so it is restricted to privileged
    # roles; it exists only as the unfiltered control for the Stage 12 comparison.
    if req.mode == "baseline" and not user_can_run_baseline(user):
        pipeline_log.append({"stage": "authorization", "status": "blocked", "message": "Baseline access denied."})
        finish("BASELINE_ACCESS_DENIED", "warning")
        raise HTTPException(
            status_code=403,
            detail="Baseline (unfiltered) mode requires Admin or IT_Security clearance.",
        )

    if req.mode == "baseline":
        record_event(user["username"], "BASELINE_MODE_USED", "warning", request_id)
    try:
        query_embedding = embed_query(req.question)
        pipeline_log.append({"stage": "embedding", "status": "passed", "message": "Query embedding generated."})
        results = secure_retrieve_chunks(
            query_embedding=query_embedding,
            user=user,
            top_k=req.top_k,
            mode=req.mode,
            pipeline_log=pipeline_log,
        )
    except Exception:
        logger.exception("Retrieval failed during query")
        pipeline_log.append({"stage": "retrieval", "status": "error", "message": "Retrieval service unavailable."})
        return JSONResponse(status_code=503, content={"detail": "Retrieval service unavailable.", **finish("QUERY_FAILED", "error")})

    if not results:
        pipeline_log.append({"stage": "generation", "status": "warning", "message": "No eligible context; LLM not called."})
        return {
            **finish("QUERY_NO_CONTEXT", "warning"),
            "answer": "No authorized, trusted documents were found matching your query.",
            "sources": [],
            "mode": req.mode,
            "user_role": user["role"],
        }

    try:
        answer = generate_answer(req.question, results)
    except Exception:
        logger.exception("LLM call failed during query")
        pipeline_log.append({"stage": "generation", "status": "error", "message": "Language model service unavailable."})
        return JSONResponse(status_code=502, content={
            "detail": "The language model service is currently unavailable. Please try again later.",
            **finish("QUERY_FAILED", "error"),
        })

    pipeline_log.append({"stage": "generation", "status": "info", "message": "Answer service returned a response; it may include a labelled fallback if the provider was unavailable."})
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
        **finish("QUERY_COMPLETED"),
        "answer": answer,
        "sources": sources,
        "mode": req.mode,
        "user_role": user["role"],
    }
