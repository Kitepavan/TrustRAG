from fastapi import FastAPI

from backend.api.documents import router as documents_router
from backend.api.query import router as query_router

app = FastAPI(
    title="TrustRAG",
    description="Secure Retrieval-Augmented Generation Framework",
    version="0.1.0",
)

app.include_router(documents_router)
app.include_router(query_router)


@app.get("/")
def root():
    return {
        "project": "TrustRAG",
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
