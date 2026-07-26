# TrustRAG

A Secure Retrieval-Augmented Generation Framework for Defending Enterprise AI Systems Against Knowledge Poisoning.

## Overview

TrustRAG is an academic Information Security project that implements a RAG pipeline with security enhancements. The current version provides a **baseline RAG system** (Stages 1–6) with a web interface for document upload, knowledge base management, and natural-language querying.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.12, FastAPI, Uvicorn |
| Embedding | EmbeddingGemma-300M (768-dim, local) |
| Vector DB | ChromaDB (cosine similarity) |
| LLM | Zai API (glm-4.7-flash) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |

## Quick Start

### Prerequisites

- Python 3.12
- Node.js 18+
- npm

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

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Project info |
| GET | `/health` | Health check |
| GET | `/dashboard/stats` | Dashboard statistics |
| GET | `/status` | System component health |
| POST | `/documents/upload` | Upload and ingest a document |
| GET | `/documents/` | List all indexed documents |
| GET | `/documents/{id}` | Get document metadata |
| POST | `/query` | Query the RAG pipeline |

### Upload a Document

```bash
curl -X POST http://localhost:8000/documents/upload \
  -F "file=@your_document.pdf" \
  -F "uploaded_by=pavan"
```

### Ask a Question

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the password rotation policy?"}'
```

## Supported File Types

- PDF
- TXT
- DOCX (partial support)

Maximum file size: 50MB

## Project Structure

```
TrustRAG/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── api/
│   │   ├── documents.py        # Document upload and listing
│   │   ├── query.py            # RAG query endpoint
│   │   └── dashboard.py        # Dashboard stats and system status
│   └── rag/
│       ├── ingestion.py        # File validation, SHA-256, text extraction
│       ├── chunking.py         # Sentence-aware text chunking
│       ├── embedding.py        # EmbeddingGemma-300M integration
│       ├── vectorstore.py      # ChromaDB vector store
│       └── llm.py              # Zai API (glm-4.7-flash) integration
├── frontend/
│   ├── src/
│   │   ├── pages/              # Dashboard, Documents, Chat, Knowledge Base, System Status
│   │   ├── components/         # Sidebar, Card, StatusBadge, FileUpload
│   │   ├── services/api.ts     # API client
│   │   └── types/index.ts      # TypeScript interfaces
│   └── package.json
├── data/
│   ├── trusted/                # Uploaded documents
│   └── chroma_db/              # ChromaDB vector storage
├── start.sh                    # Development launcher
├── requirements.txt            # Python dependencies
└── TRUSTRAG_PROJECT_CONTEXT.md # Full project documentation
```

## Web Interface Pages

1. **Dashboard** — Overview with stats cards and pipeline visualization
2. **Documents** — Upload and manage documents with drag-and-drop
3. **RAG Chat** — ChatGPT-style interface for querying the knowledge base
4. **Knowledge Base** — Browse all indexed documents and their metadata
5. **System Status** — Real-time component health diagnostics

## Troubleshooting

### Backend won't start

- Ensure you're in the project root directory
- Ensure the virtual environment is activated: `source .venv/bin/activate`
- Check port 8000 is not in use: `lsof -i :8000`

### Frontend can't connect to backend

- Ensure both servers are running
- Check CORS configuration in `backend/main.py`
- Verify backend is accessible: `curl http://localhost:8000/health`

### Upload fails

- Check file type is supported (PDF, TXT, DOCX)
- Check file size is under 50MB
- Ensure the embedding model is available at the configured path

## Current Status

- ✅ Stages 1–6: Basic RAG pipeline complete
- ⏳ Stages 7–12: Security features (pending)
