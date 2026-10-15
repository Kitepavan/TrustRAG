"""
TrustRAG — Stage 12 Evaluation Unit Tests
"""

import pytest
from backend.security.evaluation import SecurityEvaluator


def test_security_benchmark_suite(monkeypatch):
    monkeypatch.setattr(
        "backend.security.evaluation.scan_for_prompt_injection",
        lambda _text: {"is_injection": True, "risk_score": 0.99, "scan_status": "complete"},
    )
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


def test_security_benchmark_reports_classifier_unavailable(monkeypatch):
    monkeypatch.setattr(
        "backend.security.evaluation.scan_for_prompt_injection",
        lambda _text: {"is_injection": True, "risk_score": 1.0, "scan_status": "unavailable"},
    )

    result = SecurityEvaluator.run_benchmark_suite()

    scenario = next(item for item in result["scenarios"] if item["scenario"] == "Indirect Prompt Injection")
    assert scenario["classifier_status"] == "unavailable"
    assert scenario["trustrag_result"] == "BLOCKED (Classifier unavailable)"
    # Fail-closed blocking still occurs, but an unavailable classifier is not a detection.
    assert scenario["trustrag_passed"] is False
    assert result["summary"]["prompt_injection_block_rate"] == 0.0
