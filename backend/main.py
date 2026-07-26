from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.documents import router as documents_router
from backend.api.query import router as query_router
from backend.api.dashboard import router as dashboard_router

app = FastAPI(
    title="TrustRAG",
    description="Secure Retrieval-Augmented Generation Framework",
    version="0.1.0",
)

# CORS middleware for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(query_router)
app.include_router(dashboard_router)


@app.get("/")
def root():
    return {
        "project": "TrustRAG",
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
