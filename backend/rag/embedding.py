from sentence_transformers import SentenceTransformer

MODEL_PATH = "/home/pavan/AI-Models/embeddinggemma-300m"

_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_PATH)
    return _model


def embed_chunks(chunks: list[dict]) -> list[dict]:
    """Embed a list of chunks (each with 'text' key). Returns chunks with 'embedding' added."""
    model = get_model()
    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=False)

    for chunk, emb in zip(chunks, embeddings):
        chunk["embedding"] = emb.tolist()

    return chunks


def embed_query(query: str) -> list[float]:
    """Embed a single query string."""
    model = get_model()
    embedding = model.encode([query], show_progress_bar=False)
    return embedding[0].tolist()
