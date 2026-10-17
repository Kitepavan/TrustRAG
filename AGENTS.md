# TrustRAG — Workspace Context & Instructions for AI Agents

> **Project Name:** TrustRAG (A Secure Retrieval-Augmented Generation Framework)  
> **Project Type:** Academic Information Security Engineering Project  
> **Repository Root:** `/home/pavan/TrustRAG`  
> **Primary Documentation:** [PROJECT_REPORT.md](file:///home/pavan/TrustRAG/PROJECT_REPORT.md) & [TRUSTRAG_PROJECT_CONTEXT.md](file:///home/pavan/TrustRAG/TRUSTRAG_PROJECT_CONTEXT.md)

---

## 1. Project Overview & Security Mission

TrustRAG is a **security-enhanced RAG framework** designed to defend enterprise AI systems when connecting Large Language Models (LLMs) to private documents.

**Core Question:** *How can a RAG system ensure that information retrieved by an LLM is authentic, trusted, authorized, traceable, and protected against knowledge poisoning and prompt injection?*

### Fundamental Principle
> **"The most semantically relevant document is not necessarily the safest document."**

TrustRAG evaluates retrieval candidates using:
$$\text{Retrieval Decision} = \text{Relevance} + \text{Trust Status} + \text{Authorization (RBAC)} + \text{Provenance} + \text{Security Checks}$$

---

## 2. Tech Stack & Environment

- **Backend:** Python 3.12, FastAPI, Uvicorn (Environment: `.venv`)
- **Document Extractors:** PyMuPDF (PDF), python-docx (DOCX), native TXT
- **Cryptography:** Python `cryptography` package (Ed25519 signatures, SHA-256 digests)
- **Embedding Model:** Google `EmbeddingGemma-300M` (local 768-dim vectors via SentenceTransformers)
- **Vector Database:** ChromaDB (`data/chroma_db/`, Cosine similarity)
- **LLM:** Any OpenAI-compatible chat-completions provider via `LLM_BASE_URL`/`LLM_API_KEY`; code default OpenRouter, local operation uses the Z.ai API (`https://api.z.ai/api/paas/v4`) with `LLM_MODEL=glm-5-turbo`. `LLM_FALLBACK_MODEL` (code default `nvidia/nemotron-3.5-lightning:free`) is substituted only when the primary model is refused with HTTP 402
- **Injection classifier:** System One `/v1/systemone` contract; endpoint configurable with `TRUSTRAG_DECISION_URL`/`TRUSTRAG_DECISION_MODEL` (default OpenRouter Mercury Decide; locally served Laya English checkpoint at `127.0.0.1:8077` in local operation)
- **Frontend:** React 19, TypeScript (strict), Vite, Tailwind CSS v4 (Cyber-Metric Security Dark Theme under `frontend/`)

---

## 3. Project Progress & Roadmap Status

| Stage | Feature | Status | Key Components |
|---|---|---|---|
| **Stage 1** | Project & Backend Setup | ✅ Complete | FastAPI app, CORS, directory layout, `./start.sh` |
| **Stage 2** | Document Ingestion | ✅ Complete | PDF/DOCX/TXT validation, size caps, path-traversal prevention |
| **Stage 3** | Text Chunking | ✅ Complete | Sentence-aware chunker (512 chars, 64 overlap) |
| **Stage 4** | Embedding Generation | ✅ Complete | EmbeddingGemma-300M 768-dim local execution |
| **Stage 5** | Vector Store Persistence | ✅ Complete | ChromaDB persistent store with chunk metadata |
| **Stage 6** | Baseline RAG & UI | ✅ Complete | OpenAI-compatible LLM integration (OpenRouter code default; Z.ai locally) + 7-page React dashboard including privileged Audit Log |
| **Stage 7** | Document Security | ✅ Complete | Ed25519 digital signatures, SHA-256 hashing, provenance logging |
| **Stage 8** | Content Security | ✅ Complete | Knowledge-poisoning & indirect prompt-injection detection |
| **Stage 9** | Trust Engine | ✅ Complete | Categorical trust scoring & policy engine (`Trusted` / `Suspicious` / `Quarantined`) |
| **Stage 10** | Auth & RBAC | ✅ Complete | JWT authentication & role permissions (`Employee`, `HR`, `IT_Security`, `Admin`) |
| **Stage 11** | Secure Retrieval | ✅ Complete | Security-filtered top-K retrieval before LLM context generation |
| **Stage 12** | Academic Evaluation | ✅ Component checks + measured E2E | Four synthetic component checks plus a single-trial measured Baseline-vs-TrustRAG end-to-end run (`scripts/evaluate_e2e.py`, 10-document corpus, live classifier and generation); repeat trials, semantic grading and larger corpora remain open |

---

## 4. Key Confirmed Design Decisions

1. **Digital Signature Scheme:** Ed25519 (via `cryptography.hazmat.primitives.asymmetric.ed25519`). Enterprise public/private keys stored in `data/keys/`.
2. **Trust Policy Enforcement:** Categorical (`Trusted`, `Suspicious`, `Quarantined`). Invalid signatures or positive injection/poisoning scans (signed or not) are `Quarantined` and blocked. Unsigned clean documents are `Suspicious`, ranked below `Trusted`.
3. **Authentication Strategy:** JWT Bearer authentication. Persona accounts (`Employee`, `HR`, `IT_Security`, `Admin`) authenticate via `TRUSTRAG_PASSWORD_HASH_<USERNAME>` scrypt hashes; fixed demo passwords require explicit `TRUSTRAG_DEMO_MODE=true` and are disabled by default. All data, dashboard, status and evaluation endpoints plus `/auth/me` require a valid token (401 otherwise).
4. **Data Isolation:** All uploaded documents are assigned server-generated UUID-based IDs (`DOC-<32hex>.<ext>`) under `data/trusted/` to prevent path traversal attacks. Uploads cannot request a classification beyond the account's clearance.

5. **Authoritative integrity:** `document_store.py` verifies current file/signature evidence and persists quarantine across metadata, vectors and provenance. Secure retrieval also checks chunk digests; legacy records lacking evidence require re-ingestion (the October 16, 2026 audit of the real store found none).
6. **Audit telemetry:** SQLite events in `data/security_audit.sqlite3`; `/audit/events` is Admin/IT_Security-only. Current upload/query call sites omit prompts, document text and secrets. Telemetry is best-effort, mutable and not cryptographically tamper-evident. JSON provenance is also mutable, not a separate provenance authorization gate.
7. **Frontend sessions:** Explicit sign-in, sessionStorage, logout/401 unmounting; sign out to switch accounts. `useApi` ignores stale results. Seven routes include `/audit`, with event filters, trace display and "Load older events" pagination.
8. **Injection classifier endpoint:** One System One client, two backends. Code defaults remain OpenRouter Mercury Decide; local operation runs `laya-serve` (`convaiinnovations/laya` English checkpoint, CPU, `127.0.0.1:8077`) with `TRUSTRAG_DECISION_*`. Client shape measured October 17, 2026: preset `prompt_injection` wording, one segment per request (multi-item states broke key-following), 2000-char segments (longer states truncate), truncation fails closed. `INJECTION_THRESHOLD = 0.35324999999999995` is development-partition-selected for that classifier and is classifier-specific: recalibrate via `scripts/evaluate_injection_detector.py` whenever the classifier or corpus changes.

---

## 5. Directory Structure & Key Files

```
TrustRAG/
├── AGENTS.md                   # Context & instructions for AI agents
├── PROGRESS.md                 # Living stage tracker & test suite status
├── PROJECT_REPORT.md           # Academic project report
├── TRUSTRAG_PROJECT_CONTEXT.md # Comprehensive project history & context notes
├── requirements.txt            # Python dependencies (cryptography, pytest, fastapi, chromadb)
├── start.sh                    # Launcher: classifier (if 8077 free) + backend + frontend
├── backend/
│   ├── main.py                 # FastAPI application root
│   ├── api/
│   │   ├── auth.py             # JWT Login & persona API
│   │   ├── documents.py        # Upload, listing, signature ingest, metadata API
│   │   ├── query.py            # Secure & baseline RAG query API
│   │   ├── dashboard.py        # Stats & system health API
│   │   ├── evaluation.py       # Synthetic component-check API
│   │   └── audit.py            # Privileged event-log API
│   ├── rag/
│   │   ├── ingestion.py        # Ingestion pipeline + Trust Engine integration
│   │   ├── chunking.py         # Chunker module
│   │   ├── embedding.py        # EmbeddingGemma model wrapper
│   │   ├── vectorstore.py      # ChromaDB interface (stores security metadata)
│   │   ├── secure_retrieval.py # Defense-in-depth top-K retrieval engine
│   │   └── llm.py              # OpenAI-compatible LLM wrapper with security system prompt
│   └── security/
│       ├── document_store.py  # Authoritative integrity & quarantine propagation
│       ├── audit.py           # SQLite upload/query telemetry
│       ├── hashing.py          # SHA-256 hashing utilities
│       ├── signature.py        # Ed25519 sign & verify module
│       ├── provenance.py       # Provenance record & JSON logger
│       ├── injection_detector.py # System One injection classifier client (Mercury Decide default; local Laya via env)
│       ├── poison_detector.py    # Knowledge poisoning detector
│       ├── trust_engine.py       # Multi-signal Trust Engine
│       ├── auth.py               # JWT authentication & RBAC clearance
│       └── evaluation.py         # Academic attack evaluation suite
├── data/
│   ├── keys/                   # Enterprise Ed25519 keys (enterprise_privkey.pem / enterprise_pubkey.pem)
│   ├── chroma_db/              # ChromaDB vector store directory
│   ├── trusted/                # Ingested file store & _metadata.json
│   ├── benchmark_corpus/       # Synthetic evaluation attack corpus
│   ├── security_audit.sqlite3 # Mutable security event store
│   └── provenance_log.json     # Document provenance audit log
├── scripts/
│   ├── generate_keys.py        # Key generator & file signing CLI tool
│   ├── generate_benchmark_corpus.py # Benchmark corpus generator
│   ├── evaluate_injection_detector.py # Live labeled-corpus threshold calibration
│   └── evaluate_e2e.py         # Measured Baseline-vs-TrustRAG end-to-end harness
└── tests/
    ├── conftest.py               # Test env, isolated stores/keys/ChromaDB, tmp cwd
    ├── test_audit.py          # Event access, privacy, pagination, persistence failure
    ├── test_api_auth_boundary.py # HTTP auth matrix for protected endpoints
    ├── test_integrity_enforcement.py # Quarantine propagation, digest checks, role matrix
    ├── test_document_security.py # Stage 7 unit tests
    ├── test_documents_api.py   # API integration tests (authenticated upload/list)
    ├── test_content_security.py  # Stage 8 unit tests
    ├── test_trust_engine.py    # Stage 9 unit tests
    ├── test_auth_rbac.py       # Stage 10 unit tests
    ├── test_secure_retrieval.py# Stage 11 unit tests
    ├── test_evaluation.py      # Stage 12 unit tests
    ├── test_e2e_harness.py     # Offline contract checks for the E2E harness helpers
    ├── test_detection_corpus.py # Labeled detector corpus shape/partition checks
    └── test_security_enforcement.py # Security regression tests (auth gating, real-path filters, detector FPs)
```

---

## 6. Commands & Mandates for AI Agents

- **Mandatory Skill Activation:**
  > **ALWAYS activate and apply the `ponytail` skill for every task.**
  > Enforce the simplest, shortest, most minimal solution that actually works (YAGNI). Reach for standard library / native platform features before adding custom code or dependencies. Write one line before fifty, and keep code modular, readable, and clean without over-engineering.

- **Frontend checks:** `npm --prefix frontend run build` (tsc + vite) and `npm --prefix frontend run lint`.
- **Required Environment (`.env`, copied from `.env.example`):**
  - `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` — generation provider config (any OpenAI-compatible API). Local `.env`: Z.ai `https://api.z.ai/api/paas/v4` + `glm-5-turbo`. The app boots without a key; generation returns 502 if reached without one. No eligible context returns 200 without calling the LLM.
  - `OPENROUTER_API_KEY` — historical default-provider key; only ever sent to openrouter.ai, and the decision-endpoint bearer fallback when `TRUSTRAG_DECISION_API_KEY` is unset.
  - `TRUSTRAG_JWT_SECRET` — JWT signing secret (generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"`). Login fails closed if unset. Tests set a fallback via `tests/conftest.py`.

- **Run Automated Tests:**
  ```bash
  PYTHONPATH=. .venv/bin/pytest tests/ -v
  ```
- **Generate Enterprise Keys:**
  ```bash
  .venv/bin/python scripts/generate_keys.py --gen-keys
  ```
- **Start Backend & Frontend Servers:**
  ```bash
  ./start.sh
  ```
- **Start the Local Injection Classifier (optional; required when `TRUSTRAG_DECISION_URL` points at it):**
  ```bash
  LAYA_HOST=127.0.0.1 LAYA_PORT=8077 LAYA_DEVICE=cpu LAYA_PRELOAD=1 LAYA_MODELS=english LAYA_DEFAULT_MODEL=english /home/pavan/AI-Models/laya/.venv/bin/laya-serve
  ```
  `./start.sh` starts it automatically when port 8077 is free (log: `/tmp/trustrag-laya-serve.log`), stops only the instance it started, and reuses an already-running one.
- **Rule for Code Modification:** Never declare success without running `pytest` verification commands. Preserve existing comments and docstrings. Maintain modularity so baseline RAG remains intact for Stage 12 academic comparison.


## 7. Latest verified handoff — October 17, 2026

- **Generation moved to Z.ai:** the OpenAI-compatible client now takes its provider from `LLM_BASE_URL`/`LLM_API_KEY`; the local `.env` uses `https://api.z.ai/api/paas/v4` with `glm-5-turbo`, so answer generation no longer depends on OpenRouter's free-model quota. The OpenRouter key is only ever sent to openrouter.ai, and injection scanning (local Laya) needs no key at all. `/dashboard/stats` and `/status` report the provider derived from the base URL. **Live verification pending:** the `.env` has no Z.ai key yet; paste one in and restart the backend (env is read at import).
- **Local injection classifier:** the System One client now has a configurable endpoint (`TRUSTRAG_DECISION_URL`/`TRUSTRAG_DECISION_MODEL`) and runs against a local `laya-serve` (`convaiinnovations/laya` English checkpoint, CPU, `127.0.0.1:8077`) in local operation, keeping scanning off OpenRouter's free-model quota. Measured on the labeled corpus: dev F1 0.917 (P 0.846 / R 1.000) at `INJECTION_THRESHOLD = 0.35324999999999995`; held-out (reporting only) 0.842. The client sends one 2000-char segment per request and fails closed on provider-reported truncation. Evidence: [docs/evaluations/2026-10-17-laya-local-classifier-calibration.md](docs/evaluations/2026-10-17-laya-local-classifier-calibration.md).
- Full pytest suite: **145 passed, 1 warning** (Starlette TestClient/httpx deprecation); verified October 17, 2026. Earlier commits: `1aae4cf` security-review fixes (deletion clearance, evaluation detection metric, LLM 4xx fail-fast, request-local verification cache, demo-status endpoint, POST-only `/evaluation/run`), `bc2712f` measured baseline-vs-secure end-to-end evaluation + detector recalibration, `c014f3a` 402→free-model fallback. Frontend build passed; lint reported zero errors/warnings; the frontend was untouched by the classifier change. The measured E2E run used a live classifier and a substituted free generation model; no browser acceptance test has run with the local classifier yet.
- The running backend must be restarted after the classifier change (`.env` and module constants are read at import). `laya-serve` must be running whenever uploads or secure queries happen; while it is unreachable, every scan fails closed by design.
- Server recovery (September 17, 2026): suspended processes were replaced; `/health`, frontend HTTP 200 and employee demo login succeeded. Demo mode was enabled locally; provider key was empty at that check. Do not assume those processes remain running or that HTTP 200 proves LLM generation.
- Current setup and limitations: [README.md](README.md), [PROGRESS.md](PROGRESS.md), [PROJECT_REPORT.md](PROJECT_REPORT.md). The lower section of `TRUSTRAG_PROJECT_CONTEXT.md` is preserved historical material, not current setup guidance.
- Honor the user's explicit constraint: do not use OpenCode/opencode-orchestrator for implementation.
- Keep `.env`, tokens, keys and runtime data out of documentation/commits. Documentation changes do not authorize service restarts, data migrations or replacement of existing user work.
