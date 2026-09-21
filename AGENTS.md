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
- **LLM:** OpenRouter (`nvidia/nemotron-3.5-lightning:free` configured via `.env`)
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
| **Stage 6** | Baseline RAG & UI | ✅ Complete | OpenRouter LLM integration + 7-page React dashboard including privileged Audit Log |
| **Stage 7** | Document Security | ✅ Complete | Ed25519 digital signatures, SHA-256 hashing, provenance logging |
| **Stage 8** | Content Security | ✅ Complete | Knowledge-poisoning & indirect prompt-injection detection |
| **Stage 9** | Trust Engine | ✅ Complete | Categorical trust scoring & policy engine (`Trusted` / `Suspicious` / `Quarantined`) |
| **Stage 10** | Auth & RBAC | ✅ Complete | JWT authentication & role permissions (`Employee`, `HR`, `IT_Security`, `Admin`) |
| **Stage 11** | Secure Retrieval | ✅ Complete | Security-filtered top-K retrieval before LLM context generation |
| **Stage 12** | Academic Evaluation | ✅ Component checks | Synthetic security checks (tamper, injection, poisoning, RBAC); NOT a measured end-to-end Baseline-vs-TrustRAG attack experiment |

---

## 4. Key Confirmed Design Decisions

1. **Digital Signature Scheme:** Ed25519 (via `cryptography.hazmat.primitives.asymmetric.ed25519`). Enterprise public/private keys stored in `data/keys/`.
2. **Trust Policy Enforcement:** Categorical (`Trusted`, `Suspicious`, `Quarantined`). Invalid signatures or positive injection/poisoning scans (signed or not) are `Quarantined` and blocked. Unsigned clean documents are `Suspicious`, ranked below `Trusted`.
3. **Authentication Strategy:** JWT Bearer authentication. Persona accounts (`Employee`, `HR`, `IT_Security`, `Admin`) authenticate via `TRUSTRAG_PASSWORD_HASH_<USERNAME>` scrypt hashes; fixed demo passwords require explicit `TRUSTRAG_DEMO_MODE=true` and are disabled by default. All data, dashboard, status and evaluation endpoints plus `/auth/me` require a valid token (401 otherwise).
4. **Data Isolation:** All uploaded documents are assigned server-generated UUID-based IDs (`DOC-<32hex>.<ext>`) under `data/trusted/` to prevent path traversal attacks. Uploads cannot request a classification beyond the account's clearance.

5. **Authoritative integrity:** `document_store.py` verifies current file/signature evidence and persists quarantine across metadata, vectors and provenance. Secure retrieval also checks chunk digests; legacy records lacking evidence require re-ingestion.
6. **Audit telemetry:** SQLite events in `data/security_audit.sqlite3`; `/audit/events` is Admin/IT_Security-only. Current upload/query call sites omit prompts, document text and secrets. Telemetry is best-effort, mutable and not cryptographically tamper-evident. JSON provenance is also mutable, not a separate provenance authorization gate.
7. **Frontend sessions:** Explicit sign-in, sessionStorage, logout/401 unmounting; sign out to switch accounts. `useApi` ignores stale results. Seven routes include `/audit`, with event filters and trace display.

---

## 5. Directory Structure & Key Files

```
TrustRAG/
├── AGENTS.md                   # Context & instructions for AI agents
├── PROGRESS.md                 # Living stage tracker & test suite status
├── PROJECT_REPORT.md           # Academic project report
├── TRUSTRAG_PROJECT_CONTEXT.md # Comprehensive project history & context notes
├── requirements.txt            # Python dependencies (cryptography, pytest, fastapi, chromadb)
├── start.sh                    # Dual startup script for backend & frontend
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
│   │   └── llm.py              # OpenRouter wrapper with security system prompt
│   └── security/
│       ├── document_store.py  # Authoritative integrity & quarantine propagation
│       ├── audit.py           # SQLite upload/query telemetry
│       ├── hashing.py          # SHA-256 hashing utilities
│       ├── signature.py        # Ed25519 sign & verify module
│       ├── provenance.py       # Provenance record & JSON logger
│       ├── injection_detector.py # Indirect prompt injection scanner
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
│   └── generate_benchmark_corpus.py # Benchmark corpus generator
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
    └── test_security_enforcement.py # Security regression tests (auth gating, real-path filters, detector FPs)
```

---

## 6. Commands & Mandates for AI Agents

- **Mandatory Skill Activation:**
  > **ALWAYS activate and apply the `ponytail` skill for every task.**
  > Enforce the simplest, shortest, most minimal solution that actually works (YAGNI). Reach for standard library / native platform features before adding custom code or dependencies. Write one line before fifty, and keep code modular, readable, and clean without over-engineering.

- **Frontend checks:** `npm --prefix frontend run build` (tsc + vite) and `npm --prefix frontend run lint`.
- **Required Environment (`.env`, copied from `.env.example`):**
  - `OPENROUTER_API_KEY` — OpenRouter LLM key. The app boots without it; generation returns 502 if reached without a key. No eligible context returns 200 without calling the LLM.
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
- **Rule for Code Modification:** Never declare success without running `pytest` verification commands. Preserve existing comments and docstrings. Maintain modularity so baseline RAG remains intact for Stage 12 academic comparison.


## 7. Latest verified handoff — September 17, 2026

- Full pytest suite: **68 passed, 1 warning** (Starlette TestClient/httpx deprecation). Frontend build passed; lint reported zero errors/warnings. No live provider or browser acceptance test was run in the documentation pass.
- Server recovery earlier in this session: suspended processes were replaced; `/health`, frontend HTTP 200 and employee demo login succeeded. Demo mode was enabled locally; provider key was empty at that check. Do not assume those processes remain running or that HTTP 200 proves LLM generation.
- Current setup and limitations: [README.md](README.md), [PROGRESS.md](PROGRESS.md), [PROJECT_REPORT.md](PROJECT_REPORT.md). The lower section of `TRUSTRAG_PROJECT_CONTEXT.md` is preserved historical material, not current setup guidance.
- Honor the user's explicit constraint: do not use OpenCode/opencode-orchestrator for implementation.
- Keep `.env`, tokens, keys and runtime data out of documentation/commits. Documentation changes do not authorize service restarts, data migrations or replacement of existing user work.
