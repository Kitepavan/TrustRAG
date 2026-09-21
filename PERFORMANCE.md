# TrustRAG performance assessment

Measured September 17, 2026. This pass covers frontend delivery, ingestion, local embeddings,
vector persistence/search, metadata persistence/verification, document listing, audit storage,
and local query execution. It is not a production capacity or external-provider benchmark.

## Reproduce

```bash
PYTHONPATH=. .venv/bin/python scripts/profile_pipeline.py
PYTHONPATH=. .venv/bin/pytest tests/ -q
npm --prefix frontend run build
npm --prefix frontend run lint
```

The profiler uses a temporary working directory and local offline model weights. It creates
1,000 short unsigned synthetic documents, indexes 150 chunks in temporary persistent ChromaDB,
and retrieves 150 candidates for top-K 50. It performs real local embeddings (16-text batch
and individual queries). Stored embedding vectors are reused across documents to isolate
retrieval scale. Ingestion separately processes approximately 68 kB of TXT content.
Generation is stubbed; endpoint functions are called directly, excluding HTTP/JWT overhead.
No production stores, secrets, provider requests or development servers are used.

Raw results and cProfile output: [performance_results.json](performance_results.json).
The baseline was captured after the initial lazy-route/unsigned-read changes but before
metadata batching. Subsequent runs measure metadata batching; the final run also includes
listing. Warm stages use 3–5 repetitions; cold initialization is measured once per run.

## Stage measurements and decisions

| Stage | Baseline median, ms | Final median, ms | Decision |
|---|---:|---:|---|
| Model load (one sample) | 2,913.89 | 2,460.10 | Already cached per process; keep cold start explicit |
| Embed 16 texts | 601.48 | 684.89 | Existing batched encoding retained |
| Embed query | 119.12 | 122.31 | Remaining major local query cost; no unsafe/speculative cache |
| Write 1,000 metadata records | 18.11 | 30.26 | Keep fsync and atomic replacement; no durability trade-off |
| Initialize vector store (one sample) | 234.99 | 140.31 | Already reused per process |
| Add 150 vectors (one sample) | 150.45 | 100.37 | Existing batch insertion retained |
| Search 150 vector candidates | 15.77 | 15.07 | Not the dominant observed cost; index settings unchanged |
| Secure retrieval, 150 candidates | 394.59 | 32.81 | Batch authoritative metadata reads |
| List 1,000 documents | Not captured | 56.06 | Batch verification; two metadata reads rather than N+1 |
| Ingest approximately 68 kB TXT | 25.07 | 29.28 | Redundant unsigned binary read removed earlier |
| Audit append | 2.09 | 2.38 | Not material in this small-log workload; retain durable writes |
| Audit read | 0.52 | 0.25 | No new indexing/storage dependency justified by this workload |
| Query, stubbed generation | 584.30 | 151.51 | Real embedding + optimized retrieval + audit; not LLM latency |

Unchanged-stage differences are noise, not claimed optimizations. Two intermediate runs
had substantially higher system load: optimized retrieval medians were 89.91 and 51.90 ms,
and query medians were 274.23 and 259.85 ms. Consequently no fixed speedup multiplier is
promised. The deterministic result is **150 metadata reads reduced to one** per retrieval.
Baseline cProfile attributed 316 ms of 427 ms profiled retrieval time to metadata loading.

## Implemented optimizations

1. **Frontend route splitting:** seven page modules now load through React.lazy with a
   Suspense loading status. AuthGate remains outside routing. Initial JavaScript fell
   from 296.11 to 241.79 kB (18.34%); Vite gzip fell from 86.92 to 77.58 kB (10.75%).
   All seven chunks are emitted and dynamically referenced. Total code is split, not
   eliminated; subsequent route navigation needs its chunk download. Browser timings
   and offline chunk-load failure handling were not measured.
2. **Unsigned ingestion:** skip the full binary read/allocation used only for signature
   verification when no signature exists. SHA-256 still streams the file, extraction
   and scans still execute, and signed uploads still read and verify original bytes.
3. **Request-local verification batches:** parse the metadata store once under its lock,
   verify each distinct document freshly, persist changed quarantine records once, then
   propagate to secondary stores. Single-document callers use the same implementation.
   Secure retrieval uses one batch; listing uses an initial authorization snapshot and
   one batch, then rechecks clearance against returned authoritative records.

## Security and operational trade-offs

- No cross-request integrity cache, signature skipping, trust downgrade, model replacement,
  approximate-search retuning or database durability weakening was introduced.
- The batch holds the existing exclusive metadata lock through file verification. This
  removes repeated parse/lock overhead but may increase individual lock hold time for
  large files. Concurrent throughput and large signed PDF/DOCX workloads remain unmeasured.
- Missing/corrupt metadata still fails closed. Tampering between requests is detected;
  metadata quarantine persists and propagates. Separate stores are still not transactional.
- Model memory, external provider latency/rate limits, large audit histories and production
  concurrency need deployment-specific measurement before adding caches, indexes, workers
  or changing models. The current synthetic evidence does not justify speculative changes.
- Development tooling was inspected; the existing launcher still has lifecycle/readiness
  limitations documented by source behavior. No server lifecycle changes were made in
  this performance pass, and ports 8000/5173 remained closed.

## Acceptance audit

| Requirement | Concrete evidence |
|---|---|
| Assess project-wide backend stages | Reproducible profiler, stage table and raw cProfile results |
| Reduce initial frontend delivery | Before/after Vite output and seven emitted route chunks |
| Remove redundant unsigned I/O | Signed/unsigned open-count regression; unsigned case failed before fix |
| Optimize measured retrieval bottleneck | Metadata read counts 150 → 1, three improved profile runs |
| Apply shared fix to listing | Two-read assertion on multi-document listing; final 1,000-document workload |
| Preserve integrity and authorization | Full 68-test suite; four-document read-count test detects later tampering; existing RBAC/quarantine tests retained |
| Validate frontend and hygiene | TypeScript/Vite build, lint and git diff checks passed |
| Avoid external side effects | Temporary stores, offline model settings, stubbed generation, no listening development ports |
| Record limitations honestly | No HTTP/provider/browser/concurrency timing claim; explicit workload and variance |

Latest full verification: **68 passed, 1 existing Starlette TestClient dependency warning**;
frontend build and lint pass. Changes are uncommitted. Existing user work and presentation
artifacts were preserved.
