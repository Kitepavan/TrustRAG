# Mercury Decide Prompt-Injection Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace regex-based prompt-injection verdicts with fail-closed semantic decisions from OpenRouter Mercury Decide.

**Architecture:** Keep TrustRAG's shared detector entry point, but send bounded text states and a typed yes/no decision to OpenRouter System One. Apply the detector during ingestion and again to retrieved candidates in a bounded batch; quarantine or exclude on positive decisions and provider failures. Tune the probability threshold on labeled development data and report results on a separate holdout set.

**Tech Stack:** Python 3.12, httpx, FastAPI, pytest, OpenRouter System One (`inception/mercury-decide:free`).

**Spec:** `docs/superpowers/specs/2026-10-15-openrouter-injection-classifier-design.md`

## Global Constraints

- Send document text to OpenRouter, as authorized by the user.
- Use `inception/mercury-decide:free` for detection; keep `LLM_MODEL` for answer generation.
- Treat scanned text as untrusted data and never log it or provider reasoning.
- Fail closed on unavailable provider, timeout, malformed response, missing answer, or invalid probability.
- Keep knowledge-poisoning detection separate and preserve privileged baseline retrieval behavior.
- Do not claim complete prompt-injection prevention; report false positives and false negatives.

## Review Focus

- A missing OpenRouter key or timeout must quarantine ingestion and exclude retrieval candidates; test both paths.
- A response with missing or out-of-range `noul` must fail closed; test response validation.
- A benign training example discussing an injection must be judged by model semantics, without regex quote sanitation; include it in live labeled evaluation.
- A multi-segment document must not pass if any segment is positive or unavailable; test aggregation.
- A batch response must stay associated with the correct chunk IDs; test identity and batch limits.

---

### Task 1: Implement the Mercury Decide client and detector contract

**Files:**
- Modify: `backend/security/injection_detector.py`
- Test: `tests/test_content_security.py`
- Test: `tests/test_injection_detector.py` (new)

**Interfaces:**
- Produces `scan_for_prompt_injection(text: str) -> dict` for one document/text input.
- Produces `scan_prompt_injections(items: list[tuple[str, str]]) -> dict[str, dict]` for keyed text inputs; each output includes the same key, `is_injection`, `risk_score` (the model's yes probability), and `scan_status` (`complete` or `unavailable`).
- Uses one bounded internal System One call with payload keys `model`, `state`, and `questions`, endpoint `https://openrouter.ai/api/v1/systemone`, and the existing `OPENROUTER_API_KEY`.

- [x] Add HTTP-mocked tests for exact endpoint, model ID, typed yes/no question, authorization header, and valid `answers.<question>.noul` parsing.
- [x] Add failing tests for missing key, timeout, non-2xx response, malformed JSON, absent answer, NaN, and probabilities outside `[0, 1]`; assert non-sensitive unavailable results.
- [x] Add tests that long input is divided into bounded overlapping segments and aggregate-positive/unavailable behavior is fail-closed.
- [x] Implement a finite probability validator and set the fixed threshold to the development-corpus-selected value in Task 4 before holdout reporting.
- [x] Remove regex verdict patterns and quote-removal sanitization from this module; keep the shared API and never echo scanned text in errors/logs.
- [x] Run `PYTHONPATH=. .venv/bin/pytest tests/test_injection_detector.py tests/test_content_security.py -q`.

### Task 2: Enforce semantic decisions at ingestion

**Files:**
- Modify: `backend/security/trust_engine.py`
- Modify: `backend/rag/ingestion.py`
- Test: `tests/test_trust_engine.py`
- Test: `tests/test_ingestion_trust.py`

**Interfaces:**
- Consumes Task 1 `scan_for_prompt_injection(text)` result, including `scan_status` and `risk_score`.
- Preserves the existing trust-engine return shape and records only controlled reason codes.

- [x] Mock the detector to cover clean, positive, and unavailable responses; assert positive and unavailable verdicts quarantine signed and unsigned documents.
- [x] Implement trust-engine handling: positive becomes `PROMPT_INJECTION_DETECTED`; unavailable becomes `PROMPT_INJECTION_SCAN_UNAVAILABLE`; neither exposes source text or model reasoning.
- [x] Remove quote sanitation based on regex detector outputs from ingestion; benign cited examples remain intact and are assessed semantically.
- [x] Confirm quarantined ingestion remains excluded by existing document-store/vector-store policy.
- [x] Run `PYTHONPATH=. .venv/bin/pytest tests/test_trust_engine.py tests/test_ingestion_trust.py -q`.

### Task 3: Batch semantic rescans during secure retrieval

**Files:**
- Modify: `backend/rag/secure_retrieval.py`
- Test: `tests/test_secure_retrieval.py`
- Test: `tests/test_security_enforcement.py`

**Interfaces:**
- Consumes Task 1 `scan_prompt_injections(items)` keyed by candidate `chunk_id` (with deterministic per-position fallback for legacy candidates missing IDs).
- Leaves `mode="baseline"` unfiltered for the academic comparison.

- [x] Add tests for batch-positive exclusion, unavailable exclusion, clean candidate pass-through, ID association, maximum batch size, and that only secure mode calls the detector.
- [x] Classify candidates as one or more bounded batches before context assembly; mark excluded candidates with `BLOCKED_RETRIEVAL_PROMPT_INJECTION` or `BLOCKED_RETRIEVAL_INJECTION_CHECK_UNAVAILABLE`.
- [x] Remove retrieval-time regex quote sanitation and preserve poison, integrity, RBAC, and neighbor checks.
- [x] Update pipeline trace counts/messages for positive and unavailable classifier outcomes without exposing text.
- [x] Run `PYTHONPATH=. .venv/bin/pytest tests/test_secure_retrieval.py tests/test_security_enforcement.py -q`.

### Task 4: Tune and report the detector on labeled data

**Files:**
- Modify: `tests/fixtures/detection_corpus.json`
- Modify: `backend/security/evaluation.py`
- Create: `scripts/evaluate_injection_detector.py`
- Test: `tests/test_detection_corpus.py`
- Test: `tests/test_evaluation.py`

**Interfaces:**
- Evaluation script calls the real `scan_for_prompt_injection` and reports threshold, precision, recall, false-positive rate, and false-negative rate for separate development and holdout labels.
- Automated tests mock the classifier; normal test runs do not require OpenRouter credentials or network access.

- [x] Extend the labeled synthetic corpus with paraphrased attacks, multi-sentence/obfuscated cases, benign Coca-Cola supplier requirements, and benign injection-warning examples; keep document text synthetic or public-source excerpts only.
- [x] Partition labeled cases into development and holdout sets with no duplicate texts across sets; add a test that verifies the partition is disjoint and contains both classes.
- [x] Add an explicit live-evaluation script that reports each metric and selects the threshold on development data only; never tune on holdout results.
- [x] Run live evaluation with OpenRouter, record the selected threshold and holdout metrics in a concise report, and update the detector constant.
- [ ] Run full verification: `PYTHONPATH=. .venv/bin/pytest tests/ -v` (attempted; TestClient hangs before the first response).
