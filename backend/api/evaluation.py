"""
TrustRAG API — Evaluation Router
Exposes security evaluation benchmark endpoints for academic verification.
"""

from fastapi import APIRouter, Depends
from backend.security.auth import get_current_user_required
from backend.security.evaluation import SecurityEvaluator

router = APIRouter(prefix="/evaluation", tags=["evaluation"], dependencies=[Depends(get_current_user_required)])


@router.get("/run")
@router.post("/run")
def run_evaluation():
    """Run synthetic component security checks (not an end-to-end benchmark)."""
    return SecurityEvaluator.run_benchmark_suite()
