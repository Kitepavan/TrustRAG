import chromadb
from pathlib import Path

DB_PATH = "data/chroma_db"

_client = None
_collection = None


def get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=DB_PATH)
        _collection = _client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def add_chunks(chunks: list[dict]):
    """Add embedded chunks to ChromaDB with security metadata."""
    collection = get_collection()

    ids = [c["chunk_id"] for c in chunks]
    documents = [c["text"] for c in chunks]
    embeddings = [c["embedding"] for c in chunks]
    metadatas = [
        {
            "document_id": str(c.get("document_id", "")),
            "page_number": int(c.get("page_number", 0)),
            "char_count": int(c.get("char_count", 0)),
            "sha256": str(c.get("sha256", "")),
            "signature_valid": bool(c.get("signature_valid", False)),
            "trust_status": str(c.get("trust_status", "Suspicious")),
            # Required for Defense Filter 2 (RBAC) to fire: without a stored
            # access_level every chunk defaults to INTERNAL and RBAC never blocks.
            "access_level": str(c.get("access_level", "INTERNAL")),
        }
        for c in chunks
    ]

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )
    return len(ids)


def query_chunks(query_embedding: list[float], top_k: int = 3) -> list[dict]:
    """Query ChromaDB for similar chunks."""
    collection = get_collection()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
    )

    chunks = []
    if results and "ids" in results and results["ids"]:
        for i in range(len(results["ids"][0])):
            chunks.append({
                "chunk_id": results["ids"][0][i],
                "text": results["documents"][0][i],
                "score": results["distances"][0][i],
                "metadata": results["metadatas"][0][i],
            })

    return chunks


def get_collection_count() -> int:
    return get_collection().count()
