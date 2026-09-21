# TrustRAG

A Secure Retrieval-Augmented Generation Framework for Defending Enterprise AI Systems Against Knowledge Poisoning, Prompt Injection, and Unauthorized Access.

> **Principle:** *The most semantically relevant document is not necessarily the safest document.*

## Overview

TrustRAG is an academic Information Security project that implements a RAG pipeline with
defense-in-depth security controls. Retrieval candidates are evaluated on relevance **and**
on signature validity, trust status, RBAC clearance, provenance, and content scans before
they ever reach the LLM.

**Status — September 17, 2026:** Stages 1–11 are implemented as an academic prototype.
Stage 12 provides four synthetic component checks, not a measured end-to-end
Baseline-versus-TrustRAG attack experiment. The current checkout also includes structured
security audit events and a seventh web page for privileged audit access.

Latest verification: **68 backend tests passed** (one dependency deprecation warning),
frontend build passed, and lint reported no warnings/errors. See [PROGRESS.md](PROGRESS.md)
for the implementation history and [PROJECT_REPORT.md](PROJECT_REPORT.md) for limitations.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.12, FastAPI, Uvicorn |
| Cryptography | Ed25519 signatures, SHA-256 digests (`cryptography`) |
| Auth | JWT (HS256) Bearer tokens + RBAC clearance levels |
| Embedding | EmbeddingGemma-300M (768-dim, local) |
| Vector DB | ChromaDB (cosine similarity) |
| LLM | OpenRouter (`nvidia/nemotron-3.5-lightning:free`) |
| Frontend | React 19, TypeScript (strict), Vite, Tailwind CSS |

## Quick Start

### Prerequisites

- Python 3.12, Node.js 20.19+ (or 22.12+), npm
- The `EmbeddingGemma-300M` model available locally (defaults to `~/AI-Models/embeddinggemma-300m`)

### Configure environment

On a new setup, copy the example file **only if `.env` does not already exist**, then
configure the JWT secret, account credentials and provider key. Never commit `.env`:

```bash
test -e .env || cp .env.example .env
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENROUTER_API_KEY` | Yes (for generation) | App boots without it; generation returns 502 if reached without a key. No eligible context returns 200 without an LLM call |
| `TRUSTRAG_JWT_SECRET` | Yes (for login) | JWT signing secret. Generate one: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `TRUSTRAG_DEMO_MODE` | No (`false`) | `true` enables the fixed demo passwords below. Without it, accounts authenticate via `TRUSTRAG_PASSWORD_HASH_<USERNAME>` scrypt hashes (format `salt_hex:hash_hex`) |
| `LLM_MODEL` | No | Defaults to `nvidia/nemotron-3.5-lightning:free` |
| `EMBEDDING_MODEL_PATH` | No | Defaults to `/home/pavan/AI-Models/embeddinggemma-300m` |
| `TRUSTRAG_ALLOWED_ORIGINS` | No | Comma-separated CORS origins; defaults to the Vite dev/build ports |

### One-Command Launch

```bash
./start.sh
```

Then open [http://localhost:5173](http://localhost:5173) in your browser. The launcher
expects an existing `.venv` and installed frontend dependencies; it is a development
process, not a persistent service. Keep its terminal running.

For a browser on another machine, configure `VITE_API_URL` in `frontend/.env.local`
to a browser-reachable backend address and allow the frontend origin with
`TRUSTRAG_ALLOWED_ORIGINS`. Vite has no backend proxy; localhost means the browser’s machine.

### Manual Setup

#### Backend

```bash
cd /home/pavan/TrustRAG
source .venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd /home/pavan/TrustRAG/frontend
npm install
npm run dev
```

## Authentication & Demo Personas

Protected endpoints require a valid JWT (see the table below). For a local demonstration,
set `TRUSTRAG_DEMO_MODE=true` in the backend `.env` and restart the backend. This is
not suitable for a shared/public deployment. Log in to obtain a token:

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

| Persona | Username | Demo password (only with `TRUSTRAG_DEMO_MODE=true`) | Role | Clearance |
|---------|----------|----------|------|-----------|
| Standard Employee | `emp_user` | `emp123` | Employee | PUBLIC, INTERNAL |
| HR Specialist | `hr_user` | `hr123` | HR | + HR_CONFIDENTIAL |
| IT Security Officer | `sec_admin` | `sec123` | IT_Security | + IT_SEC_CONFIDENTIAL |
| System Administrator | `admin` | `admin123` | Admin | + RESTRICTED |

Demo passwords are **disabled by default**; production-style setups set
`TRUSTRAG_PASSWORD_HASH_<USERNAME>` per account instead (uppercase username, e.g.
`TRUSTRAG_PASSWORD_HASH_ADMIN`). The web UI requires sign-in and contains no embedded
passwords. **Unfiltered "baseline" mode** (which disables all security filters for
academic comparison) is gated to `Admin` / `IT_Security` and is only shown to those roles.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | – | Project info |
| GET | `/health` | – | Health check |
| GET | `/dashboard/stats` | ✅ | Dashboard statistics |
| GET | `/status` | ✅ | System component health |
| POST | `/auth/login` | – | Exchange credentials for a JWT |
| GET | `/auth/me` | ✅ | Current user profile (401 without a valid token) |
| GET | `/auth/personas` | – | Persona list (no passwords) |
| POST | `/documents/upload` | ✅ | Upload and ingest a document; signature optional |
| GET | `/documents/` | ✅ | List authorized documents (+ integrity re-check) |
| GET | `/documents/{id}` | ✅ | Get document metadata |
| POST | `/query` | ✅ | Query the RAG pipeline (`secure` or `baseline` mode) |
| GET/POST | `/evaluation/run` | ✅ | Run synthetic component security checks (not end-to-end) |
| GET | `/audit/events` | Admin / IT_Security | Filtered security events with cursor pagination |

### Upload a Document

Sign the file first, then upload it with the signature:

```bash
# 1. Sign with the enterprise key (prints the base64 Ed25519 signature)
python scripts/generate_keys.py --sign your_document.pdf

# 2. Upload, pasting the printed signature into signature_b64
curl -X POST http://localhost:8000/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@your_document.pdf" \
  -F "access_level=INTERNAL" \
  -F "signature_b64=<PASTED_SIGNATURE>"
```

`access_level` is one of `PUBLIC`, `INTERNAL`, `HR_CONFIDENTIAL`, `IT_SEC_CONFIDENTIAL`,
`RESTRICTED`, must be within the uploader's clearance, and is enforced in document
listing/details and at retrieval time by the RBAC filter. `uploaded_by` is taken from the
authenticated token, not the request.

### Integrity & quarantine behavior

- Document metadata responses re-verify the stored file's SHA-256 (and Ed25519 signature
  for signed documents). A failure **persists** `Quarantined` into the metadata store,
  ChromaDB and the provenance log — not just the API response.
- Secure retrieval independently re-checks the authoritative record, current file
  integrity and the chunk's stored digests before use; missing or invalid evidence fails
  closed.
- Documents ingested before this change (no `document_id` on chunks, no retained
  signature) cannot pass verification; re-ingest them with the desired
  classification/signature.
- Signing is optional but recommended; unsigned clean documents are `Suspicious` and rank
  below `Trusted` ones. Signed-but-poisoned documents are quarantined like unsigned ones.

### Ask a Question

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"question": "What is the password rotation policy?", "top_k": 3, "mode": "secure"}'
```

## Supported File Types

- PDF, TXT, DOCX
- Maximum file size: **50MB**, enforced during streaming

## Project Structure

```
TrustRAG/
├── backend/
│   ├── main.py                 # FastAPI app entry point + CORS
│   ├── api/
│   │   ├── auth.py             # JWT login, /me, persona list
│   │   ├── documents.py        # Upload, listing, at-rest integrity re-check
│   │   ├── query.py            # Secure / baseline RAG query endpoint
│   │   ├── dashboard.py        # Dashboard stats and system status
│   │   ├── evaluation.py       # Synthetic component-check API
│   │   └── audit.py            # Privileged event-log API
│   ├── rag/
│   │   ├── ingestion.py        # Validation, hashing, signature verify, trust engine
│   │   ├── chunking.py         # Sentence-aware text chunking
│   │   ├── embedding.py        # EmbeddingGemma-300M integration
│   │   ├── vectorstore.py      # ChromaDB store (incl. security metadata)
│   │   ├── secure_retrieval.py # Quarantine + RBAC + injection filters, trust ranking
│   │   └── llm.py              # OpenRouter client with untrusted-context prompt
│   └── security/
│       ├── hashing.py          # SHA-256 digests
│       ├── signature.py        # Ed25519 sign / verify
│       ├── provenance.py       # Provenance audit log (atomic writes; NOT tamper-evident)
│       ├── document_store.py   # Authoritative metadata, integrity & quarantine propagation
│       ├── injection_detector.py
│       ├── poison_detector.py
│       ├── trust_engine.py     # Trusted / Suspicious / Quarantined policy engine
│       ├── auth.py             # JWT issuance, verification, RBAC
│       ├── evaluation.py       # Stage 12 component checks
│       └── audit.py            # SQLite security telemetry
├── frontend/src/pages/         # Dashboard, Documents, Chat, Evaluation, Audit, KB, Status
├── scripts/                    # Key generation & benchmark corpus tools
├── tests/                      # Isolated pytest suite, run with: PYTHONPATH=. .venv/bin/pytest tests/ -q
├── data/                       # Keys, vector DB, ingested docs, provenance log (gitignored)
└── start.sh                    # Development launcher
```

## Web Interface Pages

1. **Dashboard** — Overview with stats cards and pipeline visualization
2. **Documents** — Upload and manage documents with drag-and-drop
3. **RAG Chat** — Chat interface for querying the knowledge base (secure / baseline modes)
4. **Security Benchmark** — Synthetic component security checks (see methodology note on the page)
5. **Knowledge Base** — Browse authorized indexed documents and their metadata
6. **System Status** — Component status; configured/not-checked is not a live provider probe
7. **Audit Log** — Admin/IT_Security event/severity filters and expandable query traces

## Tests

```bash
PYTHONPATH=. .venv/bin/pytest tests/ -v
```

Covers hashing, Ed25519 sign/verify (public-key-only verification), provenance, ingestion
(valid/tampered/unsigned), both content detectors, the trust engine (including signed
poisoning), JWT auth & RBAC (including demo-password modes), API authentication boundaries
(dashboard/status/evaluation/documents/query), the full persona upload-clearance matrix,
baseline gating, bounded `top_k`, retrieval-time quarantine without a preceding listing,
chunk-digest mismatch and corrupt metadata. Tests isolate file stores, keys, provenance
and ChromaDB from real data. Audit tests cover event privacy at current call sites,
privileged access, filtering/pagination and persistence failure. The latest run passed
68 tests with one Starlette TestClient deprecation warning; it did not call OpenRouter.

Frontend checks:

```bash
npm --prefix frontend run build
npm --prefix frontend run lint
```

## Troubleshooting

### Backend won't start

- Ensure you're in the project root directory
- Ensure the virtual environment is activated: `source .venv/bin/activate`
- Check port 8000 is not in use: `lsof -i :8000`
- The app boots without `OPENROUTER_API_KEY`; generation returns 502 when reached without a key. A query with no eligible context returns 200 without calling the LLM.

### 401 Not authenticated

- `/query`, `/documents/*`, `/dashboard/stats`, `/status`, `/auth/me` and `/evaluation/run`
  require a JWT — log in via `/auth/login` (see above). `/audit/events` additionally requires Admin/IT_Security.
- `TRUSTRAG_JWT_SECRET` must be set in `.env`, or token signing fails closed

### 403 on baseline mode or upload

- Unfiltered `mode=baseline` is restricted to `Admin` / `IT_Security`
- Uploads cannot request an `access_level` beyond the account's clearance

### Frontend can't connect to backend

- Ensure both servers are running
- If `TRUSTRAG_ALLOWED_ORIGINS` is set, ensure it includes the frontend origin
- Verify backend is accessible: `curl http://localhost:8000/health`

### Upload fails

- Check file type is supported (PDF, TXT, DOCX)
- Check file size is under 50MB (enforced during upload, not just via Content-Length)
- Ensure the embedding model is available at the configured path

### Web page hangs or does not open

Check both endpoints with timeouts and inspect the actual process state before restarting:

```bash
curl --max-time 5 http://localhost:8000/health
curl --max-time 5 -I http://localhost:5173
ps -eo pid,stat,args | grep -E '[u]vicorn|[v]ite'
```

A `T` state means a stopped/suspended process. In its owning terminal, use `jobs -l`
and resume the correct job with `fg` or `bg`; Ctrl+Z suspends rather than terminates.
Inspect logs and port ownership before replacing a process. Vite may select another
port if 5173 is occupied; use the URL actually printed by Vite.

On September 17, stopped backend/Vite processes were cleared and restarted; backend
health, frontend HTTP 200 and employee demo login were verified. The local `.env`
was set to demo mode, and the provider key was empty at that check. This is a historical
recovery record, not a current uptime guarantee. Live chat generation was not verified.

### Provider and legacy-document behavior

- No eligible context: HTTP 200 with a no-authorized-documents response, no LLM call.
- Embedding/retrieval failure: HTTP 503. Missing key when generation is reached: HTTP 502.
- Provider HTTP/network/response failures: bounded retries followed normally by a labelled
  retrieved-context fallback (HTTP 200), not a generated model answer.
- Legacy records missing integrity evidence must be re-ingested; they are not silently
  migrated or promoted to Trusted.

## Audit telemetry and limitations

Upload/query instrumentation writes `data/security_audit.sqlite3` (mode 0600).
Query responses from the instrumented pipeline include `request_id`, `pipeline_log`,
`duration_ms` and `audit_recorded`. Current event call sites omit prompts, document
contents, tokens and secrets. This is not a comprehensive HTTP/login audit trail.

`GET /audit/events` accepts `limit` (1–100, default 50), `before` (sequence cursor),
`event_type` and `severity` (`info`, `warning`, `error`), returning newest-first `events`
and `next_cursor`. Only Admin/IT_Security can read it. The current UI displays the first
50 matching events and indicates a next cursor, but does not load older pages.

Both SQLite audit events and JSON document provenance are mutable, **not cryptographically
tamper-evident**. The audit page's “tamper-resistant” wording is not an established security
guarantee. Logging failures do not disable enforcement. Regex detectors, context delimiters
and fixed trust scores do not establish complete attack prevention. Authorized context
is sent to OpenRouter; operators must approve that external processing.

## Documentation map

- [PROGRESS.md](PROGRESS.md): completed changes, verification counts and remaining work.
- [PROJECT_REPORT.md](PROJECT_REPORT.md): academic architecture, threat model and limitations.
- [TRUSTRAG_PROJECT_CONTEXT.md](TRUSTRAG_PROJECT_CONTEXT.md): current handoff and archived history.
- [AGENTS.md](AGENTS.md): workspace instructions and implementation pointers.
- [frontend/README.md](frontend/README.md): frontend setup, routes and behavior.
