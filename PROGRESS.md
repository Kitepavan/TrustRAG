# TrustRAG — Project Progress Tracker

> **Current milestone:** Stages 1–11 implemented as an academic prototype; Stage 12 includes synthetic component checks and a small labeled detector corpus. End-to-end baseline-versus-secure RAG evaluation remains open.
>
> **Last updated:** October 15, 2026

## Stage roadmap

| Stage | Feature | Current deliverable |
|---|---|---|
| 1 | Backend setup | FastAPI, configurable CORS, `.venv`, development launcher |
| 2 | Document ingestion | PDF/DOCX/TXT; UUID storage names; 50 MiB copied-file cap; two-million-character post-extraction cap |
| 3 | Chunking | Sentence-aware 512-character target and 64-character overlap; not token limits |
| 4 | Embeddings | Local EmbeddingGemma-300M, 768 dimensions |
| 5 | Vector persistence | ChromaDB cosine similarity, document IDs, classification, trust and digests |
| 6 | RAG and frontend | OpenRouter; React 19/TypeScript/Vite/Tailwind; seven protected page routes |
| 7 | Document security | SHA-256, Ed25519 verification, mutable JSON provenance |
| 8 | Content security | OpenRouter Mercury Decide semantic prompt-injection decisions, separate poisoning checks, and trust-weighted neighbor contradiction checks at ingestion and secure retrieval |
| 9 | Trust engine | Trusted / Suspicious / Quarantined categorical policy |
| 10 | Authentication and RBAC | JWT, scrypt credentials, opt-in demo passwords, four role profiles |
| 11 | Secure retrieval | Authoritative integrity verification, quarantine propagation, RBAC, rescanning and trust ranking |
| 12 | Evaluation | Synthetic component scenarios plus a small labeled detector corpus; still not a measured end-to-end RAG comparison |

## Completed review and hardening work

### Integrity, trust and persistence

- Added `backend/security/document_store.py` as the shared authoritative metadata/integrity layer. Retrieval verifies the stored file and retained signature without relying on a preceding document-list request.
- Integrity failures persist Quarantined status to metadata, ChromaDB and provenance. Missing authoritative evidence, legacy chunks without document IDs/digests, and modified chunk text fail closed.
- Signed-but-poisoned documents are quarantined; unsigned clean documents remain Suspicious and rank below Trusted documents.
- Prompt injection is classified through OpenRouter System One (`inception/mercury-decide:free`) using typed yes/no probabilities. Ingestion quarantines positive or unavailable scans; secure retrieval excludes positive or unavailable candidates in bounded batches. The current 0.5 cutoff is provisional until live development/holdout calibration succeeds. Document text is sent to OpenRouter.
- Knowledge-poisoning detection remains a separate rule-based signal. The detector no longer strips quoted warning examples from source text; it classifies their intent semantically.
- Neighbor anomaly checks compare claims with distinct semantically similar documents after authoritative file/signature and chunk-digest verification. Trusted sources are strong evidence; Suspicious sources are weak; Quarantined, missing, and integrity-failed sources cannot support a decision.
- Two independent Trusted sources with no conflicting Trusted neighbor can quarantine a contradiction. A lone or mixed contradiction becomes Suspicious. An incomplete neighbor check cannot promote ingestion to Trusted and blocks the candidate from secure retrieval. These checks remain heuristics, not complete protection.
- Metadata/provenance writes use atomic replacement and file locks. Corrupt JSON raises rather than silently returning an empty store. Upload failure cleanup attempts to remove indexed chunks/files.
- Ed25519 verification requires only the public key; incomplete/mismatched keypairs are not silently rotated. New private-key writes use mode 0600. Uploaded signatures are retained.
- Full UUID document IDs, classification validation and extraction/upload bounds are implemented. Multipart parsing precedes the copied-file cap, so deployments still need an upstream request-body limit.

### Authentication and authorization

- Data, dashboard, status, evaluation and identity APIs require valid JWTs. Baseline retrieval requires Admin/IT_Security at both API and shared-function boundaries.
- Document listing/details respect classification; upload classification cannot exceed the authenticated account's clearance. Uploader identity comes from the token.
- JWT header and expiry checks were tightened. `TRUSTRAG_JWT_SECRET` is required; there is no built-in signing-secret fallback in application code.
- Demo passwords are disabled by default and require `TRUSTRAG_DEMO_MODE=true`. Configured scrypt password hashes take precedence.
- The frontend uses explicit sign-in and sessionStorage and unmounts protected state on logout/401. The documented demo password constants are still compiled into the bundle for the 1-click demo login, now shown only when `GET /auth/demo-status` reports demo mode; treat them as public demo credentials, not secrets. Switching accounts means signing out and signing in, not using an automatic persona switcher.

### Frontend and provider behavior

- Documents supports classification and optional base64 signature inputs, shows actual trust status, and keys rows by document ID.
- `useApi` ignores stale request results and invalidates pending results on cleanup; it does not cancel the requests.
- Chat offers baseline only to privileged roles and displays pipeline traces returned with successful query responses.
- Secure chat scans the user's question with Mercury Decide before embedding or retrieval; positive or unavailable scans stop the secure request and produce a security trace. Baseline skips this query scan for controlled comparisons.
- Baseline comparison returns raw top-K retrieval chunks and uses a plain generation prompt without TrustRAG trust labels or secure-context guardrails. Secure mode keeps trust-aware filtering and context boundaries. Baseline is restricted to Admin/IT_Security and intended for synthetic demonstrations.
- In a recent manual attack-fixture comparison, Baseline surfaced the fixture's text in its answer while the model declined to follow its malicious instructions; TrustRAG returned an insufficient-context answer. That result alone does not prove which filtering step blocked the fixture; use the pipeline trace to confirm the retrieval reason.
- OpenRouter replaced the historical Zai provider. Key lookup is lazy; transient provider failures (rate limit/5xx/network) retry and return a labelled context fallback, while permanent 4xx errors fail fast with 502. A missing key returns 502 only when generation is reached; no eligible context returns 200 without calling the provider.
- Evaluation labels now distinguish check pass counts and `suite_duration_ms` from attack efficacy and RAG latency overhead. Status indicators distinguish configured/not-checked components from real probes.

### Latest review pass — October 15, 2026

A full read-through of the backend, frontend, tests and scripts (with the suite run as
evidence) found one failing test and several hardening/optimization gaps. All were fixed,
verified and committed (`1aae4cf`, pushed to `origin/master`).

- **Failing test:** `tests/test_audit.py` query-trace mocks did not accept the new `mode`
  argument. The suite now runs clean at **140 passed**, 1 warning.
- **Deletion clearance:** `delete_document` now requires clearance for the document's
  classification, not only an Admin/IT_Security role. An IT_Security user can no longer
  delete HR_CONFIDENTIAL data they cannot read.
- **Evaluation metric:** an unavailable injection classifier no longer counts as a successful
  detection. Fail-closed blocking still occurs, but `trustrag_passed` and the block-rate
  summary only credit a completed, positive scan.
- **Provider errors:** permanent client errors (non-429 4xx, e.g. an invalid key) fail fast and
  surface as 502 instead of retrying and returning a misleading "transient" fallback.
  Rate-limit/5xx/network errors still retry with linear backoff.
- **Retrieval performance:** neighbor verification is cached for the duration of one request
  and repeated neighbor texts are digested once per scan, instead of re-hashing the same
  files/text per chunk.
- **Context delimiters:** `build_secure_context` strips literal `<trusted_context>` /
  `</trusted_context>` from chunk text so content cannot close the untrusted-data block early.
- **Demo login gating:** new `GET /auth/demo-status`; the sign-in UI hides 1-click demo login
  unless demo mode is enabled. `login` is now a sync route so scrypt leaves the event loop.
- **Evaluation endpoint:** `/evaluation/run` is POST-only; the old GET variant triggered an
  external classifier call under safe/idempotent semantics.
- **Smaller fixes:** unsigned-and-poisoned trust score aligned to 0.0 with a consistent
  `poison_scan` shape, a double-checked vectorstore init lock, an unused import removed, a
  live model label in Chat, and unmount cleanup for the Documents upload timer.
- Stray root demo inputs (`inject.txt`, `poison.txt`, `salary.txt`, `p1.txt`, `policy.txt`,
  `policy_tampered.txt`) were moved to `data/demo_attacks/session_inputs/`.
- Intentionally unchanged: `document_store._propagate_quarantine` still re-asserts quarantine
  on every verification, which self-heals a previously failed ChromaDB write.

## Security audit telemetry present in the current checkout

- `backend/security/audit.py` stores structured upload/query events in `data/security_audit.sqlite3`, with file mode 0600. Current call sites omit question text, document content, tokens and secrets.
- Query responses include `request_id`, `pipeline_log`, `duration_ms` and `audit_recorded` after the instrumented pipeline runs. Validation/authentication failures are not comprehensive audited events.
- `GET /audit/events` requires Admin or IT_Security. It supports event/severity filters, a 1–100 limit and `before` cursor pagination.
- The seventh page, `/audit`, displays filtered recent events and expandable traces. The UI shows a next cursor but does not implement loading older pages.
- This SQLite log is mutable, not cryptographically tamper-evident or immutable. Audit persistence is best-effort and does not replace security enforcement. The UI's “tamper-resistant” wording should not be treated as a demonstrated guarantee.

## Local server recovery — September 17, 2026

Both development servers were found stopped/suspended (process state `T`). They were cleared and restarted in the background. Ctrl+Z was a possible cause, not established evidence. The recovery checks recorded:

- Backend `/health`: `{"status":"healthy"}`.
- Frontend at `http://localhost:5173`: HTTP 200.
- Demo login for `emp_user`: token returned successfully.

`TRUSTRAG_DEMO_MODE=true` was enabled in the private local `.env` for this demonstration. At that check, the OpenRouter key was empty; live generation was not verified. These are historical recovery results, not a guarantee the processes are still running. This documentation update did not restart services or change `.env`.

## Verification — October 15, 2026

The OpenRouter threshold calibration script is `scripts/evaluate_injection_detector.py`. Live evaluation selected `0.5101005014718472` by development-set F1, choosing the lower threshold when scores tie to favor recall. On the separate six-case synthetic holdout, Mercury Decide produced 3 TP, 0 FP, 3 TN and 0 FN. Per-case scores and limits are recorded in [the evaluation report](docs/evaluations/2026-10-15-mercury-decide-injection-evaluation.md). The corpus is small and curated, so this is only an initial result, not a general performance claim. Offline contract and integration tests use mocked responses, not real model predictions.

Focused detector, trust-engine, ingestion, retrieval, evaluation and labeled-corpus tests pass, and the full suite completes: **140 passed**, 1 warning (Starlette TestClient/httpx deprecation). Frontend build and lint pass.

## Remaining work and limitations

- Grow the labeled corpus with independently sourced attack and benign documents; measure real EmbeddingGemma/Chroma behavior, false positives/negatives, and secure-versus-baseline answer outcomes and latency.
- Production controls remain outside this prototype: TLS, request/rate limits, identity lifecycle/revocation, retention/backups, external-provider data policy and stronger audit integrity.
- Plain digests and mutable stores assume trusted administrators; provenance is not a separate per-query authorization check. Cross-store writes are not one transaction.
- Re-ingest legacy documents that lack verification evidence; no automatic migration or deletion was performed.
- Historical external credential exposure was recorded, but revocation cannot be established from this checkout.

See [README.md](README.md) for operation, [PROJECT_REPORT.md](PROJECT_REPORT.md) for the academic scope, and [TRUSTRAG_PROJECT_CONTEXT.md](TRUSTRAG_PROJECT_CONTEXT.md) for the current handoff plus preserved history.

## Bounded optimization pass — September 17, 2026

- Replaced eager page imports with React lazy routes and a Suspense loading status.
  Initial JavaScript fell from 296.11 to 241.79 kB (**18.34%**); Vite-reported gzip
  fell from 86.92 to 77.58 kB (**10.75%**). All seven route chunks were emitted and
  referenced dynamically, not loaded directly by the entry HTML. Total application
  code is split, not eliminated; this is download-size evidence, not browser timing.
- Unsigned ingestion no longer reads/allocates the full binary file for unused signature
  verification. A regression test failed before the change (one unnecessary binary open)
  and passes after it (zero). The signed control still reads once and verifies Trusted;
  unsigned SHA-256 and Suspicious status are preserved. Hashing and scanning were not cached.
- Full verification: 68 passed, one existing dependency warning; build/lint passed.
  No dependencies added, no credentials changed, no runtime data migrated. Ports 8000
  and 5173 remained closed. No browser or live provider timing claim is made.

## Pipeline profiling and metadata batching — September 17, 2026

Profiled real local embedding, ingestion, temporary persistent ChromaDB, JSON persistence,
audit operations, secure retrieval, document listing and query execution with stubbed LLM
output. See [PERFORMANCE.md](PERFORMANCE.md) and [performance_results.json](performance_results.json).
The repeatable command is `PYTHONPATH=. .venv/bin/python scripts/profile_pipeline.py`.

The main bottleneck was parsing a 1,000-document metadata store once per candidate document.
Batch verification reduces that from 150 reads to one for 150 candidates, while retaining
fresh hashes/signature checks and quarantine propagation. Listing now takes two store reads
(one authorization snapshot, one verification snapshot), independent of visible-document count.
The regression test covers four documents, subsequent tampering and listing read counts.

Baseline secure retrieval was 394.59 ms; three optimized runs measured 89.91, 51.90 and
32.81 ms. Stubbed-generation query medians were 584.30 ms before and 274.23, 259.85 and
151.51 ms after. Machine-load variance is substantial; these are synthetic observations,
not latency guarantees. The final listing median was 56.06 ms for 1,000 short documents.
Final full verification: 68 tests passed, one dependency warning; build/lint/diff checks pass.
Servers remain stopped. No live external generation, concurrency or browser timing claim.
