import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.rag.embedding import embed_query
from backend.rag.vectorstore import query_chunks
from backend.rag.llm import generate_answer

router = APIRouter(tags=["query"])

logger = logging.getLogger(__name__)


class QueryRequest(BaseModel):
    question: str
    top_k: int = 3


@router.post("/query")
def query_rag(req: QueryRequest):
    """Query the RAG pipeline: embed → search → LLM → answer."""
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    query_embedding = embed_query(req.question)
    results = query_chunks(query_embedding, top_k=req.top_k)

    if not results:
        return {"answer": "No relevant documents found.", "sources": []}

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
            "document_id": r["metadata"].get("document_id", ""),
            "page": r["metadata"].get("page_number", ""),
            "score": r["score"],
            "text_preview": r["text"][:200],
        }
        for r in results
    ]

    return {"answer": answer, "sources": sources}
