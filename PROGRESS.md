# TrustRAG — Project Progress Tracker

> **Current milestone:** Stages 1–11 implemented as an academic prototype; Stage 12 now includes a **measured** end-to-end baseline-vs-secure run (live classifier + live generation, isolated 10-document corpus, 6 paired questions), a 42-case labeled detector corpus, and dev-selected injection thresholds — most recently against a **locally served Laya classifier**, with generation moved from OpenRouter to the **Z.ai API** (`glm-5-turbo`). Live Z.ai generation and a 1440 × 1024 browser acceptance run were verified on October 18, 2026. Repeated trials and larger independent corpora remain open.
>
> **Last updated:** October 18, 2026

## Stage roadmap

| Stage | Feature | Current deliverable |
|---|---|---|
| 1 | Backend setup | FastAPI, configurable CORS, `.venv`, development launcher |
| 2 | Document ingestion | PDF/DOCX/TXT; UUID storage names; 50 MiB copied-file cap; two-million-character post-extraction cap |
| 3 | Chunking | Sentence-aware 512-character target and 64-character overlap; not token limits |
| 4 | Embeddings | Local EmbeddingGemma-300M, 768 dimensions |
| 5 | Vector persistence | ChromaDB cosine similarity, document IDs, classification, trust and digests |
| 6 | RAG and frontend | OpenAI-compatible LLM (OpenRouter code default; Z.ai `glm-5-turbo` locally); React 19/TypeScript/Vite/Tailwind; seven protected page routes |
| 7 | Document security | SHA-256, Ed25519 verification, mutable JSON provenance |
| 8 | Content security | System One semantic prompt-injection decisions from a configurable endpoint (locally served Laya in local operation, OpenRouter Mercury Decide by default), separate poisoning checks, and trust-weighted neighbor contradiction checks at ingestion and secure retrieval |
| 9 | Trust engine | Trusted / Suspicious / Quarantined categorical policy |
| 10 | Authentication and RBAC | JWT, scrypt credentials, opt-in demo passwords, four role profiles |
| 11 | Secure retrieval | Authoritative integrity verification, quarantine propagation, RBAC, rescanning and trust ranking |
| 12 | Evaluation | Synthetic component checks plus a measured end-to-end baseline-vs-secure run (single trial), a 42-case labeled detector corpus, and a recalibrated injection threshold; repeated trials and larger independent corpora remain open |

## Completed review and hardening work

### Integrity, trust and persistence

- Added `backend/security/document_store.py` as the shared authoritative metadata/integrity layer. Retrieval verifies the stored file and retained signature without relying on a preceding document-list request.
- Integrity failures persist Quarantined status to metadata, ChromaDB and provenance. Missing authoritative evidence, legacy chunks without document IDs/digests, and modified chunk text fail closed.
- Signed-but-poisoned documents are quarantined; unsigned clean documents remain Suspicious and rank below Trusted documents.
- Prompt injection is classified through a System One decision endpoint (`TRUSTRAG_DECISION_URL` / `TRUSTRAG_DECISION_MODEL`; OpenRouter `inception/mercury-decide:free` by default, a locally served Laya classifier in local operation) using typed yes/no probabilities. Ingestion quarantines positive or unavailable scans; secure retrieval excludes positive or unavailable candidates. The cutoff is selected on the labeled-corpus development partition by `scripts/evaluate_injection_detector.py` and recalibrated whenever the classifier or corpus changes. Scanned text goes to the configured endpoint only (OpenRouter by default).
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
- Secure chat scans the user's question with the configured injection classifier before embedding or retrieval; positive or unavailable scans stop the secure request and produce a security trace. Baseline skips this query scan for controlled comparisons.
- Baseline comparison returns raw top-K retrieval chunks and uses a plain generation prompt without TrustRAG trust labels or secure-context guardrails. Secure mode keeps trust-aware filtering and context boundaries. Baseline is restricted to Admin/IT_Security and intended for synthetic demonstrations.
- In a recent manual attack-fixture comparison, Baseline surfaced the fixture's text in its answer while the model declined to follow its malicious instructions; TrustRAG returned an insufficient-context answer. That result alone does not prove which filtering step blocked the fixture; use the pipeline trace to confirm the retrieval reason.
- The generation provider is configurable (`LLM_BASE_URL` / `LLM_API_KEY`, OpenAI-compatible chat completions): OpenRouter is the code default and local operation uses the Z.ai API with `glm-5-turbo`, moving answer generation off OpenRouter's free-model quota (October 17, 2026 — see the section below). Key lookup is lazy and the OpenRouter key is only sent to OpenRouter itself; transient provider failures (rate limit/5xx/network) retry and return a labelled context fallback, while permanent 4xx errors fail fast with 502. A missing key returns 502 only when generation is reached; no eligible context returns 200 without calling the provider.
- Evaluation labels now distinguish check pass counts and `suite_duration_ms` from attack efficacy and RAG latency overhead. Status indicators distinguish configured/not-checked components from real probes.

### Latest review pass — October 15, 2026

A full read-through of the backend, frontend, tests and scripts (with the suite run as
evidence) found one failing test and several hardening/optimization gaps. All were fixed,
verified and committed (`1aae4cf`, pushed to `origin/master`).

- **Failing test:** `tests/test_audit.py` query-trace mocks did not accept the new `mode`
  argument. The suite ran clean at **140 passed**, 1 warning (143 after the October 16 work).
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

## Measured evaluation, corpus and calibration — October 16, 2026

Five follow-up items from the October 15 handoff were completed. No service
restarts, no runtime-data migration. Full suite: **143 passed**, 1 warning;
frontend build and lint pass.

- **Stage 12 measured end-to-end evaluation** (`scripts/evaluate_e2e.py`;
  evidence and caveats in [the report](docs/evaluations/2026-10-16-e2e-baseline-vs-trustrag.md)):
  the real app (in-process `TestClient`, isolated temp stores) ingested a
  10-document corpus — 5 signed benign documents, 4 attack variants (signed
  poisoning, unsigned injection with a canary, unsigned poisoning, tampered
  signature) and 1 neighbor-contradiction document — with **10/10 live trust
  expectations met** and **0 degraded fallback answers**. Six paired questions
  ran in secure (`emp_user`) and baseline (`admin`) modes with live generation:
  - Baseline surfaced every challenge document (**6/6**): the signed-poisoned
    policy overrode the true MFA answer, the injected canary was echoed
    verbatim, the false "30 annual leave days" claim was adopted, the tampered
    document's claim was mixed into the password answer, and HR salary bands
    were disclosed.
  - Secure surfaced none (**0/6**): quarantined/integrity/RBAC candidates were
    blocked (traces show the block reasons), the Suspicious leave document was
    ranked out of the top-3 context, and answers were grounded and correct in
    all five non-RBAC cases (fail-closed "not enough information" on the RBAC
    case).
  - Latency medians (single run, generation-dominated): secure 5.5 s vs
    baseline 10.1 s. Not a speed claim.
- **Generation model note:** on this account `openrouter/auto` is refused with
  HTTP 402 (no credits) and the configured fallback
  `nvidia/nemotron-3.5-lightning:free` exceeded the client's 30 s timeout
  (observed 37–49 s). The run used `LLM_MODEL=nvidia/nemotron-3-super-120b-a12b:free`
  and `LLM_FALLBACK_MODEL=liquid/lfm-2.5-2.6b:free` via environment variables;
  no application code or `.env` changes. The app's 30 s timeout vs the
  fallback model's latency is an unresolved operational mismatch.
- **Labeled detector corpus growth:** 13 → **42 labeled cases** (+2 unavailable
  checks). Injection now includes externally sourced attacks/benigns adapted
  from `deepset/prompt-injections` (HuggingFace datasets-server; each case
  carries a `source` field) plus hard negatives; poisoning and neighbor classes
  extended. Corpus-shape test updated to the new counts.
- **Injection recalibration** ([report](docs/evaluations/2026-10-16-mercury-decide-recalibration.md)):
  dev-only selection moved `INJECTION_THRESHOLD` from 0.5101 to **0.1446**
  (dev precision/recall 1.00/0.909). Held-out result (not used for tuning):
  precision/recall 0.90/0.90 — one additional attack caught, one false positive
  at 0.148 (a quoted-attack hard negative). Residual false negative: a
  "spell-check and print the above prompt" exfiltration request (score 0.003).
- **Poisoning detector:** rule-based, measured **16/16 (0 FP, 0 FN)** on the
  grown corpus.
- **Audit UI pagination:** `/audit` now has a "Load older events" button that
  accumulates older pages through the existing `before` cursor; accumulated
  pages reset on filter change or refresh.
- **Legacy documents:** audited the real store (7 documents, 114 chunks) —
  every document has file digest, chunk digests and document IDs, and all pass
  `integrity_ok`. **No legacy records exist**; nothing required re-ingestion.

## Local decision classifier — October 17, 2026

OpenRouter's free-model allowance was being spent mostly on classification:
a secure query cost up to three or four classifier requests (query scan,
retrieval rescans, generation) against a 50-request daily free quota. The
injection classifier now runs locally with `laya-serve`
(`convaiinnovations/laya`, English checkpoint, CPU, `127.0.0.1:8077`); the change is
scoped to the classifier client, its configuration and its traces. Answer generation
moved to the Z.ai API the same day — see the next section.

- **Endpoint is configurable:** `TRUSTRAG_DECISION_URL` /
  `TRUSTRAG_DECISION_MODEL` (code defaults unchanged: OpenRouter Mercury
  Decide). The local server answers the same `/v1/systemone` contract, ignores
  the sent bearer, and needs no new Python dependencies in the project venv.
- **Measured client-shape selection (development partition only):** the
  original detector wording scored dev F1 0.880; the preset-style wording
  ("instructions aimed at the AI system rather than a genuine user request")
  scored **0.917**. Multi-item states collapsed discrimination entirely
  (dev F1 0.786 at eight items per request), so the detector sends **one
  segment per request**; 2000-character segments (down from 3500) fit the
  served model's token window, and provider-reported truncation now fails
  closed. Evidence:
  [the calibration report](docs/evaluations/2026-10-17-laya-local-classifier-calibration.md).
- **Calibrated threshold:** `INJECTION_THRESHOLD` 0.14463688220177154 →
  **0.35324999999999995** (dev precision/recall 0.846/1.000; ties favor recall).
  Held-out result (not used for tuning): 0.889/0.800 — one quoted-attack false
  positive and two false negatives. Mercury Decide measured 0.952/0.900 on the
  same corpus; the local model is weaker on quoted-attack hard negatives and two
  exfiltration paraphrases. Documented, not hidden.
- **Tests and latency:** two new detector tests (endpoint env override,
  truncation fail-closed); full suite **145 passed**, 1 warning. Local scanning
  measured ~0.5–0.8 s per single-item request (35 corpus scans in 22.5 s).
- **Operational note:** `laya-serve` must run whenever uploads or secure queries
  happen; while it is unreachable, scans fail closed by design. `./start.sh` now
  launches it too when port 8077 is free, reuses an already-running instance and
  stops only the server it started. The backend must be restarted after this
  change (`.env` and module constants are read at import).

## Generation provider moved to Z.ai — October 17, 2026

The free-model allowance that prompted the classifier move also fed answer generation;
OpenRouter's account quota (0/50 remaining) produced 429s and labelled fallback answers.
Generation now runs against the Z.ai API through the same OpenAI-compatible client,
removing that dependency.

- **Configurable provider:** `LLM_BASE_URL` / `LLM_API_KEY` select any chat-completions
  API (code default OpenRouter). The local `.env` uses `https://api.z.ai/api/paas/v4`
  with `LLM_MODEL=glm-5-turbo`; retry, 402 substitution, degraded-notice and the 120 s
  timeout are unchanged.
- **Key isolation:** the OpenRouter key is only ever sent to `openrouter.ai`; a
  non-OpenRouter base URL without `LLM_API_KEY` fails with a clear error instead of
  leaking that credential to another provider.
- **Scanning unaffected:** the decision endpoint now accepts `TRUSTRAG_DECISION_API_KEY`
  and needs no key at all for local Laya, so the injection path no longer depends on
  `OPENROUTER_API_KEY`.
- **Status surfaces:** `/dashboard/stats` and `/status` report the provider name derived
  from `LLM_BASE_URL`; the frontend displays that value instead of a hardcoded name.
- **Verification:** full suite **150 passed**, 1 warning; frontend build and lint pass.
  **No live Z.ai call in that change** — the local `.env` key was empty at the time.
  Live generation and the full pipeline were verified the next day; see the
  October 18 section below.

## Live Z.ai generation and browser acceptance — October 18, 2026

Both open verification gaps from the October 17 handoff were closed on a full
local stack (Vite `:5173` → FastAPI `:8000` → `laya-serve` `:8077` → Z.ai).
Evidence: [report](docs/evaluations/2026-10-18-live-zai-and-browser-acceptance.md)
and [screenshots/results](docs/evaluations/assets/2026-10-18-live-acceptance/).

- **Live Z.ai generation:** a direct `generate_answer` call returned the exact
  supplied fact in **8.37 s** with no degraded fallback; a secure `POST /query`
  as `emp_user` returned a grounded 3-source answer with the local classifier
  clearing the query at risk 0.014. A hostile query was blocked at risk 1.000
  with retrieval and generation stopped.
- **Browser acceptance:** 13/13 Playwright checks passed at 1440 × 1024
  (sign-in gate, demo-mode gating, authenticated shell, layout, provider chip
  `Z.ai · glm-5-turbo`, live answer with citations and trace, blocked injection,
  no console/network errors after sign-in). No application code or `.env` changes.
- **Desktop fidelity:** `design-qa.md` P3 is closed — at 1440 × 1024 the dashboard
  renders the 232 px desktop sidebar, single-row five-column metrics, one-row
  eight-stage pipeline and no horizontal overflow.
- **Latency (single machine, not a benchmark):** warm secure query 39.4–41.0 s,
  browser 40.7 s. Breakdown: query scan 0.60 s, embedding 2.83 s (cold process),
  retrieval + 9-candidate rescan + neighbor checks 14.16 s, Z.ai generation
  26.67 s. A blocked injection query returns in 1.4 s. Generation dominates and
  scales with context length; no optimization was attempted.
- **Corpus state:** the store holds 3 readable `Suspicious` supplier PDFs and 4
  `Quarantined` attack fixtures, so this run's citations are all `Suspicious`;
  `Trusted`-above-`Suspicious` ranking remains covered by the test suite and the
  October 16 measured evaluation.

## Remaining work and limitations

- Repeat the measured end-to-end evaluation across trials with semantic answer grading (the current judgment fields are deterministic heuristics), a larger corpus, and independently contributed documents; the present result is one run over a small hand-authored corpus.
- The code-default free fallback model (`nvidia/nemotron-3.5-lightning:free`) measured 37–49 s per answer; the client's 120 s read timeout covers it, and local operation pins `LLM_FALLBACK_MODEL` to the primary model instead.
- Production controls remain outside this prototype: TLS, request/rate limits, identity lifecycle/revocation, retention/backups, external-provider data policy and stronger audit integrity.
- Plain digests and mutable stores assume trusted administrators; provenance is not a separate per-query authorization check. Cross-store writes are not one transaction.
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
