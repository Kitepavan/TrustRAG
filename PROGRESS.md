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
| 8 | Content security | Normalized regex injection/poisoning checks plus trust-weighted neighbor contradiction checks at ingestion and secure retrieval |
| 9 | Trust engine | Trusted / Suspicious / Quarantined categorical policy |
| 10 | Authentication and RBAC | JWT, scrypt credentials, opt-in demo passwords, four role profiles |
| 11 | Secure retrieval | Authoritative integrity verification, quarantine propagation, RBAC, rescanning and trust ranking |
| 12 | Evaluation | Synthetic component scenarios plus a small labeled detector corpus; still not a measured end-to-end RAG comparison |

## Completed review and hardening work

### Integrity, trust and persistence

- Added `backend/security/document_store.py` as the shared authoritative metadata/integrity layer. Retrieval verifies the stored file and retained signature without relying on a preceding document-list request.
- Integrity failures persist Quarantined status to metadata, ChromaDB and provenance. Missing authoritative evidence, legacy chunks without document IDs/digests, and modified chunk text fail closed.
- Signed-but-poisoned documents are quarantined; unsigned clean documents remain Suspicious and rank below Trusted documents.
- Direct injection and poisoning rules normalize Unicode compatibility characters, strip invisible format controls, and collapse whitespace before matching. Explicitly rejected quoted injection payloads are removed from indexed/retrieved context and mark the source Suspicious; nearby framing remains heuristic.
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

## Verification — October 15, 2026

Fresh checks in the isolated detection worktree:

```bash
PYTHONPATH=. .venv/bin/pytest tests/ -v
npm --prefix frontend run build
npm --prefix frontend run lint
```

**Result: 108 passed, 1 Starlette TestClient/httpx deprecation warning.** Frontend build passed and lint exited 0.

The new detector corpus reports these held-out results:

| Detector class | Cases | TP | FP | TN | FN | Precision | Recall | False-positive rate | Mean fixture latency |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Prompt injection | 4 | 3 | 0 | 1 | 0 | 100% | 100% | 0% | 0.070 ms |
| Known poisoning | 4 | 2 | 0 | 2 | 0 | 100% | 100% | 0% | 0.054 ms |
| Neighbor contradictions | 7 | 5 | 0 | 2 | 0 | 100% | 100% | 0% | 0.045 ms |

The fixture also confirms one unavailable neighbor check per partition. Those checks are reported separately and are not counted as detector negatives. Mean latency uses deterministic test doubles for embeddings and neighbor queries; it is not production or end-to-end retrieval latency. The held-out set is small and curated, so these percentages do not establish general attack-detection performance.

The full suite includes regression checks for normalization, benign rejected prose, sanitized quoted attack payloads, signed attacks, verified and deduplicated neighbors, trust weighting, integrity failures, cold start, unavailable checks, secure retrieval traces, and baseline-path compatibility. Live provider generation and browser GUI acceptance were not tested.

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
