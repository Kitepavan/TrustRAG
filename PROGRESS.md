# TrustRAG — Project Progress Tracker

> **Current milestone:** Stages 1–11 implemented as an academic prototype; Stage 12 synthetic component checks implemented. End-to-end comparative evaluation remains open.
>
> **Last updated:** September 17, 2026

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
| 8 | Content security | Regex-based injection and poisoning checks at ingestion and retrieval |
| 9 | Trust engine | Trusted / Suspicious / Quarantined categorical policy |
| 10 | Authentication and RBAC | JWT, scrypt credentials, opt-in demo passwords, four role profiles |
| 11 | Secure retrieval | Authoritative integrity verification, quarantine propagation, RBAC, rescanning and trust ranking |
| 12 | Evaluation | Four synthetic component scenarios; assumed unfiltered baseline outcomes, not a measured end-to-end comparison |

## Completed review and hardening work

### Integrity, trust and persistence

- Added `backend/security/document_store.py` as the shared authoritative metadata/integrity layer. Retrieval verifies the stored file and retained signature without relying on a preceding document-list request.
- Integrity failures persist Quarantined status to metadata, ChromaDB and provenance. Missing authoritative evidence, legacy chunks without document IDs/digests, and modified chunk text fail closed.
- Signed-but-poisoned documents are quarantined; unsigned clean documents remain Suspicious and rank below Trusted documents.
- Added per-chunk text digests and retrieval-time poisoning scans alongside injection scans. Corrected detector patterns and added false-positive/regression coverage; these remain heuristics, not complete protection.
- Metadata/provenance writes use atomic replacement and file locks. Corrupt JSON raises rather than silently returning an empty store. Upload failure cleanup attempts to remove indexed chunks/files.
- Ed25519 verification requires only the public key; incomplete/mismatched keypairs are not silently rotated. New private-key writes use mode 0600. Uploaded signatures are retained.
- Full UUID document IDs, classification validation and extraction/upload bounds are implemented. Multipart parsing precedes the copied-file cap, so deployments still need an upstream request-body limit.

### Authentication and authorization

- Data, dashboard, status, evaluation and identity APIs require valid JWTs. Baseline retrieval requires Admin/IT_Security at both API and shared-function boundaries.
- Document listing/details respect classification; upload classification cannot exceed the authenticated account's clearance. Uploader identity comes from the token.
- JWT header and expiry checks were tightened. `TRUSTRAG_JWT_SECRET` is required; there is no built-in signing-secret fallback in application code.
- Demo passwords are disabled by default and require `TRUSTRAG_DEMO_MODE=true`. Configured scrypt password hashes take precedence.
- The frontend uses explicit sign-in and sessionStorage, contains no embedded passwords, and unmounts protected state on logout/401. Switching accounts means signing out and signing in, not using an automatic persona switcher.

### Frontend and provider behavior

- Documents supports classification and optional base64 signature inputs, shows actual trust status, and keys rows by document ID.
- `useApi` ignores stale request results and invalidates pending results on cleanup; it does not cancel the requests.
- Chat offers baseline only to privileged roles and displays pipeline traces returned with successful query responses.
- OpenRouter replaced the historical Zai provider. Key lookup is lazy; provider failures normally retry and return a labelled context fallback. A missing key returns 502 only when generation is reached; no eligible context returns 200 without calling the provider.
- Evaluation labels now distinguish check pass counts and `suite_duration_ms` from attack efficacy and RAG latency overhead. Status indicators distinguish configured/not-checked components from real probes.

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

## Verification — September 17, 2026

Fresh commands run during this documentation update:

```bash
PYTHONPATH=. .venv/bin/pytest tests/ -q
npm --prefix frontend run build
npm --prefix frontend run lint
```

**Result: 68 passed, 1 warning in 12.39s.** Build passed; lint reported 0 warnings and 0 errors. The backend warning is a Starlette TestClient deprecation concerning httpx; no dependency change was made.

| Test module | Cases | Coverage |
|---|---:|---|
| `test_document_security.py` | 6 | Hashing, signing, provenance, ingestion |
| `test_documents_api.py` | 1 | Authenticated signed upload/list |
| `test_content_security.py` | 2 | Injection and poisoning detection |
| `test_trust_engine.py` | 3 | Categorical trust decisions |
| `test_auth_rbac.py` | 3 | JWT, clearance, demo-password modes |
| `test_secure_retrieval.py` | 2 | Filtering, baseline gate, context wrapping |
| `test_evaluation.py` | 1 | Synthetic component suite |
| `test_security_enforcement.py` | 13 | Auth, bounded inputs, RBAC and detector regressions |
| `test_api_auth_boundary.py` | 20 | Missing/invalid/expired/valid tokens on protected endpoints |
| `test_integrity_enforcement.py` | 12 | Quarantine propagation, role matrix, missing evidence and corrupt metadata |
| `test_audit.py` | 5 | Trace/privacy checks, role gating, pagination/filtering, failure behavior |
| **Total** | **68** | **All passed** |

Tests isolate runtime stores, keys, provenance, audit storage and ChromaDB. Live OpenRouter generation and browser GUI acceptance were not tested in this documentation pass. The prior 60-test checkpoint is superseded by this run.

## Remaining work and limitations

- Measure end-to-end baseline versus secure retrieval/answer outcomes on a broader held-out corpus, including false positives/negatives and latency.
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
