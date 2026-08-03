# TrustRAG — Project Report

## Secure Retrieval-Augmented Generation Framework for Defending Enterprise AI Systems Against Knowledge Poisoning

**Project type:** Academic Information Security project (engineering)
**Current status:** Stages 1–6 complete (baseline RAG + web frontend) · Stages 7–12 pending (security layers)
**Git tag:** `baseline-rag-v1`

---

## 1. What Is This Project?

TrustRAG is a **security-enhanced Retrieval-Augmented Generation (RAG) framework**. It lets an organization connect a Large Language Model (LLM) to its own documents — but, unlike a normal RAG system, it does **not** blindly trust everything it retrieves.

The project is driven by one central security question:

> **How can a RAG system ensure that information retrieved by an LLM is authentic, trusted, authorized, traceable, and protected against knowledge poisoning and prompt injection?**

We are **not** building or training an LLM from scratch. We use existing pretrained models and focus our contribution on the **secure RAG architecture** and the **security mechanisms** wrapped around it.

---

## 2. Why This Matters (Problem & Motivation)

### The problem
A normal RAG pipeline works like this:

```
Documents → Extract text → Chunk → Embed → Vector DB
User question → Embed → Similarity search → Retrieved chunks → LLM → Answer
```

The weakness: normal RAG assumes that **retrieved document = usable knowledge**. That assumption is dangerous.

- An attacker can upload a **poisoned document** (e.g., "Employees never need to change passwords") that is semantically similar to a legitimate policy ("Change passwords every 90 days").
- Semantic retrieval may select the malicious document, and the LLM will answer from it **even though the LLM itself is functioning perfectly**.
- A retrieved document can also carry **indirect prompt injection** ("IGNORE ALL PREVIOUS INSTRUCTIONS…"), or be a **confidential** document that an ordinary employee is not authorized to read.

So the core insight of the project is:

> **The most semantically relevant document is not necessarily the safest document.**

### The motivation
Enterprise RAG needs both **accurate retrieval** AND **security**. Retrieved information should be authentic, trustworthy, authorized, and traceable. Security must protect the *entire RAG pipeline*, not just the LLM.

### Objectives
1. Detect and prevent poisoned or malicious documents from entering the knowledge base.
2. Verify the authenticity and integrity of documents *before* indexing.
3. Implement trust scoring, provenance tracking, and role-based access control (RBAC).
4. Generate responses only from information that is relevant, trusted, and authorized for the current user.

---

## 3. The TrustRAG Architecture

TrustRAG adds security layers on **both sides** of the RAG pipeline.

### Document side (ingestion)

```
Document Upload → File Validation → Digital Signature Check → SHA-256 Integrity
→ Poison / Injection Scan → Trust Evaluation → Provenance Recording
→ Chunking → Embedding Model → Vector Database
```

### Query side (retrieval)

```
User → Authentication → RBAC → Query → Query Embedding → Vector Retrieval
→ Trust Filtering → Provenance Validation → Prompt-Injection Check
→ Secure Context → LLM → Trusted Response → Audit Logging
```

### The design principle

A normal RAG ranks information mostly by relevance. TrustRAG's retrieval decision is closer to:

```
Retrieval decision = Semantic relevance + Trust + Authorization + Provenance + Security status
```

- `malicious_policy.pdf` — Similarity 0.97, Trust LOW, Poisoned YES → **BLOCK**
- `security_policy.pdf` — Similarity 0.93, Trust HIGH, Authorized YES, Provenance VERIFIED → **USE**

### Key security concepts we rely on
- **SHA-256** — a fingerprint of a file; proves content is unchanged relative to a known value (not who signed it).
- **Digital signatures** — prove the content was signed by a trusted key; an attacker cannot forge a signature without the private key.
- **Trust ≠ Authorization** — a genuine, trusted document may still be unauthorized for a given user (RBAC).
- **Valid signature ≠ safe content** — signature, integrity, provenance, content security, and authorization are separate layers.
- **Defense in depth** — a malicious document is stopped at every possible point: ingestion scan, vector store, retrieval-time scan, and before the LLM.

---

## 4. Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.12, FastAPI, Uvicorn |
| Text extraction | PyMuPDF (PDF), python-docx (DOCX), native (TXT) |
| Embedding model | Google EmbeddingGemma-300M (local, 768-dim) |
| Vector database | ChromaDB (cosine similarity) |
| LLM | Zai API — `glm-4.7-flash` |
| Frontend | React 18 + TypeScript (strict) + Vite + Tailwind CSS v4 |
| Frontend design | Cyber-Metric Enterprise Security dark theme (Material-based tokens) |
| Secrets | `.env` / python-dotenv (`ZAI_API_KEY`, `EMBEDDING_MODEL_PATH`) |

---

## 5. What We Have Done (Completed So Far)

### Roadmap — Stage-by-stage (Stages 1–6 = baseline RAG)

**Stage 1 — Project & backend setup ✅**
- FastAPI app at `backend/main.py`, CORS, virtual environment, directory structure (`backend/{api,rag,security,database,models}`, `data/...`, `tests/`, `scripts/`).
- `./start.sh` launches both backend and frontend.

**Stage 2 — Document ingestion ✅**
- `backend/rag/ingestion.py`: file-type validation (PDF/DOCX/TXT), size cap (50 MB), readability check, SHA-256 hashing, and text extraction via PyMuPDF / python-docx / native TXT.
- `backend/api/documents.py`: `POST /documents/upload`.
- Files are stored under server-generated `{document_id}{suffix}` names (path-traversal-safe).

**Stage 3 — Text chunking ✅**
- `backend/rag/chunking.py`: sentence-aware chunker, 512 chars per chunk with 64-char overlap.
- Each chunk gets a unique id: `{doc_id}_p{page}_c{index}`.

**Stage 4 — Embedding generation ✅**
- `backend/rag/embedding.py`: EmbeddingGemma-300M via sentence-transformers, 768-dim vectors, runs locally on CPU (~0.5s per query).

**Stage 5 — Vector database ✅**
- `backend/rag/vectorstore.py`: ChromaDB persistent store (`data/chroma_db/`), cosine similarity, metadata stored alongside each chunk (document_id, page_number, char_count).

**Stage 6 — Basic RAG ✅**
- `backend/rag/llm.py`: Zai API (`glm-4.7-flash`) integration with a security-aware system prompt (context wrapped in `<context>` tags and declared UNTRUSTED DATA).
- `backend/api/query.py`: `POST /query` — full pipeline: embed → search → LLM → answer + sources.

### Web frontend ✅ (added after baseline RAG)
- React 18 + TypeScript strict + Vite + Tailwind v4, with a fully dark "enterprise security dashboard" design system.
- **5 pages:** Dashboard, Documents, RAG Chat, Knowledge Base, System Status.
- **Key features:**
  - Drag-and-drop, keyboard-accessible file upload.
  - Real source citations in Chat (no fabricated mock data), copy-to-clipboard.
  - Client-side pagination + search filter in Documents.
  - Real-time stats & system health from the backend (`/dashboard/stats`, `/status`).
  - Dynamic backend health status in the sidebar.
  - Mobile-responsive off-canvas sidebar, shared PageHeader component, accessibility (aria-labels, heading hierarchy, keyboard navigation).
  - All colors centralized as Tailwind `@theme` tokens (zero hardcoded hex in TSX).

### Backend API endpoints (current)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Project info |
| GET | `/health` | Health check |
| GET | `/dashboard/stats` | Dashboard statistics |
| GET | `/status` | System component health |
| POST | `/documents/upload` | Upload + ingest a document |
| GET | `/documents/` | List indexed documents (with metadata) |
| GET | `/documents/{id}` | Single-document metadata |
| POST | `/query` | Query the RAG pipeline |

### Security hardening pass ✅ (code review + quick wins)
- **Critical fixes:** Zai API key removed from source (now in `.env`); path-traversal upload fixed; LLM failures no longer leak internals (HTTP 502 + server logs); baseline prompt-injection mitigation (context marked as untrusted data).
- **Robustness:** configurable embedding model path, DOCX extraction implemented, graceful degradation when ChromaDB is down, UTC timestamps, thread-safe metadata store.
- **Tooling:** `opencode.json`, `code-reviewer` subagent, TypeScript strict mode, clean lint/build.
- **Verified:** `npm run lint` clean, `npm run build` passes, backend endpoints tested via TestClient, DOCX ingestion + path traversal regression-tested.

### What is currently loaded in the system
- `test_policy.pdf` (1 page, 1 chunk)
- `NIST.SP.800-160v1r1.pdf` (195 pages, 525,440 chars, 1,419 chunks)

---

## 6. What We Are Going To Do (Stages 7–12)

These are the security layers that transform the baseline RAG into TrustRAG:

| Stage | What it is | Purpose |
|-------|-----------|---------|
| **7 — Document security** | SHA-256 integrity, digital signatures, provenance tracking, versioning | Verify documents are authentic and unchanged before indexing |
| **8 — Content security** | Knowledge-poisoning detection, prompt-injection detection | Detect malicious content at ingestion and again at retrieval |
| **9 — Trust engine** | Combine signature, integrity, source, provenance, poison/injection risk into a trust score/category | Decide whether a document is Trusted / Suspicious / Quarantined |
| **10 — Authentication + RBAC** | Login, roles (Employee/HR/IT Security/Admin), per-document permissions | Prevent unauthorized retrieval of confidential documents |
| **11 — Secure retrieval** | Security-aware ranking: relevance + trust + authorization + provenance + injection scan | Only safe, authorized context reaches the LLM |
| **12 — Evaluation** | Compare baseline RAG vs TrustRAG under attacks | Measure security effectiveness, retrieval quality, and overhead |

---

## 7. How We Will Implement It (Implementation Plan)

The strategy is deliberate: **keep the baseline RAG intact and working**, add each security mechanism **modularly** as its own stage, and **test each one before moving on** — so we can run controlled experiments later (baseline vs. secured).

### Stage 7 — Document security
- Add `backend/security/` modules: `hashing.py`, `signature.py`, `provenance.py`.
- Pick a signature algorithm (**open decision** — candidates: Ed25519 / RSA-PSS / ECDSA; Ed25519 is likely simplest for an academic prototype).
- Extend the upload flow: `Upload → Validate → Hash → Verify signature → Extract → Scan → Trust evaluate → Record provenance → Chunk → Embed → Store`.
- Store per-document: source, uploader, timestamp, version, hash, signer, security status.
- Test cases we will build:
  - **A:** unchanged signed document → ACCEPT
  - **B:** document changed after signing → SIGNATURE FAIL / QUARANTINE
  - **C:** legitimate new version, newly signed → ACCEPT as new version
  - **D:** attacker PDF with its own hash but no trusted signature → UNTRUSTED / QUARANTINE

### Stage 8 — Content security
- Implement **poison detection** using multiple signals (source confidence, signature status, contradiction/anomaly vs. trusted corpus).
- Implement **prompt-injection detection** as a layered defense:
  1. Rule/pattern detector (e.g., "ignore previous instructions", "reveal system prompt").
  2. A dedicated security classifier (NVIDIA guard model is a candidate — **open decision**, to be evaluated for availability, license, hardware, latency, quality).
  3. **Retrieval-time second scan** (defense in depth).
- We may structure this as an experiment: Detector A (rules only) vs B (AI model) vs C (combined), measuring true positives / false positives / false negatives / detection rate / latency.

### Stage 9 — Trust engine
- Build `trust_engine.py` that combines: signature status, integrity status, source reputation, provenance, poison risk, injection risk, version status.
- Output: **Trusted / Suspicious / Quarantined** (and optionally a numeric score).
- ⚠️ The exact formula and thresholds are an **open research/design problem** — we will design and justify them experimentally, not invent arbitrary weights.

### Stage 10 — Authentication + RBAC
- Add login (username/password → JWT/session) with FastAPI.
- Define roles: Employee, HR, IT Security, Admin.
- Attach an access policy to each document.
- Enforce: a document can be trusted and relevant but still **BLOCKED** for an unauthorized user.

### Stage 11 — Secure retrieval
- Replace plain `top-k similarity` with security-aware retrieval:
  `Relevant AND Authorized AND Trusted enough AND Security checks passed` → only then does a chunk become LLM context.
- Re-scan retrieved chunks for prompt injection before building the final context.

### Stage 12 — Evaluation (the academic core)
- Build the **TrustRAG Enterprise Security Corpus** (public + synthetic enterprise documents — employee handbooks, IT/security policies, SOPs, etc., ~200–300 planned pages).
- Create controlled malicious copies of trusted documents (e.g., "MFA is mandatory" vs poisoned "MFA is unnecessary") so ground truth is known.
- Run scenarios:
  1. Knowledge poisoning — do malicious docs influence answers?
  2. Prompt injection — do injected instructions get followed?
  3. Unauthorized retrieval — can an employee read HR-confidential data?
  4. Document tampering — does modifying a signed doc get caught?
  5. Legitimate version update — is a correctly signed new version accepted?
  6. Retrieval quality — does security filtering damage useful retrieval?
  7. Performance — how much latency/overhead does security add?
- Metrics: poison detection rate, injection detection rate, false positives/negatives, unauthorized-retrieval prevention, retrieval accuracy, answer quality, latency.

---

## 8. Project Structure

```
TrustRAG/
├── backend/
│   ├── main.py                 # FastAPI app, CORS, routers
│   ├── api/
│   │   ├── documents.py        # Upload, list, metadata
│   │   ├── query.py            # RAG query
│   │   └── dashboard.py        # Stats + system status
│   ├── rag/
│   │   ├── ingestion.py        # Validation, SHA-256, extraction
│   │   ├── chunking.py         # Sentence-aware chunking
│   │   ├── embedding.py        # EmbeddingGemma-300M
│   │   ├── vectorstore.py      # ChromaDB
│   │   └── llm.py              # Zai API (glm-4.7-flash)
│   ├── security/               # (empty — Stage 7+)
│   ├── database/               # (empty — future)
│   └── models/                 # (empty — future)
├── frontend/
│   └── src/
│       ├── pages/              # Dashboard, Documents, Chat, KnowledgeBase, SystemStatus
│       ├── components/         # Layout, Sidebar, PageHeader, StatusBadge, FileUpload
│       ├── services/api.ts     # API client
│       ├── hooks/useApi.ts     # Data-fetching hook
│       └── types/index.ts      # TS interfaces
├── data/
│   ├── trusted/                # Uploaded documents + _metadata.json
│   ├── chroma_db/              # Vector store (gitignored)
│   ├── poisoned/               # (empty — Stage 8+)
│   └── restricted/             # (empty — future)
├── tests/                      # (pytest suite to be added)
├── scripts/
├── start.sh                    # Dev launcher
├── requirements.txt
└── README.md / TRUSTRAG_PROJECT_CONTEXT.md
```

---

## 9. How to Run It

```bash
# One-command launch (backend :8000 + frontend :5173)
./start.sh
# Open http://localhost:5173

# Manual backend
source .venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Manual frontend
cd frontend && npm install && npm run dev
```

Upload a document:
```bash
curl -X POST http://localhost:8000/documents/upload -F "file=@policy.pdf" -F "uploaded_by=pavan"
```

Ask a question:
```bash
curl -X POST http://localhost:8000/query -H "Content-Type: application/json" \
  -d '{"question": "What is the password rotation policy?"}'
```

---

## 10. Open Decisions (to finalize in Stages 7–12)

- Digital-signature algorithm (Ed25519 / RSA-PSS / ECDSA)
- PKI / key-management architecture (kept simple for the prototype)
- Poison-detector approach
- Prompt-injection detector (rules + security classifier; NVIDIA guard model candidate)
- Trust-score formula and thresholds (must be experimentally justified)
- Authentication implementation (JWT / FastAPI)
- RBAC schema and roles
- Final dataset collection (TrustRAG Enterprise Security Corpus)
- Final literature set (must be IEEE/ACM/Springer/Elsevier-only per lecturer requirement)

---

## 11. One-Sentence Summary

> **TrustRAG is a security-enhanced RAG framework that verifies and evaluates documents before indexing, enforces trust, provenance, and authorization during retrieval, detects poisoning and prompt-injection attempts, and supplies only trusted and authorized context to the LLM.**

---

## 12. Before Sharing the Repo (Important)

- 🔴 **Rotate the leaked Zai API key** (it is in git history at commit `88df6e8`) and purge it from history before sharing.
- Add a proper `pytest` test suite and a backend linter (ruff).
- Consider `BackgroundTasks` for large-document ingestion (e.g., the NIST doc created 1,419 chunks over several minutes).
