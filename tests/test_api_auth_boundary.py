"""HTTP authentication boundary regression checks; no model or external services."""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.security.auth import create_jwt_token


@pytest.mark.parametrize("method,path", [
    ("GET", "/dashboard/stats"),
    ("GET", "/status"),
    ("GET", "/auth/me"),
    ("GET", "/evaluation/run"),
    ("POST", "/evaluation/run"),
])
@pytest.mark.parametrize("credential", [None, "invalid", "expired", "valid"])
def test_protected_endpoint_auth(method, path, credential, monkeypatch):
    monkeypatch.setattr("backend.api.dashboard.get_collection_count", lambda: 0)
    monkeypatch.setattr("backend.api.dashboard.get_metadata_store", lambda: {})
    monkeypatch.setattr("backend.api.evaluation.SecurityEvaluator.run_benchmark_suite", lambda: {"scenarios": []})
    headers = {}
    if credential:
        token = credential
        if credential in ("valid", "expired"):
            token = create_jwt_token({"username": "emp_user"}, expires_in_seconds=60 if credential == "valid" else -60)
        headers["Authorization"] = f"Bearer {token}"
    with TestClient(app) as client:
        response = client.request(method, path, headers=headers)
    assert response.status_code == (200 if credential == "valid" else 401)
