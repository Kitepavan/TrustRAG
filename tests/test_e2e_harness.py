"""Unit checks for the Stage 12 end-to-end harness helpers (no network involved)."""

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("evaluate_e2e", ROOT / "scripts" / "evaluate_e2e.py")
evaluate_e2e = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(evaluate_e2e)


def test_hit_keywords_is_case_insensitive_and_reports_matches():
    assert evaluate_e2e.hit_keywords("MFA is No Longer Required.", ["no longer required", "zzz"]) == ["no longer required"]
    assert evaluate_e2e.hit_keywords("", ["no longer required"]) == []


def test_build_summary_aggregates_latency_sources_and_canary():
    corpus_records = [
        {"id": "base", "category": "benign", "expected_trust": "Trusted",
         "actual_document_id": "DOC-BASE", "actual_trust_status": "Trusted", "expectation_met": True},
        {"id": "atk", "category": "poisoning_signed", "expected_trust": "Quarantined",
         "actual_document_id": "DOC-ATK", "actual_trust_status": "Suspicious", "expectation_met": False},
    ]
    question_records = [{
        "id": "q-x", "question": "?", "challenge_doc": "atk",
        "results": {
            "secure": {"status_code": 200, "duration_ms": 120.0, "answer": "safe answer",
                       "source_document_ids": [], "influence_keywords_matched": [], "no_context": True},
            "baseline": {"status_code": 200, "duration_ms": 100.0, "answer": f"leaked {evaluate_e2e.CANARY}",
                         "source_document_ids": ["DOC-ATK"], "influence_keywords_matched": [evaluate_e2e.CANARY],
                         "no_context": False},
        },
    }]
    summary = evaluate_e2e.build_summary(corpus_records, question_records)

    assert summary["ingestion"] == {
        "documents": 2, "expectation_met": 1,
        "records": [
            {"id": "base", "category": "benign", "expected_trust": "Trusted",
             "actual_trust_status": "Trusted", "expectation_met": True},
            {"id": "atk", "category": "poisoning_signed", "expected_trust": "Quarantined",
             "actual_trust_status": "Suspicious", "expectation_met": False},
        ],
    }
    entry = summary["attack_surface"][0]
    assert entry["challenge_document_id"] == "DOC-ATK"
    assert entry["secure"] == {"challenge_in_sources": False, "influence_keywords_matched": []}
    assert entry["baseline"] == {"challenge_in_sources": True, "influence_keywords_matched": [evaluate_e2e.CANARY]}
    assert summary["canary"]["leaked_in"] == ["baseline"]
    assert summary["latency_ms"]["secure"]["median"] == 120.0
    assert summary["latency_ms"]["baseline"]["median"] == 100.0
    assert summary["no_context_responses"] == {"secure": 1, "baseline": 0}
    assert summary["degraded_fallback_answers"] == {"secure": 0, "baseline": 0}
