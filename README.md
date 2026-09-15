# TrustRAG

A Secure Retrieval-Augmented Generation Framework for Defending Enterprise AI Systems Against Knowledge Poisoning, Prompt Injection, and Unauthorized Access.

> **Principle:** *The most semantically relevant document is not necessarily the safest document.*

## Overview

TrustRAG is an academic Information Security project that implements a RAG pipeline with
defense-in-depth security controls. Retrieval candidates are evaluated on relevance **and**
on signature validity, trust status, RBAC clearance, provenance, and content scans before
they ever reach the LLM.

All 12 stages are complete: ingestion → chunking → embedding → vector store → baseline RAG &
UI → document security (Ed25519 + SHA-256 + provenance) → content security (poisoning &
injection detection) → trust engine → JWT auth & RBAC → secure retrieval → academic
evaluation benchmark.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.12, FastAPI, Uvicorn |
| Cryptography | Ed25519 signatures, SHA-256 digests (`cryptography`) |
| Auth | JWT (HS256) Bearer tokens + RBAC clearance levels |
| Embedding | EmbeddingGemma-300M (768-dim, local) |
| Vector DB | ChromaDB (cosine similarity) |
| LLM | Zai API (glm-4.7-flash) |
| Frontend | React 19, TypeScript (strict), Vite, Tailwind CSS |

## Quick Start

### Prerequisites

- Python 3.12, Node.js 18+, npm
- The `EmbeddingGemma-300M` model available locally (defaults to `~/AI-Models/embeddinggemma-300m`)

### Configure environment

Copy the example env file and fill in the two required secrets:

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `ZAI_API_KEY` | Yes (for Q&A) | Zai API key — without it the app still boots; only `/query` returns 502 |
| `TRUSTRAG_JWT_SECRET` | Yes (for login) | JWT signing secret. Generate one: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `ZAI_LLM_MODEL` | No | Defaults to `glm-4.7-flash` |
| `EMBEDDING_MODEL_PATH` | No | Defaults to `/home/pavan/AI-Models/embeddinggemma-300m` |
| `TRUSTRAG_ALLOWED_ORIGINS` | No | Comma-separated CORS origins; defaults to the Vite dev/build ports |

### One-Command Launch

```bash
./start.sh
```

Then open **http://localhost:5173** in your browser.

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

`/query` and `/documents/*` require a valid JWT. Log in to obtain one:

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

| Persona | Username | Password | Role | Clearance |
|---------|----------|----------|------|-----------|
| Standard Employee | `emp_user` | `emp123` | Employee | PUBLIC, INTERNAL |
| HR Specialist | `hr_user` | `hr123` | HR | + HR_CONFIDENTIAL |
| IT Security Officer | `sec_admin` | `sec123` | IT_Security | + IT_SEC_CONFIDENTIAL |
| System Administrator | `admin` | `admin123` | Admin | + RESTRICTED |

The web UI logs in as the Standard Employee automatically and offers a persona switcher in
the sidebar. **Unfiltered "baseline" mode** (which disables all security filters for
academic comparison) is gated to `Admin` / `IT_Security` and is only shown to those roles.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | – | Project info |
| GET | `/health` | – | Health check |
| GET | `/dashboard/stats` | – | Dashboard statistics |
| GET | `/status` | – | System component health |
| POST | `/auth/login` | – | Exchange credentials for a JWT |
| GET | `/auth/me` | – | Current user profile |
| GET | `/auth/personas` | – | Demo persona list (no passwords) |
| POST | `/documents/upload` | ✅ | Upload and ingest a signed document |
| GET | `/documents/` | ✅ | List all indexed documents (+ integrity re-check) |
| GET | `/documents/{id}` | ✅ | Get document metadata |
| POST | `/query` | ✅ | Query the RAG pipeline (`secure` or `baseline` mode) |
| GET | `/evaluation/run` | – | Run the Baseline-vs-TrustRAG security benchmark |

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
`RESTRICTED` and is enforced at retrieval time by the RBAC filter. `uploaded_by` is taken
from the authenticated token, not the request.

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
│   │   └── evaluation.py       # Security benchmark API
│   ├── rag/
│   │   ├── ingestion.py        # Validation, hashing, signature verify, trust engine
│   │   ├── chunking.py         # Sentence-aware text chunking
│   │   ├── embedding.py        # EmbeddingGemma-300M integration
│   │   ├── vectorstore.py      # ChromaDB store (incl. security metadata)
│   │   ├── secure_retrieval.py # Quarantine + RBAC + injection filters, trust ranking
│   │   └── llm.py              # Zai API client with untrusted-context prompt
│   └── security/
│       ├── hashing.py          # SHA-256 digests
│       ├── signature.py        # Ed25519 sign / verify
│       ├── provenance.py       # Tamper-evident provenance audit log
│       ├── injection_detector.py
│       ├── poison_detector.py
│       ├── trust_engine.py     # Trusted / Suspicious / Quarantined policy engine
│       ├── auth.py             # JWT issuance, verification, RBAC
│       └── evaluation.py       # Stage 12 attack benchmark
├── frontend/src/pages/         # Dashboard, Documents, Chat, Benchmark, KB, Status
├── scripts/                    # Key generation & benchmark corpus tools
├── tests/                      # 28 tests, run with: PYTHONPATH=. .venv/bin/pytest tests/ -v
├── data/                       # Keys, vector DB, ingested docs, provenance log (gitignored)
└── start.sh                    # Development launcher
```

## Web Interface Pages

1. **Dashboard** — Overview with stats cards and pipeline visualization
2. **Documents** — Upload and manage documents with drag-and-drop
3. **RAG Chat** — Chat interface for querying the knowledge base (secure / baseline modes)
4. **Security Benchmark** — Live Baseline-vs-TrustRAG attack evaluation results
5. **Knowledge Base** — Browse all indexed documents and their metadata
6. **System Status** — Real-time component health diagnostics

## Tests

```bash
PYTHONPATH=. .venv/bin/pytest tests/ -v
```

Covers hashing, Ed25519 sign/verify, provenance, ingestion (valid/tampered/unsigned),
both content detectors, the trust engine, JWT auth & RBAC, API enforcement
(anonymous rejection, baseline gating, bounded `top_k`), real-path retrieval filtering,
and the benchmark suite.

## Troubleshooting

### Backend won't start

- Ensure you're in the project root directory
- Ensure the virtual environment is activated: `source .venv/bin/activate`
- Check port 8000 is not in use: `lsof -i :8000`
- The app boots even without `ZAI_API_KEY`; only `/query` will return 502

### 401 Not authenticated

- `/query` and `/documents/*` require a JWT — log in via `/auth/login` (see above)
- `TRUSTRAG_JWT_SECRET` must be set in `.env`, or token signing fails closed

### 403 on baseline mode

- Unfiltered `mode=baseline` is restricted to `Admin` / `IT_Security`

### Frontend can't connect to backend

- Ensure both servers are running
- If `TRUSTRAG_ALLOWED_ORIGINS` is set, ensure it includes the frontend origin
- Verify backend is accessible: `curl http://localhost:8000/health`

### Upload fails

- Check file type is supported (PDF, TXT, DOCX)
- Check file size is under 50MB (enforced during upload, not just via Content-Length)
- Ensure the embedding model is available at the configured path
