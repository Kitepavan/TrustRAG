"""
TrustRAG API — Evaluation Router
Exposes security evaluation benchmark endpoints for academic verification.
"""

from fastapi import APIRouter
from backend.security.evaluation import SecurityEvaluator

router = APIRouter(prefix="/evaluation", tags=["evaluation"])


@router.get("/run")
@router.post("/run")
async def run_evaluation():
    """Run full security benchmark evaluation suite (Baseline RAG vs TrustRAG)."""
    return SecurityEvaluator.run_benchmark_suite()
