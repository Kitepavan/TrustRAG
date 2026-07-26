import httpx

LLM_BASE_URL = "https://api.z.ai/api/paas/v4/"
LLM_API_KEY = "***REMOVED***"
LLM_MODEL = "glm-4.7-flash"


def generate_answer(query: str, context_chunks: list[dict]) -> str:
    """Send query + context to Zai API and get an answer."""
    context = "\n\n---\n\n".join(
        f"[Source: {c['metadata'].get('document_id', 'unknown')}, page {c['metadata'].get('page_number', '?')}]\n{c['text']}"
        for c in context_chunks
    )

    messages = [
        {
            "role": "system",
            "content": "You are a helpful assistant. Answer the user's question based ONLY on the provided context. If the context doesn't contain enough information, say 'I don't have enough information to answer that.'",
        },
        {
            "role": "user",
            "content": f"CONTEXT:\n{context}\n\nQUESTION: {query}",
        },
    ]

    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 2048,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{LLM_BASE_URL}chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {LLM_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"LLM error: {e}"
