"""Isolated synthetic pipeline benchmark; never calls an external LLM or production stores.

Run from the repository root: PYTHONPATH=. .venv/bin/python scripts/profile_pipeline.py
Timings are diagnostic, not performance assertions or measured LLM latency.
"""

import cProfile
import io
import json
import os
from pathlib import Path
import pstats
import statistics
import tempfile
from time import perf_counter
from unittest.mock import patch


def measure(action, repeats=5):
    times = []
    value = None
    for _ in range(repeats):
        started = perf_counter()
        value = action()
        times.append((perf_counter() - started) * 1000)
    return {"median_ms": round(statistics.median(times), 3),
            "min_ms": round(min(times), 3), "runs": repeats}, value


def main():
    # Imports that initialize stores must happen inside the temporary workspace.
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    original_cwd = Path.cwd()
    with tempfile.TemporaryDirectory(prefix="trustrag-profile-") as workspace:
        os.chdir(workspace)
        try:
            from backend.rag import embedding, ingestion, vectorstore, secure_retrieval
            from backend.security import document_store, audit
            from backend.security.hashing import compute_sha256_bytes
            from backend.api import query, documents

            report = {"workload": {"documents": 1000, "indexed_chunks": 150,
                                    "retrieval_top_k": 50, "embedding_batch": 16,
                                    "llm": "stubbed; no network request"}}
            report["model_load"], _ = measure(embedding.get_model, 1)
            text = "Enterprise guidelines require MFA. Access is reviewed every quarter. "
            report["embedding_batch_16"], embedded = measure(
                lambda: embedding.embed_chunks([{"text": text + str(i)} for i in range(16)]), 3)
            report["embedding_query"], query_vector = measure(
                lambda: embedding.embed_query("What are the enterprise access guidelines?"), 3)

            document_store.UPLOAD_DIR.mkdir(parents=True)
            metadata = {}
            chunks = []
            for i in range(1000):
                doc_id = f"DOC-{i:032X}"
                content = (text + f" Department {i}.").encode()
                name = doc_id + ".txt"
                (document_store.UPLOAD_DIR / name).write_bytes(content)
                digest = compute_sha256_bytes(content)
                metadata[doc_id] = {"document_id": doc_id, "stored_filename": name,
                                    "sha256": digest, "is_signed": False,
                                    "trust_status": "Suspicious", "access_level": "INTERNAL"}
                if i < 150:
                    chunks.append({"chunk_id": doc_id + "-0", "document_id": doc_id,
                                   "text": content.decode(), "embedding": embedded[i % 16]["embedding"],
                                   "sha256": digest, "trust_status": "Suspicious",
                                   "access_level": "INTERNAL"})
            report["metadata_write_1000"], _ = measure(lambda: document_store.save_metadata_store(metadata))
            report["vector_initialize"], _ = measure(vectorstore.get_collection, 1)
            report["vector_add_150"], _ = measure(lambda: vectorstore.add_chunks(chunks), 1)
            report["vector_search_150"], _ = measure(lambda: vectorstore.query_chunks(query_vector, 150))
            user = {"username": "profile_user", "role": "Employee", "clearance_tags": ["PUBLIC", "INTERNAL"]}
            with patch.object(document_store, "get_metadata_store", wraps=document_store.get_metadata_store) as reads:
                report["secure_retrieval_150"], results = measure(
                    lambda: secure_retrieval.secure_retrieve_chunks(query_vector, user, 50))
                report["secure_retrieval_150"]["metadata_reads_per_call"] = reads.call_count / 5
            assert len(results) == 50
            report["document_listing_1000"], inventory = measure(lambda: documents.list_documents(user), 3)
            assert inventory["count"] == 1000
            profiler = cProfile.Profile()
            profiler.runcall(secure_retrieval.secure_retrieve_chunks, query_vector, user, 50)
            output = io.StringIO()
            pstats.Stats(profiler, stream=output).sort_stats("cumulative").print_stats(18)
            report["retrieval_profile"] = output.getvalue()

            sample = Path("sample.txt")
            sample.write_text(text * 1000)
            report["ingest_68kb_unsigned"], _ = measure(lambda: ingestion.ingest_document(str(sample), sample.name), 3)
            report["audit_append"], _ = measure(lambda: audit.record_event("profile_user", "PROFILE"))
            report["audit_read"], _ = measure(audit.list_events)
            with patch.object(query, "generate_answer", return_value="Local benchmark stub; no provider called."):
                report["query_pipeline_stubbed_generation"], response = measure(
                    lambda: query.query_rag(query.QueryRequest(question="What are the access guidelines?", top_k=50), user), 3)
            assert len(response["sources"]) == 50
            report["limitations"] = ["Synthetic unsigned short documents; not production traffic",
                                      "Embeddings are real/local; vectors are reused to isolate retrieval scale",
                                      "Query calls endpoint function directly; excludes HTTP and JWT decoding",
                                      "Cold load measured once; warm timings use medians",
                                      "External generation excluded deliberately"]
            print(json.dumps(report, indent=2))
        finally:
            os.chdir(original_cwd)


if __name__ == "__main__":
    main()
