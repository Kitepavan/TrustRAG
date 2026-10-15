# Trust-Weighted Anomaly Detection Design

**Status:** Draft for review  
**Date:** 2026-10-15

## Goal

Improve TrustRAG's prompt-injection and knowledge-poisoning detection so suspicious content is evaluated against semantically related neighboring sources, with evidence weighted by source trust. Reduce missed paraphrased attacks without treating one neighbor or an unverified source as ground truth. Make the tradeoff measurable with labeled regression data.

## Current behavior and gaps

- Prompt injection and known poisoning checks are fixed regular expressions in `backend/security/injection_detector.py` and `backend/security/poison_detector.py`.
- Ingestion runs these checks through `TrustEngine`; a positive result quarantines the document. Secure retrieval rescans candidate chunks.
- `backend/security/contradiction_detector.py` adds local-embedding neighbor comparison, but currently accepts a single Trusted chunk as its baseline, uses simple negation/number cues, and is caught with fail-open behavior in ingestion and retrieval.
- Current tests cover a small set of examples, not measured false-positive and false-negative rates.

## Proposed detection model

Keep the existing deterministic detectors as high-confidence signals for recognizable injection and poisoning patterns. Add a shared neighbor-evidence evaluator for anomalies that depend on local knowledge and policy context. Use the existing EmbeddingGemma embeddings and ChromaDB; do not add a model or network dependency in this iteration.

For each document claim or retrieved chunk:

1. Find semantically related sources, excluding the candidate document itself.
2. Verify each neighbor against authoritative document metadata and file/chunk integrity before using it as evidence.
3. Count each distinct document at most once, even if several of its chunks are retrieved.
4. Assign evidence by trust class: `Trusted` is strong evidence; `Suspicious` is weak/contextual evidence; `Quarantined`, missing, or integrity-failed sources provide no positive evidence.
5. Compare claims and neighbors for contradiction, policy reversal, suspicious instruction content, and numerical conflicts. Similarity alone is not evidence of an attack.
6. Require multiple independent strong sources or another high-confidence detector signal before automatically quarantining based on a neighbor disagreement. A single or mixed-source disagreement marks the candidate `Suspicious` and records the evidence for review.

The evaluator should return a structured result containing the decision, reason codes, the distinct supporting neighbor IDs and trust classes, similarity/evidence values, and whether the result was complete. It must not store question text or document contents in audit events.

## Trust and decision policy

- Invalid signatures, integrity failures, and high-confidence direct injection/poisoning matches remain quarantine conditions.
- A contradiction against a strong, independent Trusted consensus may quarantine, including signed documents; a valid signature proves origin/integrity, not that content agrees with current policy.
- A lone neighbor, Suspicious-only neighbors, low similarity, or conflicting neighbor evidence cannot establish a Trusted baseline. The result is `Suspicious` pending review, not an automatic quarantine.
- Quarantined and integrity-failed sources never influence consensus.
- A cold-start corpus with no verified Trusted neighbors does not invent a consensus. Deterministic checks still run; otherwise the normal unsigned/signed trust rules apply.
- Failure to complete the neighbor check must never promote a document to `Trusted`. Ingestion records it as `Suspicious` with a detector-unavailable reason. At retrieval, a candidate whose required security check cannot complete is excluded from secure context and traced as blocked; baseline mode remains unchanged for the academic control path.

## Pipeline placement

### Ingestion

Run deterministic checks and neighbor comparison after extraction and before indexing. Only previously indexed, integrity-verified neighbors can support the comparison. Pass the structured result into the trust engine and persist reason codes/evidence references in document metadata and provenance. Do not persist full extracted text in the detector result.

### Secure retrieval

Keep the direct injection/poisoning rescan on each candidate. Apply the same trust-weighted neighbor evaluator to candidates that pass integrity and RBAC checks, excluding their own document from neighbors. Do not change the privileged baseline retrieval path. Add explicit pipeline trace outcomes for detected, inconclusive, and unavailable checks.

## Evaluation and acceptance criteria

Add a deterministic, labeled corpus of clean documents and attacks with source relationships. Include:

- Direct, indirect, obfuscated, and paraphrased prompt-injection instructions.
- Known poisoning phrases and semantic policy reversals using paraphrases and numerical changes.
- Clean policy prose that quotes, discusses, or rejects attack language.
- Conflicting, sparse, cold-start, duplicate-chunk, and mixed-trust neighbor sets.
- Signed malicious content and integrity-failed or quarantined neighbors.
- Detector and vector-store failures at ingestion and retrieval.

Report separately for injection, poisoning, and neighbor contradictions: true/false positives, true/false negatives, precision, recall, false-positive rate, and decision latency. Tune similarity and quorum thresholds on a development set and report final numbers on a held-out set. Do not describe the detector as robust or validated unless the held-out results meet agreed thresholds and the full backend test suite passes.

Initial acceptance conditions:

- Quarantined or integrity-failed neighbors never affect decisions.
- One document cannot gain extra consensus weight through duplicate chunks.
- Trusted evidence outweighs Suspicious evidence; Suspicious-only evidence cannot quarantine.
- Signed malicious content is still blocked by content evidence.
- Strong semantic contradictions with a multi-document Trusted consensus are detected; clean paraphrases and clean discussion of attack text remain available.
- Detector failures never produce a Trusted decision or unchecked secure context.
- Regression metrics are reported independently for each detection class, including false positives and misses.

Numeric operating targets for precision, recall, false-positive rate, and latency remain to be agreed after measuring the labeled corpus; no threshold is represented as calibrated before that measurement.

## Scope and compatibility

This iteration improves the existing TrustRAG prototype. It does not claim complete prompt-injection prevention, make mutable provenance tamper-evident, change RBAC or signature formats, add an external service, or alter baseline mode. Neighbor detection is evidence for trust decisions, not a substitute for authorization or integrity verification.

## Files expected to change during implementation

- `backend/security/injection_detector.py`
- `backend/security/poison_detector.py`
- `backend/security/contradiction_detector.py` (or a shared neighbor-evidence helper if the implementation review supports it)
- `backend/security/trust_engine.py`
- `backend/rag/ingestion.py`
- `backend/rag/secure_retrieval.py`
- focused detector, trust-engine, and retrieval tests; a labeled fixture under `tests/`
- `PROGRESS.md` and `PROJECT_REPORT.md` to describe only verified behavior and measured results

## Review questions

1. Is `Suspicious` the right outcome for ambiguous or mixed-neighbor evidence?
2. Should secure retrieval exclude a candidate whenever neighbor evaluation is unavailable, as proposed?
3. What held-out minimum precision, recall, false-positive rate, and latency should be required before calling the detector improved?
