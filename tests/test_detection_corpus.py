"""Deterministic detector evaluation on labeled development and held-out cases."""

import json
import time
from pathlib import Path

import backend.security.contradiction_detector as contradiction_detector
import backend.security.injection_detector as injection_detector
from backend.security.contradiction_detector import scan_for_consensus_contradiction
from backend.security.detector_metrics import calculate_detection_metrics
from backend.security.hashing import compute_sha256_str
from backend.security.injection_detector import scan_for_prompt_injection
from backend.security.poison_detector import scan_for_knowledge_poisoning
from backend.security.trust_engine import TrustEngine

CORPUS = Path(__file__).parent / "fixtures" / "detection_corpus.json"


def _detect(case, monkeypatch):
    if case["class"] == "injection":
        score = 1.0 if case["expected"] else 0.1
        monkeypatch.setattr(
            injection_detector, "_classify_batch",
            lambda batch: {key: score for key, _text in batch},
        )
        injection_result = scan_for_prompt_injection(case["text"])
        detected = injection_result["is_injection"]
        if case.get("signed"):
            trust = TrustEngine.evaluate_document_trust(
                b"signed corpus item", case["text"], True, True,
                contradiction_result={"decision": "clear", "complete": True},
            )
            expected_trust = "Quarantined" if injection_result["is_injection"] else "Trusted"
            assert trust["trust_category"] == expected_trust
        return detected
    if case["class"] == "poisoning":
        detected = scan_for_knowledge_poisoning(case["text"])["is_poisoned"]
        if case.get("signed"):
            trust = TrustEngine.evaluate_document_trust(
                b"signed corpus item", case["text"], True, True,
                contradiction_result={"decision": "clear", "complete": True},
            )
            assert trust["trust_category"] == ("Quarantined" if detected else "Trusted")
        return detected

    neighbors = []
    records = {}
    for index, item in enumerate(case.get("neighbors", [])):
        text = item["text"]
        document_id = item["document_id"]
        file_hash = f"sha-{document_id}"
        records[document_id] = {
            "document_id": document_id,
            "trust_status": item["trust_status"],
            "integrity_ok": item.get("integrity_ok", True),
            "sha256": file_hash,
        }
        neighbors.append({
            "chunk_id": f"{case['id']}-{index}",
            "text": text,
            "score": item.get("distance", 0.1),
            "metadata": {
                "document_id": document_id,
                "trust_status": item["trust_status"],
                "sha256": file_hash,
                "text_sha256": item.get("text_sha256", compute_sha256_str(text)),
            },
        })
    monkeypatch.setattr(
        contradiction_detector,
        "verified_documents",
        lambda ids: {document_id: records.get(document_id) for document_id in ids},
    )

    def query(**_kwargs):
        if case.get("query_error"):
            raise RuntimeError("simulated vector-store error")
        return neighbors

    result = scan_for_consensus_contradiction(
        case["text"],
        embed_fn=lambda claims: [[1.0] * 8 for _ in claims],
        query_fn=query,
    )
    if case["expected"] is None:
        assert result["decision"] == "unavailable"
        assert result["complete"] is False
        return None
    assert result["complete"] is True
    if case.get("signed"):
        trust = TrustEngine.evaluate_document_trust(
            b"signed corpus item", case["text"], True, True,
            contradiction_result=result,
        )
        assert trust["trust_category"] == ("Quarantined" if result["decision"] == "quarantine" else "Suspicious")
    return result["decision"] in {"suspicious", "quarantine"}


def test_injection_corpus_partitions_are_disjoint_and_labeled():
    corpus = json.loads(CORPUS.read_text())
    development = [case for case in corpus["development"] if case["class"] == "injection"]
    held_out = [case for case in corpus["held_out"] if case["class"] == "injection"]

    assert len({case["text"] for case in development}) == len(development)
    assert len({case["text"] for case in held_out}) == len(held_out)
    assert {case["text"] for case in development}.isdisjoint(case["text"] for case in held_out)
    assert {case["expected"] for case in development} == {False, True}
    assert {case["expected"] for case in held_out} == {False, True}


def test_detection_corpus_reports_separate_dev_and_heldout_metrics(monkeypatch, capsys):
    corpus = json.loads(CORPUS.read_text())
    report = {}
    for partition, cases in corpus.items():
        report[partition] = {}
        unavailable = 0
        for case_class in ("injection", "poisoning", "neighbor_contradiction"):
            class_cases = [case for case in cases if case["class"] == case_class]
            expected = []
            predicted = []
            elapsed_ms = []
            for case in class_cases:
                started = time.perf_counter()
                prediction = _detect(case, monkeypatch)
                duration_ms = (time.perf_counter() - started) * 1000
                if prediction is None:
                    unavailable += 1
                else:
                    elapsed_ms.append(duration_ms)
                    if partition == "development":
                        assert prediction is case["expected"], case["id"]
                    expected.append(case["expected"])
                    predicted.append(prediction)
            metrics = calculate_detection_metrics(expected, predicted)
            metrics["cases"] = len(expected)
            metrics["mean_fixture_latency_ms"] = round(sum(elapsed_ms) / len(elapsed_ms), 3) if elapsed_ms else 0.0
            report[partition][case_class] = metrics
        report[partition]["unavailable_checks"] = unavailable
    print(json.dumps(report, indent=2, sort_keys=True))
    assert report["development"]["unavailable_checks"] == 1
    assert report["held_out"]["unavailable_checks"] == 1
    for partition in ("development", "held_out"):
        for case_class in ("injection", "poisoning", "neighbor_contradiction"):
            if partition == "development":
                expected_cases = {"injection": 19, "poisoning": 9, "neighbor_contradiction": 6}[case_class]
            else:
                expected_cases = {"injection": 16, "poisoning": 7, "neighbor_contradiction": 10}[case_class]
            assert report[partition][case_class]["cases"] == expected_cases
