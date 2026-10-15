"""Run a live OpenRouter threshold calibration and held-out report."""

import json
from pathlib import Path

from dotenv import load_dotenv

from backend.security.injection_detector import scan_for_prompt_injection


CORPUS_PATH = Path(__file__).parents[1] / "tests" / "fixtures" / "detection_corpus.json"


def _metrics(labels: list[bool], scores: list[float], threshold: float) -> dict[str, int | float]:
    predicted = [score >= threshold for score in scores]
    tp = sum(want and got for want, got in zip(labels, predicted))
    fp = sum(not want and got for want, got in zip(labels, predicted))
    tn = sum(not want and not got for want, got in zip(labels, predicted))
    fn = sum(want and not got for want, got in zip(labels, predicted))
    return {
        "cases": len(labels), "tp": tp, "fp": fp, "tn": tn, "fn": fn,
        "precision": tp / (tp + fp) if tp + fp else 0.0,
        "recall": tp / (tp + fn) if tp + fn else 0.0,
        "false_positive_rate": fp / (fp + tn) if fp + tn else 0.0,
        "false_negative_rate": fn / (fn + tp) if fn + tp else 0.0,
    }


def select_threshold(labels: list[bool], scores: list[float]) -> float:
    """Choose best development F1; ties use the lower threshold to favor recall."""
    if not labels or len(labels) != len(scores) or len(set(labels)) < 2:
        raise ValueError("development data must contain both labels and aligned scores")
    ordered_scores = sorted(set(scores))
    candidates = sorted({0.0, 1.0, *ordered_scores})
    candidates.extend((left + right) / 2 for left, right in zip(ordered_scores, ordered_scores[1:]))
    def ranking(threshold: float) -> tuple[float, float]:
        metrics = _metrics(labels, scores, threshold)
        precision, recall = metrics["precision"], metrics["recall"]
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        return f1, threshold

    return max(candidates, key=lambda threshold: (ranking(threshold)[0], -threshold))


def _score_cases(cases: list[dict]) -> tuple[list[bool], list[float]]:
    labels, scores = [], []
    for case in cases:
        result = scan_for_prompt_injection(case["text"])
        if result.get("scan_status") != "complete":
            raise RuntimeError(f"Classifier unavailable for labeled case {case['id']}; no metrics reported")
        labels.append(case["expected"])
        scores.append(result["risk_score"])
    return labels, scores


def _case_report(cases: list[dict], scores: list[float], threshold: float) -> list[dict]:
    return [
        {
            "id": case["id"],
            "expected_injection": case["expected"],
            "yes_probability": score,
            "detected": score >= threshold,
        }
        for case, score in zip(cases, scores)
    ]


def main() -> None:
    load_dotenv()
    corpus = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
    development = [case for case in corpus["development"] if case["class"] == "injection"]
    held_out = [case for case in corpus["held_out"] if case["class"] == "injection"]
    dev_labels, dev_scores = _score_cases(development)
    threshold = select_threshold(dev_labels, dev_scores)
    holdout_labels, holdout_scores = _score_cases(held_out)
    print(json.dumps({
        "model": "inception/mercury-decide:free",
        "threshold_selected_on": "development",
        "selected_threshold": threshold,
        "development": _metrics(dev_labels, dev_scores, threshold),
        "development_cases": _case_report(development, dev_scores, threshold),
        "held_out": _metrics(holdout_labels, holdout_scores, threshold),
        "held_out_cases": _case_report(held_out, holdout_scores, threshold),
        "next_step": "Confirm backend/security/injection_detector.py uses selected_threshold; do not tune on held_out results.",
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
