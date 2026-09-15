from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import os

from backend.api.documents import router as documents_router
from backend.api.query import router as query_router
from backend.api.dashboard import router as dashboard_router
from backend.api.auth import router as auth_router
from backend.api.evaluation import router as evaluation_router

app = FastAPI(
    title="TrustRAG",
    description="Secure Retrieval-Augmented Generation Framework",
    version="0.1.0",
)

# CORS: allow only known frontend origins. Comma-separated TRUSTRAG_ALLOWED_ORIGINS
# overrides for production; a wildcard origin would let any site read the API.
_allowed_origins = [
    o.strip()
    for o in os.environ.get(
        "TRUSTRAG_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173"
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(query_router)
app.include_router(dashboard_router)
app.include_router(evaluation_router)


@app.get("/")
def root():
    return {
        "project": "TrustRAG",
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
