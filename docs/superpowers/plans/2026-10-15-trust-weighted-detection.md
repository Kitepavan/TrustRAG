# Trust-Weighted Anomaly Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve prompt-injection and poisoning detection by combining deterministic signals with integrity-verified, trust-weighted semantic neighbors, then measure the result on labeled data.

**Architecture:** Keep direct pattern detection in the injection and poisoning detectors. Make the neighbor evaluator return structured outcomes based on distinct verified documents, with Trusted evidence strong, Suspicious evidence weak, and Quarantined or invalid evidence ignored. Ingestion and secure retrieval consume the same outcome policy; an incomplete check cannot promote a document to Trusted or pass unchecked context to the LLM.

**Tech Stack:** Python 3.12, pytest, existing EmbeddingGemma wrapper, ChromaDB, document_store integrity verification. No new model, network service, or dependency.

**Spec:** `docs/superpowers/specs/2026-10-15-trust-weighted-detection-design.md`

## Global Constraints

- Use existing EmbeddingGemma embeddings and ChromaDB; do not add a model or network dependency in this iteration.
- Count each distinct document at most once, even if several of its chunks are retrieved.
- `Trusted` is strong evidence; `Suspicious` is weak/contextual evidence; `Quarantined`, missing, or integrity-failed sources provide no positive evidence.
- A lone neighbor, Suspicious-only neighbors, low similarity, or conflicting neighbor evidence cannot establish a Trusted baseline.
- Failure to complete the neighbor check must never promote a document to `Trusted`.
- At retrieval, a candidate whose required security check cannot complete is excluded from secure context and traced as blocked; baseline mode remains unchanged.
- Do not store question text or document contents in audit events.
- Do not describe the detector as robust or validated unless held-out results meet agreed thresholds and the full backend test suite passes.

## Review Focus

- Unicode/zero-width and unusual whitespace evasion: normalization catches supported obfuscation without changing ordinary text.
- Quoted or explicitly rejected attack examples: descriptive clean documents remain available.
- Duplicate chunks and same-document neighbors: one source contributes at most one vote and cannot support itself.
- Stale trust metadata or changed files: invalid sources never contribute positive evidence.
- Model/vector-store errors: ingestion cannot promote to Trusted and retrieval excludes unchecked candidates with a trace reason.

---

## File map

- `backend/security/injection_detector.py`: normalize text and apply injection rules consistently; preserve the current result keys and add precise reason codes only if needed by tests.
- `backend/security/poison_detector.py`: normalize text and detect direct known poisoning signals; preserve the current result keys.
- `backend/security/contradiction_detector.py`: neighbor lookup, authoritative verification, distinct-source trust weighting, and structured outcomes.
- `backend/security/trust_engine.py`: map detector and neighbor outcomes to `Trusted`, `Suspicious`, or `Quarantined`.
- `backend/rag/ingestion.py`: invoke neighbor evaluation before indexing and pass unavailable/inconclusive outcomes through to the trust engine.
- `backend/rag/secure_retrieval.py`: enforce the same checks for secure candidates; leave baseline behavior unchanged.
- `tests/test_content_security.py`, `tests/test_security_enforcement.py`, `tests/test_contradiction_detector.py`, and focused new fixtures/tests: detector, policy, and integration regressions.
- `tests/fixtures/detection_corpus.json`: labeled clean/attack cases and neighbor relationships.
- `backend/security/evaluation.py` or a focused evaluation helper: compute class-specific metrics from corpus outcomes without changing existing API semantics unless tests require it.
- `PROGRESS.md` and `PROJECT_REPORT.md`: update only after implementation and held-out results are verified.

## Task 1: Make direct detectors consistent to common obfuscation

**Files:**
- Modify: `backend/security/injection_detector.py`
- Modify: `backend/security/poison_detector.py`
- Test: `tests/test_content_security.py`
- Test: `tests/test_security_enforcement.py`

**Interfaces:**
- Consumes: existing `scan_for_prompt_injection(text: str) -> dict` and `scan_for_knowledge_poisoning(text: str) -> dict` callers.
- Produces: same public function signatures and existing result keys (`is_injection`, `risk_score`, `matched_patterns`; `is_poisoned`, `poison_score`, `detected_anomalies`). Detection runs against a shared normalization behavior implemented locally in each module or a small shared helper only if both modules need it.

- [ ] **Step 1: Write failing tests** `test_prompt_injection_normalizes_zero_width_and_whitespace` and `test_poison_detection_normalizes_zero_width_and_whitespace`; assert the obfuscated known attack text is detected with the existing rule IDs.
- [ ] **Step 2: Write failing clean-text tests** `test_prompt_injection_quoted_example_is_not_directive` and `test_poison_detector_clean_rejection_is_not_poison`; assert explicitly educational/negating prose remains unflagged while an operative attack is still flagged.
- [ ] **Step 3: Run targeted tests and verify they fail** for the expected detection/false-positive gaps.

Run: `PYTHONPATH=. .venv/bin/pytest tests/test_content_security.py tests/test_security_enforcement.py -q`

- [ ] **Step 4: Implement minimal Unicode/whitespace normalization** before matching, preserving existing reason IDs and result keys. Add only the context distinction needed by the clean-text regression cases.
- [ ] **Step 5: Run targeted tests and verify they pass.**

Expected: both test modules pass; clean existing policy cases remain unflagged.

## Task 2: Replace single-neighbor contradiction with verified trust-weighted evidence

**Files:**
- Modify: `backend/security/contradiction_detector.py`
- Test: `tests/test_contradiction_detector.py`
- Test: `tests/test_integrity_enforcement.py`

**Interfaces:**
- Consumes: `verified_documents(document_ids) -> mapping` from `backend.security.document_store`, `query_chunks(query_embedding, top_k)` from `backend.rag.vectorstore`, and the current optional `embed_fn`/`query_fn` injection points.
- Produces: `scan_for_consensus_contradiction(text, exclude_document_id=None, embed_fn=None, query_fn=None) -> dict` with stable fields `decision` (`clear`, `suspicious`, `quarantine`, `unavailable`), `is_contradiction`, `contradiction_score`, `reason_codes`, `evidence` (distinct document ID, trust status, similarity, and matched claim), and `complete`.

- [ ] **Step 1: Write failing tests** `test_quarantined_neighbor_is_ignored`, `test_integrity_failed_neighbor_is_ignored`, and `test_candidate_document_is_excluded`; assert none can contribute evidence.
- [ ] **Step 2: Write failing tests** `test_duplicate_chunks_count_as_one_source`, `test_two_trusted_sources_can_quarantine_contradiction`, `test_one_trusted_source_only_marks_suspicious`, and `test_suspicious_only_sources_never_quarantine`; assert one vote per document and a two-distinct-Trusted-source quorum.
- [ ] **Step 3: Write failing tests** `test_cold_start_returns_clear_complete` and `test_neighbor_lookup_failure_returns_unavailable`; assert cold start differs from an incomplete check.
- [ ] **Step 4: Run the focused test module and verify the new cases fail** for the expected one-neighbor/current fail-open behavior.

Run: `PYTHONPATH=. .venv/bin/pytest tests/test_contradiction_detector.py -q`

- [ ] **Step 5: Implement verified neighbor filtering and distinct-document evidence aggregation.** Keep existing similarity/cue heuristics as evidence signals; do not present similarity alone as contradiction or calibrated probability.
- [ ] **Step 6: Run the focused detector and integrity tests.**

Run: `PYTHONPATH=. .venv/bin/pytest tests/test_contradiction_detector.py tests/test_integrity_enforcement.py -q`

Expected: all source-trust, deduplication, cold-start, and failure-mode cases pass.

## Task 3: Apply outcomes consistently in trust decisions and ingestion

**Files:**
- Modify: `backend/security/trust_engine.py`
- Modify: `backend/rag/ingestion.py`
- Test: `tests/test_trust_engine.py`
- Test: `tests/test_contradiction_detector.py`
- Test: `tests/test_documents_api.py`

**Interfaces:**
- Consumes: Task 2 neighbor result fields and existing injection/poison result keys.
- Produces: ingestion passes a structured neighbor result; trust engine preserves the existing outward result fields and applies these mappings: high-confidence direct detector or strong contradiction => `Quarantined`; ambiguous evidence or unavailable neighbor check => at most `Suspicious`; clean complete check => existing signature-based policy.

- [ ] **Step 1: Write failing trust-engine tests** `test_signed_strong_contradiction_is_quarantined`, `test_ambiguous_neighbor_evidence_is_suspicious`, and `test_unavailable_neighbor_check_never_trusts_document`; assert exact trust categories.
- [ ] **Step 2: Write failing ingestion tests** `test_ingest_excludes_candidate_from_neighbors` and `test_ingest_detector_exception_is_unavailable`; assert self-exclusion and that errors cannot become a clean result.
- [ ] **Step 3: Run focused tests and verify failure** on the current catch-and-clear behavior.

Run: `PYTHONPATH=. .venv/bin/pytest tests/test_trust_engine.py tests/test_contradiction_detector.py tests/test_documents_api.py -q`

- [ ] **Step 4: Implement outcome mapping** without changing signature verification, uploader identity, or document authorization.
- [ ] **Step 5: Run focused tests and verify pass.**

Expected: no detector-unavailable or ambiguous result produces `Trusted`; direct high-confidence signals still quarantine signed and unsigned content.

## Task 4: Enforce retrieval-time checks and trace failures

**Files:**
- Modify: `backend/rag/secure_retrieval.py`
- Test: `tests/test_security_enforcement.py`
- Test: `tests/test_secure_retrieval.py`
- Test: `tests/test_contradiction_detector.py`

**Interfaces:**
- Consumes: Task 2 structured neighbor result and current verified/RBAC candidate filtering.
- Produces: secure retrieval excludes candidates with `quarantine` or `unavailable` outcomes and sets explicit `filter_reason`; pipeline trace reports detected, inconclusive, unavailable, and blocked counts. Baseline mode remains byte-for-byte behaviorally unchanged.

- [ ] **Step 1: Write failing retrieval tests** `test_retrieval_blocks_strong_contradiction`, `test_retrieval_blocks_unavailable_neighbor_check`, and `test_retrieval_keeps_ambiguous_candidate_suspicious_only_per_policy`; assert no unchecked candidate reaches secure context.
- [ ] **Step 2: Write failing trace tests** `test_retrieval_trace_reports_contradiction` and `test_retrieval_trace_reports_unavailable_check`; assert exact stage names and blocked counts.
- [ ] **Step 3: Write `test_baseline_retrieval_remains_unfiltered`** proving baseline mode still returns its unfiltered top-K candidates.
- [ ] **Step 4: Run focused retrieval tests and verify failure.**

Run: `PYTHONPATH=. .venv/bin/pytest tests/test_security_enforcement.py tests/test_secure_retrieval.py tests/test_contradiction_detector.py -q`

- [ ] **Step 5: Implement secure-path outcome enforcement and trace entries.**
- [ ] **Step 6: Run focused tests and verify pass.**

Expected: unchecked candidates never reach secure context; the privileged baseline control path remains unchanged.

## Task 5: Add labeled corpus and report metrics

**Files:**
- Create: `tests/fixtures/detection_corpus.json`
- Create or modify: focused test/evaluation helper under `tests/` or `backend/security/`
- Test: `tests/test_content_security.py`
- Test: `tests/test_contradiction_detector.py`
- Test: `tests/test_security_enforcement.py`

**Interfaces:**
- Consumes: detector result schemas from Tasks 1–4.
- Produces: deterministic evaluation output with separate TP, FP, TN, FN, precision, recall, false-positive rate, and latency for injection, poisoning, and neighbor contradiction classes. Keep corpus labels and neighbor identities explicit; no model/network calls.

- [ ] **Step 1: Create labeled fixtures** covering direct/indirect/obfuscated/paraphrased attacks; benign policy discussion/quotes; numerical and semantic reversals; conflicting, sparse, cold-start, mixed-trust, duplicate, quarantined, and invalid neighbors; signed malicious content; and injected detector/storage failures.
- [ ] **Step 2: Write `test_detection_metrics_confusion_counts` and `test_detection_metrics_zero_denominator`**; assert exact TP/FP/TN/FN and define undefined precision/recall/FPR as `0.0` for reporting.
- [ ] **Step 3: Run metric tests and verify failure** before adding the evaluator.
- [ ] **Step 4: Implement deterministic metric calculation** and report each detection class separately; do not tune against the held-out fixture.
- [ ] **Step 5: Run the labeled corpus** and record raw counts, rates, and latency for development and held-out partitions.

Expected: metrics are reproducible and class-separated; no aggregate score hides a class with poor recall or excessive false positives.

## Task 6: Verify end-to-end behavior and update project claims

**Files:**
- Modify: `PROGRESS.md`
- Modify: `PROJECT_REPORT.md`
- Test: full backend suite and frontend checks if shared API/UI contracts changed.

**Interfaces:**
- Consumes: verified implementation and held-out results from Tasks 1–5.
- Produces: documentation that describes implemented behavior and reports only measured results. Leave production/security claims qualified by actual test evidence.

- [ ] **Step 1: Run the complete backend suite.**

Run: `PYTHONPATH=. .venv/bin/pytest tests/ -v`

Expected: all tests pass; report any pre-existing warning separately.

- [ ] **Step 2: Run frontend build and lint** if API response or pipeline trace schemas changed.

Run: `npm --prefix frontend run build && npm --prefix frontend run lint`

Expected: build succeeds and lint has no errors or warnings.

- [ ] **Step 3: Update progress/report** with measured held-out metrics and the limitations that remain; do not claim complete prompt-injection prevention.
- [ ] **Step 4: Review the final diff** to ensure no unrelated user changes, secrets, runtime data, or generated artifacts were added.

## Dependency order

Task 1 can proceed independently. Task 2 defines the structured neighbor outcome contract. Tasks 3 and 4 consume that contract and can then proceed independently. Task 5 evaluates the final behavior. Task 6 documents only verified outcomes.
