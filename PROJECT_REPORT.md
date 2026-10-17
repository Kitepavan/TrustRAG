# TrustRAG — Project Report

## Secure Retrieval-Augmented Generation

**Status (October 17, 2026):** Stages 1–11 are implemented as an academic prototype. Stage 12 includes synthetic component checks, a 42-case labeled detector corpus, and a single-trial measured end-to-end Baseline-vs-TrustRAG comparison (`scripts/evaluate_e2e.py`); repeated trials, semantic grading and larger independent corpora remain open.

## Motivation

The most semantically relevant document is not necessarily the safest document. TrustRAG combines document integrity, categorical trust policy, content scanning and role-based authorization before supplying retrieved information to a language model. It uses existing pretrained models rather than training an LLM.

## Architecture and implemented stages

1. **Backend:** Python 3.12, FastAPI and Uvicorn, with configurable CORS.
2. **Ingestion:** PDF, DOCX and TXT extraction; 50 MB copied-file cap; server-generated UUID filenames. Multipart parsing happens before the copy cap, so deployments need a request-body limit. Extracted text is capped at two million characters after extraction.
3. **Chunking:** Sentence-aware chunks targeting 512 characters with 64-character overlap. A long sentence can exceed the target; these are not token limits.
4. **Embedding:** Local EmbeddingGemma-300M through SentenceTransformers, 768 dimensions.
5. **Storage:** ChromaDB cosine similarity with document identity, file and chunk digests, classification and trust metadata.
6. **Generation and UI:** OpenRouter; `LLM_MODEL` (default `openrouter/auto`) with `LLM_FALLBACK_MODEL` (default `nvidia/nemotron-3.5-lightning:free`) substituted on HTTP 402. React 19, strict TypeScript, Vite and Tailwind. Seven pages: Dashboard, Documents, Chat, Evaluation, Audit Log, Knowledge Base and Status.
7. **Document security:** SHA-256, Ed25519 signatures and mutable JSON provenance records. Verification requires only the public key; signatures are retained with new document metadata. Key generation refuses incomplete or mismatched existing pairs.
8. **Content security:** Prompt injection is classified semantically by `inception/mercury-decide:free` through OpenRouter System One, with bounded overlapping segments at ingestion and batched rescans at secure retrieval. Knowledge-poisoning checks remain separate rule-based signals. Trust-weighted neighbor contradiction checks use local embeddings; two non-conflicting Trusted sources can quarantine a contradiction, while ambiguous or single-source evidence is Suspicious. These controls are probabilistic/heuristic and are not guarantees against adversarial content.
9. **Trust:** Signed and clean is Trusted only after complete security checks; unsigned clean is Suspicious; invalid signatures, positive injection/poisoning scans and trusted-neighbor quorum contradictions are Quarantined, including signed malicious content. An unavailable injection classifier quarantines ingestion and blocks retrieval candidates. The development-set-selected injection threshold is `0.14463688220177154` (recalibrated October 16, 2026 on a 42-case labeled corpus); it is specific to that corpus, not a general calibrated threshold.
10. **Authentication:** HS256 JWTs, four fixed role profiles, environment-configured scrypt password hashes. Known demo passwords work only with explicit `TRUSTRAG_DEMO_MODE=true`. The browser contains no embedded passwords and requires sign-in.
11. **Secure retrieval and comparison:** Secure mode oversamples candidates, verifies authoritative document records and current file integrity (including signatures for signed documents), enforces classification and trust, checks chunk digests, rescans injection semantics and neighbor evidence, then ranks Trusted before Suspicious and by distance. Quarantined documents and unavailable injection/neighbor checks are excluded from secure context; ambiguous neighbor findings remain Suspicious. Admin/IT_Security-only Baseline mode is an intentionally vulnerable reference: it returns raw top-K retrieval results and uses a plain generation prompt without TrustRAG trust labels or the secure untrusted-context guardrails. Both modes use the configured answer model; Baseline is for controlled demonstrations, not production use.
12. **Evaluation:** Four synthetic component checks, a 42-case labeled detector corpus, and a single-trial measured end-to-end Baseline-vs-TrustRAG run (`scripts/evaluate_e2e.py`; live classifier and generation, 10-document corpus, 6 paired questions). In that run Baseline surfaced every challenge document (6/6) and Secure none (0/6). It is one run over a small hand-authored corpus with deterministic heuristic judgment fields — evidence of behavior, not a generalization claim. The component suite's Baseline outcomes remain assumptions, and `suite_duration_ms` measures check runtime, not RAG latency overhead.

## Authorization and session lifecycle

Dashboard, status, evaluation, document APIs, query and `/auth/me` require valid authentication. Invalid or expired credentials return 401. Document listings/details respect classification, and uploads cannot select a classification outside the uploader's clearance. Health and login remain public. `/audit/events` additionally requires Admin/IT_Security.

The UI waits for identity validation before mounting protected pages. Sign-out or a 401 unmounts account-specific state, including chat history. Changing account requires signing out and signing in again. Tokens use sessionStorage rather than persistent localStorage; this limits persistence but does not protect tokens against same-origin script compromise.

## Security event telemetry

The current checkout includes a separate SQLite security event store at
`data/security_audit.sqlite3`, written with file mode 0600. Upload/query call sites record
outcomes and structured stages without question text, document content, tokens or secrets.
Instrumented query responses include a request ID, pipeline log, duration and audit-write
status. This is not a complete access/login audit trail; requests rejected before
instrumentation are not necessarily recorded.

Admin/IT_Security can read newest-first events through `GET /audit/events`, using event
and severity filters and cursor pagination. The Audit Log page displays recent events,
expandable traces and a "Load older events" button that accumulates older pages.
The store is mutable and not cryptographically tamper-evident, despite the current UI's
“tamper-resistant” wording. Audit write failures are logged and do not bypass enforcement.

## Persistence and threat model

Metadata and provenance writes use atomic replacement and Linux file locks. Corrupt JSON raises instead of silently becoming an empty store. Upload failure cleanup attempts to remove indexed chunks; orphaned records without authoritative metadata cannot enter secure retrieval. The file, vector and provenance stores are not one transactional database, and process crashes may leave records requiring operator reconciliation.

Deployment administrators, metadata storage and configured public keys remain trusted. Plain digests do not protect against an administrator rewriting content and its expected digest together. Provenance is mutable and is **not tamper-evident**, signed, append-only or a per-query provenance authorization check. Signatures authenticate file bytes, not uploader-selected classification. There is no automatic key rotation/version history. Existing key files are not silently replaced.

Legacy documents lacking signatures, stored filenames, document IDs or chunk digests are not automatically promoted to trusted status. Re-ingest their original files with appropriate classification and signatures. Existing runtime data is not migrated or deleted by this change.

## Verification

Commands:

```bash
PYTHONPATH=. .venv/bin/python -m pytest tests/ -q
npm --prefix frontend run build
npm --prefix frontend run lint
```

Focused detector, trust-engine, ingestion, retrieval, evaluation and labeled-corpus tests pass with mocked model responses. On the grown 42-case labeled corpus, development-only selection moved the injection threshold to `0.14463688220177154` (dev precision/recall 1.00/0.91; held-out 0.90/0.90), and the rule-based poisoning detector measured 16/16 (0 FP, 0 FN). A single-trial measured end-to-end Baseline-vs-TrustRAG run recorded 10/10 live trust expectations met, Baseline surfacing all 6/6 challenge documents and Secure none (0/6); see [the E2E report](docs/evaluations/2026-10-16-e2e-baseline-vs-trustrag.md). The full suite completes: **143 passed**, 1 warning (Starlette TestClient/httpx deprecation); frontend build and lint pass. An October 15, 2026 review pass hardened deletion clearance, the evaluation detection metric, provider 4xx handling and context delimiters — see [PROGRESS.md](PROGRESS.md).

## Limits and remaining academic work

- The single-trial end-to-end comparison must be repeated across trials with semantic answer grading (current judgment fields are deterministic heuristics) and a larger, independently sourced corpus; the included corpus is small and curated and does not establish general model performance.
- Context delimiters and system instructions are mitigations, not a hard prompt-injection boundary.
- Oversampling is bounded to three times top-K; filtering can underfill results. Long-document extraction and embedding remain resource-intensive.
- Document text is sent to OpenRouter for injection classification. Operators must approve external processing of their data; no classification-specific egress policy is implemented. The free model is subject to provider availability and rate limits.
- Production deployment still needs TLS, request/rate limits, quotas, identity lifecycle/revocation, monitoring, backups and private-key access controls. Restrict `.env` and existing private keys to the service owner; new private key writes use mode 0600.
- Historical reports mentioned an exposed provider key. Rotation of externally exposed credentials cannot be established from this checkout; repository history alone is not evidence of rotation.

## Running the project

Use the configuration, credential setup and authenticated API examples in [README.md](README.md). `./start.sh` launches the local development servers. Node.js must satisfy Vite's requirement: 20.19+ or 22.12+ on supported release lines.


### Development recovery record

On September 17, 2026, stopped/suspended backend and Vite processes were cleared and
restarted. Backend health, frontend HTTP 200 and employee demo login succeeded. Demo mode
was explicitly enabled in the private local `.env`; the OpenRouter key was empty at that
check. This records a past recovery, not guaranteed current uptime. Ctrl+Z was a suspected,
not proven, cause. This documentation pass changed neither application code nor services.

A missing provider key does not prevent startup. If retrieval finds no eligible context,
query returns 200 without generation; if generation is reached without a key, it returns
502. Retrieval failures return 503. Transient provider failures (rate limit/5xx/network)
retry before returning a labelled retrieved-context fallback; permanent 4xx errors fail
fast with 502. Therefore HTTP 200 alone does not prove model generation.
