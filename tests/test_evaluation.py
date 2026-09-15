"""
TrustRAG — Stage 12 Evaluation Unit Tests
"""

import pytest
from backend.security.evaluation import SecurityEvaluator


def test_security_benchmark_suite():
    res = SecurityEvaluator.run_benchmark_suite()
    assert "summary" in res
    assert "scenarios" in res

    summary = res["summary"]
    assert summary["baseline_protection_rate"] == 0.0
    assert summary["trustrag_protection_rate"] == 100.0
    assert summary["total_scenarios"] == 4
    assert len(res["scenarios"]) == 4

    for sc in res["scenarios"]:
        assert sc["baseline_passed"] is False
        assert sc["trustrag_passed"] is True
