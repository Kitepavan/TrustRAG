# TrustRAG:
# A Secure Retrieval-Augmented Generation Framework

## Project Report

**Submitted by:** [Your Name] ([Your Registration Number])

[Teammate 2 Name] ([Registration Number])

[Teammate 3 Name] ([Registration Number])

**Course:** [Course Name]

**Course code:** [Course Code : Section]

*(Insert VIT logo at the top of the title page)*

---

## Abstract

TrustRAG is a security-enhanced Retrieval-Augmented Generation (RAG) framework designed to protect enterprise AI systems that connect Large Language Models (LLMs) to private documents. Traditional RAG pipelines retrieve information based purely on semantic similarity, which means the most relevant document is not necessarily the safest document. A poisoned or malicious document can be retrieved and injected into the LLM context, enabling indirect prompt injection and knowledge poisoning attacks.

TrustRAG addresses this problem by extending the retrieval decision beyond relevance. Every retrieved candidate is evaluated using multiple security signals: digital document signatures (Ed25519), content security checks (knowledge-poisoning and indirect prompt-injection detection), categorical trust status (Trusted, Suspicious, Quarantined) and role-based access control (RBAC). Only documents that pass the trust, authorization and security filters are forwarded to the LLM for answer generation.

The prototype implements a complete pipeline: document ingestion with format validation and path-traversal prevention, sentence-aware chunking, local embedding generation (EmbeddingGemma-300M), a persistent vector store (ChromaDB), signed document storage with provenance logging, locally served injection classification, a multi-signal Trust Engine, secure top-K retrieval, and a React-based dashboard with JWT authentication and a privileged audit log. The system was evaluated using a 150-test automated suite, a labeled-corpus calibration of the injection classifier (development F1 0.917, held-out 0.842), and a measured baseline-versus-TrustRAG end-to-end comparison on a synthetic attack corpus.

**Keywords:** Retrieval-Augmented Generation, document security, prompt injection, knowledge poisoning, digital signatures, provenance, role-based access control, trust scoring, audit logging.

---

## Table of Contents

1. Introduction
2. Literature Survey and Existing Systems
3. Problem Statement and Objectives
4. Scope of the Project
5. System Requirements
6. System Overview and Features
7. Implementation
8. Testing and Results
9. Limitations
10. Future Work
11. Conclusion
12. References

---

## 1. Introduction

### 1.1 Background and Motivation

Retrieval-Augmented Generation allows an LLM to answer questions using private enterprise documents instead of relying only on its training data. However, the documents fed into the retrieval pipeline are not always trustworthy. Employees can upload unverified content, attackers can inject documents that look relevant but contain hidden instructions, and even legitimate repositories can be poisoned over time.

In a standard RAG system, retrieval is driven entirely by semantic similarity. If a malicious document is written to be highly similar to a user's query, it will be retrieved first and its content will be presented to the LLM as trusted context. There is no verification of who authored the document, whether it was modified after signing, whether the requester is authorized to see it, or whether the content contains prompt-injection payloads.

TrustRAG was motivated by this gap: enterprise RAG needs the same security discipline as any other privileged system — authentication, authorization, integrity verification and auditing — applied to the retrieval layer itself.

### 1.2 Overview and Core Philosophy

The project is built on one principle:

> **"The most semantically relevant document is not necessarily the safest document."**

TrustRAG therefore evaluates every retrieval candidate using a multi-signal decision:

**Retrieval Decision = Relevance + Trust Status + Authorization (RBAC) + Provenance + Security Checks**

The system is organized around the following components:

- **Secure Ingestion:** PDF, DOCX and TXT upload with format validation, size caps and server-generated UUID identifiers to prevent path traversal.
- **Document Security:** Ed25519 digital signatures, SHA-256 digests and provenance records for every ingested document.
- **Content Security:** Detection of knowledge poisoning and indirect prompt injection in chunk text before it can reach the LLM, using a locally served injection classifier with a calibrated decision threshold.
- **Trust Engine:** Categorical scoring — `Trusted`, `Suspicious` or `Quarantined` — combining signature validity and content-scan results.
- **Secure Retrieval:** Defense-in-depth top-K retrieval that filters candidates by trust, clearance and chunk integrity before LLM generation.
- **Audit & Provenance:** A privileged security event log for uploads and queries.

### 1.3 Role of Artificial Intelligence

The LLM in TrustRAG is deliberately *not* the security authority. It only generates answers from a context that has already been filtered by the security pipeline, and it operates under a security-focused system prompt. Embeddings are produced locally (EmbeddingGemma-300M, 768-dimensional vectors) and the injection classifier is served locally, so document content never leaves the machine during retrieval or scanning. AI is used for semantic search and grounded answer generation only — it does not decide trust, authorization or quarantine; those are deterministic, verifiable security decisions.

### 1.4 Significance

TrustRAG demonstrates that RAG security can be enforced in layers rather than trusted to the model's behavior: cryptographic integrity at ingestion, content scanning before retrieval, trust-based ranking, RBAC clearance at query time and privileged audit telemetry afterwards. This design is directly applicable to enterprise knowledge bases, compliance-sensitive document systems and any deployment where LLM context must be provably trustworthy.

---

## 2. Literature Survey and Existing Systems

### 2.1 Existing Approaches

Current solutions for connecting LLMs to private documents generally include vanilla RAG pipelines, vector databases with metadata filtering, and enterprise knowledge-management platforms.

Vanilla RAG retrieves the top-K most similar chunks and passes them directly to the LLM; retrieval quality is measured only by relevance. Vector databases such as ChromaDB, FAISS and Pinecone provide similarity search with optional metadata filters, but the filters are typically used for source or date, not for security posture. Enterprise knowledge platforms add authentication and folder permissions, but the LLM retrieval step itself usually bypasses those controls once documents are embedded.

### 2.2 Comparative Analysis

| Aspect | Vanilla RAG | Vector DB + Filters | Enterprise KB + LLM | TrustRAG |
|---|---|---|---|---|
| Primary focus | Relevance | Search speed | Access control | Secure retrieval |
| Semantic retrieval | Yes | Yes | Partial | Yes |
| Document integrity (signatures) | No | No | Varies | Yes (Ed25519) |
| Prompt-injection / poisoning checks | No | No | No | Yes |
| Trust-based ranking | No | No | No | Yes (categorical) |
| Role-based clearance at query time | No | Limited | Varies | Yes (RBAC) |
| Privileged audit log | No | No | Varies | Yes |

### 2.3 Research Gap

Existing systems separate retrieval quality from retrieval safety. Similarity search has no notion of document authenticity, and access-control systems have no notion of semantic similarity. TrustRAG addresses this gap by combining cryptographic provenance, content security scanning, categorical trust scoring and RBAC clearance inside the retrieval decision itself, so that unsafe candidates are filtered before the LLM ever sees them.

*Note: Add verified research papers on RAG security, indirect prompt injection and data poisoning of vector stores to support this section.*

---

## 3. Problem Statement and Objectives

### 3.1 Problem Statement

Conventional RAG pipelines accept any document that is semantically close to the query, with no verification of authenticity, authorization or content safety. This exposes enterprise LLM deployments to knowledge poisoning (corrupted documents entering the knowledge base) and indirect prompt injection (malicious instructions inside retrieved text), and allows users to retrieve documents above their clearance. There is no audit trail of what was retrieved, by whom, and why.

### 3.2 Objectives

The objectives of TrustRAG are to:

1. Provide a complete RAG pipeline (ingestion, chunking, embedding, vector store, generation) as a baseline for security enhancement.
2. Digitally sign every ingested document (Ed25519) and verify signatures and SHA-256 digests before use.
3. Detect knowledge poisoning and indirect prompt injection in document chunks at ingestion time.
4. Assign a categorical trust status (`Trusted`, `Suspicious`, `Quarantined`) to every document using a multi-signal Trust Engine.
5. Enforce role-based access control with clearance levels at authentication and retrieval time (JWT Bearer).
6. Restrict LLM context generation to security-filtered, authorized, trusted chunks only.
7. Record privileged security audit events for uploads and queries.

### 3.3 Expected Outcomes

A working system in which a Baseline RAG query and a Secure (TrustRAG) query can be compared on the same corpus: the baseline retrieves by relevance alone, while TrustRAG blocks quarantined documents, demotes unsigned documents, enforces clearance and produces a fully auditable retrieval decision.

---

## 4. Scope of the Project

### 4.1 Implemented Features

- FastAPI backend with JWT authentication and persona accounts (Employee, HR, IT_Security, Admin).
- Document ingestion for PDF, DOCX and TXT with validation, size caps and path-traversal prevention.
- Sentence-aware chunking (512 characters, 64-character overlap) and local 768-dimensional embeddings (EmbeddingGemma-300M).
- Persistent vector store (ChromaDB) with security metadata attached to every chunk.
- Ed25519 signing, SHA-256 hashing and provenance logging for all documents.
- Knowledge-poisoning detection and indirect prompt-injection detection (local Laya English classifier with a calibrated threshold).
- Multi-signal Trust Engine with categorical classification and quarantine propagation across metadata, vectors and provenance.
- Secure top-K retrieval with trust, clearance and chunk-digest enforcement.
- Baseline RAG query endpoint retained for academic comparison.
- React 19 + TypeScript dashboard (7 pages) including a privileged Audit Log with filters, trace display and pagination.
- Academic evaluation suite: synthetic component checks and a measured Baseline-vs-TrustRAG end-to-end harness.

### 4.2 Planned Features

Repeat evaluation trials, semantic answer grading, larger benchmark corpora, tamper-evident (cryptographically protected) audit logging, provenance-based authorization gating, and production deployment hardening remain future work.

### 4.3 Assumptions and Constraints

The prototype runs on a single machine with a local vector store, local embedding model and locally served injection classifier; the LLM is accessed through an OpenAI-compatible API (local setup: the Z.ai API with `glm-5-turbo`) and requires an API key (generation returns 502 if the key is absent). Audit telemetry is best-effort and mutable, and is not yet cryptographically tamper-evident. Fixed demo passwords are disabled by default and require explicit demo mode. The system is intended for demonstration and evaluation, not as a production records system.

---

## 5. System Requirements

### 5.1 Functional Requirements

| ID | Requirement |
|---|---|
| FR1 | Authenticate users via JWT and expose role-specific clearance (Employee, HR, IT_Security, Admin). |
| FR2 | Accept PDF, DOCX and TXT uploads with format, size and path-traversal validation. |
| FR3 | Chunk documents and generate local embeddings; persist chunks in the vector store with security metadata. |
| FR4 | Digitally sign ingested documents and record SHA-256 digests and provenance. |
| FR5 | Scan document content for knowledge poisoning and indirect prompt injection. |
| FR6 | Classify each document as Trusted, Suspicious or Quarantined via the Trust Engine. |
| FR7 | Propagate quarantine across file metadata, vector entries and provenance records. |
| FR8 | Perform secure top-K retrieval filtered by trust, clearance and chunk integrity. |
| FR9 | Generate LLM answers only from eligible, security-filtered context. |
| FR10 | Restrict dashboard, status, evaluation and audit endpoints by role; deny with 401 without a valid token. |
| FR11 | Provide a baseline (relevance-only) RAG endpoint for comparison. |

### 5.2 Non-Functional Requirements

- **Security:** Fail-closed authentication, clearance enforcement and quarantine blocking.
- **Privacy:** Prompts, document text and secrets are never written to telemetry.
- **Integrity:** Cryptographic signatures and digests verified against current file evidence.
- **Auditability:** Privileged security event log for uploads and queries.
- **Maintainability:** Modular pipeline; baseline RAG preserved intact for comparison.
- **Usability:** Role-based dashboard with clear document and trust status presentation.

### 5.3 Hardware and Software Requirements

| Component | Requirement |
|---|---|
| Client | Computer, tablet or smartphone |
| Browser | Recent Chrome, Edge, Firefox or Safari |
| Backend | Python 3.12, FastAPI, Uvicorn |
| Document processing | PyMuPDF (PDF), python-docx (DOCX) |
| Cryptography | Python `cryptography` (Ed25519, SHA-256) |
| Embeddings | EmbeddingGemma-300M via SentenceTransformers (local) |
| Injection classifier | `convaiinnovations/laya` English checkpoint served locally (`laya-serve`, CPU) |
| Vector store | ChromaDB (cosine similarity, persistent) |
| Telemetry | SQLite (security audit events) |
| LLM | OpenAI-compatible chat API (configurable; local setup uses Z.ai `glm-5-turbo`) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Network | Internet connection for answer generation only; retrieval and scanning run locally |

---

## 6. System Overview and Features

### 6.1 Secure Retrieval Pipeline

The retrieval flow is: User query → JWT authentication and clearance check → embedding of the query → candidate search in ChromaDB → security filtering (trust status, authorization, chunk digest verification) → top-K selection → LLM generation with a security system prompt → audited response.

### 6.2 Trust Engine and Document Classification

Every document receives one of three states:

- **Trusted:** Valid signature and clean security scans; ranked above all others.
- **Suspicious:** Clean scans but unsigned (or equivalent weaker evidence); usable but ranked below Trusted.
- **Quarantined:** Invalid signature or positive injection/poisoning scan — signed or not; blocked from retrieval and propagated out of metadata, vectors and provenance.

### 6.3 User Roles

| Role | Main Responsibility |
|---|---|
| Employee | Query the knowledge base within clearance; upload non-sensitive documents |
| HR | Query and manage HR-domain documents within clearance |
| IT_Security | Full audit access, security review and quarantine oversight |
| Admin | Platform-level administration including deletion clearance |

### 6.4 Supporting Features

The dashboard includes document upload and listing with signatures and trust status, secure and baseline query views, a system health page, and a privileged Audit Log page (Admin/IT_Security only) with event filters, trace display and "Load older events" pagination. Frontend sessions use explicit sign-in and sessionStorage with automatic unmounting on logout or 401.

---

## 7. Implementation

### 7.1 Technology and Development

The backend is a Python 3.12 FastAPI application; the frontend is a React 19 + TypeScript (strict) Vite application styled with Tailwind CSS v4 in a security-dashboard theme. Development proceeded stage by stage: backend setup, ingestion, chunking, embedding, vector persistence, baseline RAG + UI, document security, content security, the Trust Engine, authentication/RBAC, secure retrieval, and finally the academic evaluation suite. The baseline RAG path was deliberately kept intact so the secure path can be measured against it. A single development launcher (`./start.sh`) starts the local injection classifier, the backend and the frontend, reusing a classifier instance that is already running.

### 7.2 Ingestion and Document Security

Uploads are assigned server-generated UUID identifiers (`DOC-<32hex>.<ext>`) under a trusted store, eliminating user-controlled paths. Each document is hashed (SHA-256), signed (Ed25519 enterprise key) and recorded in a provenance log. The document store is authoritative: it re-verifies current file and signature evidence and persists quarantine decisions across metadata, vectors and provenance.

### 7.3 Content Security and Trust Scoring

The injection classifier is served locally (`laya-serve`, `convaiinnovations/laya` English checkpoint, CPU) and answers the same System One request contract as the remote default; requests carry a single segment of at most 2000 characters, and provider-reported truncation fails closed. Its decision threshold was recalibrated on a labeled attack corpus (development F1 0.917 at precision/recall 0.846/1.000; held-out F1 0.842, reported without tuning). The poisoning detector scans chunk text with calibrated patterns. The Trust Engine combines signature validity and scan results into the categorical status described in Section 6.2.

### 7.4 Implementation Status

| Component | Status |
|---|---|
| Ingestion, chunking, embedding, vector store | Built |
| Document signing, hashing, provenance | Built |
| Injection and poisoning detectors | Built (calibrated) |
| Trust Engine and quarantine propagation | Built |
| JWT authentication and RBAC | Built |
| Secure retrieval and baseline RAG endpoints | Built |
| React dashboard (7 pages incl. Audit Log) | Built |
| Evaluation harness (component + E2E) | Built |
| Repeat trials, semantic grading, larger corpora | Planned |
| Tamper-evident audit log | Planned |

### Screenshots:

*Figure 7.1: Sign-in screen with persona-based login. (Screenshot to be added.)*

*Figure 7.2: Document upload and listing with trust status badges. (Screenshot to be added.)*

*Figure 7.3: Secure query view showing filtered retrieval results. (Screenshot to be added.)*

*Figure 7.4: Audit Log page with event filters and trace display (Admin/IT_Security view). (Screenshot to be added.)*

*Note: Capture final screenshots with a consistent demo corpus, and label each image with a figure number and caption.*

---

## 8. Testing and Results

### 8.1 Testing Approach

Automated testing is used throughout: a `pytest` suite (150 passing tests) covers unit behavior, API integration and security regressions, including an HTTP authentication matrix for protected endpoints, quarantine propagation and digest checks, detector false-positive regressions, and audit privacy checks (no prompts, document text or secrets in telemetry). The injection classifier was additionally calibrated against a labeled adversarial corpus (development F1 0.917 at precision/recall 0.846/1.000; held-out F1 0.842), and an end-to-end harness measures Baseline vs. TrustRAG on a 10-document synthetic attack corpus with the live local classifier.

### 8.2 Test Cases and Results

| Test | Expected Result | Current Status |
|---|---|---|
| Login without valid credentials / no token | 401, fail-closed | Working |
| Upload malicious path / oversized file | Rejected | Working |
| Signed clean document ingestion | Trusted, retrievable | Working |
| Unsigned clean document ingestion | Suspicious, ranked below Trusted | Working |
| Injection / poisoning positive scan | Quarantined and blocked (even if signed) | Working |
| Injection classifier threshold calibration | Threshold selected on a labeled corpus without tuning on held-out data | Working (dev F1 0.917, held-out 0.842) |
| Quarantine propagation | Removed from metadata, vectors and provenance | Working |
| Chunk digest mismatch | Chunk excluded from retrieval | Working |
| Cross-clearance retrieval attempt | Denied by RBAC filter | Working |
| Audit endpoint access by Employee | 403 (Admin/IT_Security only) | Working |
| Baseline vs. Secure E2E comparison | Baseline retrieves attack corpus; TrustRAG blocks | Working (single trial) |

### 8.3 Known Issues and Observations

The measured end-to-end evaluation currently uses a single trial; repeating trials and adding semantic answer grading are required before stronger academic claims can be made. Audit telemetry is best-effort and mutable — it is not cryptographically tamper-evident — and the JSON provenance log is mutable as well, so it is not yet a separate provenance authorization gate. LLM generation depends on an external API key (Z.ai in the local setup, `glm-5-turbo`); the system degrades gracefully (502 without a key, 200 with no eligible context) but generation quality varies by provider model. The injection classifier runs locally, so scanning needs no external service — but while it is unreachable, every scan fails closed by design: uploads are quarantined and secure queries are blocked.

---

## 9. Limitations

- **Audit integrity:** Security events are best-effort and mutable, not tamper-evident.
- **Provenance:** The provenance log is informational, not an authorization gate.
- **Evaluation depth:** E2E comparison is a single measured trial on a small synthetic corpus; no semantic grading yet.
- **External LLM dependency:** Answer generation requires an external API and inherits provider limitations.
- **Single-machine deployment:** Local vector store and embedding model; no distributed or production deployment tested.
- **No formal user study:** No usability testing with representative enterprise users has been conducted.

---

## 10. Future Work

1. Repeat E2E evaluation trials and add semantic answer grading over a larger corpus.
2. Implement a tamper-evident, cryptographically chained audit log.
3. Elevate provenance records into an explicit authorization gate.
4. Extend the detector suite with adversarial evaluation (evasion testing).
5. Harden the system for multi-user production deployment (key management, secrets handling).
6. Conduct usability testing with representative enterprise users.
7. Review applicable data-protection and compliance requirements before deployment.

---

## 11. Conclusion

TrustRAG demonstrates that RAG security can be enforced deterministically and in layers, rather than being trusted to model behavior. By combining Ed25519 document signatures, SHA-256 integrity, content security scanning, categorical trust scoring, RBAC clearance and privileged audit telemetry, the system ensures that only authentic, trusted, authorized and clean documents reach the LLM — while the baseline RAG path remains available for direct academic comparison.

The current prototype implements the full twelve-stage pipeline and passes a 150-test automated suite, with a locally served, calibrated injection classifier and a measured baseline-versus-TrustRAG comparison on a synthetic attack corpus. Strengthening audit integrity, deepening the evaluation and hardening for production are the essential next steps before real-world enterprise use.

---

## 12. References

Add verified sources actually consulted for the report, such as:

1. Research papers on Retrieval-Augmented Generation (Lewis et al., 2020).
2. Research papers on indirect prompt injection and LLM-integrated application security.
3. Research papers on data poisoning and backdoor attacks on machine learning pipelines.
4. Ed25519 signature scheme — D. J. Bernstein et al. — https://ed25519.cr.yp.to/
5. ChromaDB Documentation — https://docs.trychroma.com/
6. FastAPI Documentation — https://fastapi.tiangolo.com/
7. SentenceTransformers Documentation — https://www.sbert.net/
8. OWASP Top 10 for Large Language Model Applications — https://owasp.org/www-project-top-10-for-large-language-model-applications/
