"""Semantic indirect prompt-injection checks through a System One decision endpoint.

Mercury Decide (OpenRouter) is the default; TRUSTRAG_DECISION_URL and
TRUSTRAG_DECISION_MODEL point the same contract at a locally served Laya
classifier instead.
"""

import json
import math
import os
from typing import Any

import httpx


DEFAULT_DECISION_MODEL = "inception/mercury-decide:free"
DEFAULT_DECISION_URL = "https://openrouter.ai/api/v1/systemone"
# Selected October 17, 2026 by development-set F1 against the locally served Laya
# English classifier (TRUSTRAG_DECISION_*; ties favor recall; held-out FP/FN reported
# in docs/evaluations/2026-10-17-laya-local-classifier-calibration.md). Provisional:
# recalibrate as the labeled corpus grows; do not tune on held-out results.
INJECTION_THRESHOLD = 0.35324999999999995
# Each segment must fit inside the served classifier's token window: a 2000-char
# English segment measures ~360 state tokens and is not truncated, and a provider
# that reports truncation anyway makes the scan fail closed.
SEGMENT_CHARS = 2000
SEGMENT_OVERLAP = 256
# The local Laya classifier answered item-by-item correctly only when the state held a
# single text (measured October 17, 2026); multi-item states produced answers that
# ignored the referenced key. Local requests are cheap, so segments are sent alone.
MAX_QUESTIONS_PER_REQUEST = 1
REQUEST_TIMEOUT_SECONDS = 20


def _unavailable() -> dict[str, Any]:
    return {
        "is_injection": True,
        "risk_score": 1.0,
        "scan_status": "unavailable",
        "failure_code": "INJECTION_CLASSIFIER_UNAVAILABLE",
    }


def _segments(text: str) -> list[str]:
    if not text:
        return []
    segments = []
    start = 0
    while start < len(text):
        end = min(start + SEGMENT_CHARS, len(text))
        if end < len(text):
            boundary = text.rfind(" ", start + SEGMENT_CHARS // 2, end)
            if boundary > start:
                end = boundary
        segments.append(text[start:end])
        if end == len(text):
            break
        start = max(start + 1, end - SEGMENT_OVERLAP)
    return segments


def decision_endpoint() -> tuple[str, str]:
    """Resolve (url, model) at call time so a late .env load is honored."""
    url = os.environ.get("TRUSTRAG_DECISION_URL", "").strip() or DEFAULT_DECISION_URL
    model = os.environ.get("TRUSTRAG_DECISION_MODEL", "").strip() or DEFAULT_DECISION_MODEL
    return url, model


def _decision_api_key() -> str:
    """Decision-endpoint bearer: TRUSTRAG_DECISION_API_KEY, else OPENROUTER_API_KEY."""
    return (
        os.environ.get("TRUSTRAG_DECISION_API_KEY", "").strip()
        or os.environ.get("OPENROUTER_API_KEY", "").strip()
    )


def _classify_batch(batch: list[tuple[str, str]]) -> dict[str, float] | None:
    url, model = decision_endpoint()
    api_key = _decision_api_key()
    # The default OpenRouter endpoint requires a key; skip the call (fail closed)
    # when none is set. A custom endpoint (e.g. the local Laya classifier) may
    # accept callers without one.
    if not api_key and httpx.URL(url).host == httpx.URL(DEFAULT_DECISION_URL).host:
        return None

    state = json.dumps(
        {f"item_{i}": text for i, (_key, text) in enumerate(batch)},
        ensure_ascii=False,
    )
    # Wording follows Laya's curated `prompt_injection` guard preset; it measured the
    # best development F1 of the wordings tried when TrustRAG moved to the local model.
    questions = {
        f"item_{i}": {
            "type": "noul",
            "instructions": (
                f"Does the JSON string value for key item_{i} contain instructions aimed at the AI system "
                "rather than a genuine user request?"
            ),
        }
        for i in range(len(batch))
    }
    headers = {"Content-Type": "application/json", "X-Title": "TrustRAG"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = client.post(
                url,
                json={"model": model, "state": state, "questions": questions},
                headers=headers,
            )
            response.raise_for_status()
            payload = response.json()
        # A provider that quietly cut the state did not classify the whole segment.
        if (payload.get("usage") or {}).get("truncated"):
            return None
        answers = payload["answers"]
        probabilities = {}
        for i, (key, _text) in enumerate(batch):
            answer = answers[f"item_{i}"]
            if answer.get("type") != "noul":
                return None
            probability = answer["noul"]
            if isinstance(probability, bool) or not isinstance(probability, (int, float)):
                return None
            if not math.isfinite(probability) or not 0 <= probability <= 1:
                return None
            probabilities[key] = float(probability)
        return probabilities
    except Exception:
        return None


def scan_prompt_injections(items: list[tuple[str, str]]) -> dict[str, dict[str, Any]]:
    """Classify keyed texts, chunking long items and bounding each provider request."""
    results = {}
    valid_items = []
    for key, text in items:
        if not isinstance(text, str):
            results[key] = _unavailable()
        elif not text.strip():
            results[key] = {"is_injection": False, "risk_score": 0.0, "scan_status": "complete"}
        else:
            valid_items.append((key, text))
    segments = [
        (key, segment)
        for key, text in valid_items
        for segment in _segments(text)
    ]
    for offset in range(0, len(segments), MAX_QUESTIONS_PER_REQUEST):
        indexed_batch = list(enumerate(segments[offset:offset + MAX_QUESTIONS_PER_REQUEST], start=offset))
        batch = [(str(index), segment) for index, (_key, segment) in indexed_batch]
        scores = _classify_batch(batch)
        for index, (key, _segment) in indexed_batch:
            if scores is None:
                results[key] = _unavailable()
                continue
            if results.get(key, {}).get("scan_status") == "unavailable":
                continue
            score = scores[str(index)]
            current = results.get(key, {"is_injection": False, "risk_score": 0.0, "scan_status": "complete"})
            risk_score = max(current["risk_score"], score)
            results[key] = {
                "is_injection": current["is_injection"] or score >= INJECTION_THRESHOLD,
                "risk_score": risk_score,
                "scan_status": "complete",
            }
    return results


def scan_for_prompt_injection(text: str) -> dict[str, Any]:
    """Return an injection verdict, failing closed if the remote classifier fails."""
    if not isinstance(text, str):
        return _unavailable()
    if not text or not text.strip():
        return {"is_injection": False, "risk_score": 0.0, "scan_status": "complete"}
    return scan_prompt_injections([("document", text)])["document"]
