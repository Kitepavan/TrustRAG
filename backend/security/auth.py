"""
TrustRAG Security — Authentication & Role-Based Access Control (RBAC) Module
Provides lightweight JWT authentication and clearance level verification for document retrieval.
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Dict, Any, Optional, List

from dotenv import load_dotenv
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

# Signing secret is sourced from the environment (see .env.example) and is never
# committed to the repository. Token operations fail closed if it is unset.
SECRET_KEY = os.environ.get("TRUSTRAG_JWT_SECRET", "").strip()
ALGORITHM = "HS256"

# Roles permitted to run unfiltered "baseline" retrieval (academic comparison mode).
PRIVILEGED_ROLES = {"Admin", "IT_Security"}

# Demo persona accounts
DEMO_USERS: Dict[str, Dict[str, Any]] = {
    "emp_user": {
        "username": "emp_user",
        "password": "emp123",
        "full_name": "Standard Employee",
        "role": "Employee",
        "clearance_level": 1,
        "clearance_tags": ["PUBLIC", "INTERNAL"],
    },
    "hr_user": {
        "username": "hr_user",
        "password": "hr123",
        "full_name": "HR Specialist",
        "role": "HR",
        "clearance_level": 2,
        "clearance_tags": ["PUBLIC", "INTERNAL", "HR_CONFIDENTIAL"],
    },
    "sec_admin": {
        "username": "sec_admin",
        "password": "sec123",
        "full_name": "IT Security Officer",
        "role": "IT_Security",
        "clearance_level": 3,
        "clearance_tags": ["PUBLIC", "INTERNAL", "IT_SEC_CONFIDENTIAL"],
    },
    "admin": {
        "username": "admin",
        "password": "admin123",
        "full_name": "Enterprise System Administrator",
        "role": "Admin",
        "clearance_level": 4,
        "clearance_tags": ["PUBLIC", "INTERNAL", "HR_CONFIDENTIAL", "IT_SEC_CONFIDENTIAL", "RESTRICTED"],
    },
}

security_bearer = HTTPBearer(auto_error=False)


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _base64url_decode(data_str: str) -> bytes:
    padding = "=" * (4 - (len(data_str) % 4))
    return base64.urlsafe_b64decode(data_str + padding)


def create_jwt_token(payload: dict, expires_in_seconds: int = 86400) -> str:
    """Create a signed JWT token using HMAC-SHA256."""
    if not SECRET_KEY:
        raise RuntimeError("TRUSTRAG_JWT_SECRET is not set; cannot sign tokens.")
    header = {"alg": "HS256", "typ": "JWT"}
    payload_copy = dict(payload)
    payload_copy["exp"] = int(time.time()) + expires_in_seconds

    header_b64 = _base64url_encode(json.dumps(header).encode("utf-8"))
    payload_b64 = _base64url_encode(json.dumps(payload_copy).encode("utf-8"))

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_jwt_token(token: str) -> Optional[dict]:
    """Decode and verify a signed JWT token."""
    if not SECRET_KEY:
        return None
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()

        if not hmac.compare_digest(_base64url_encode(expected_sig), sig_b64):
            return None

        payload = json.loads(_base64url_decode(payload_b64).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None

        return payload
    except Exception:
        return None


def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user credentials against DEMO_USERS dictionary."""
    user = DEMO_USERS.get(username)
    if user and secrets.compare_digest(user["password"], password):
        return user
    return None


def check_rbac_permission(user_clearance_tags: List[str], required_access_level: str) -> bool:
    """
    Verify if user clearance tags permit accessing a document with required_access_level.
    """
    if not required_access_level or required_access_level.upper() in ["PUBLIC", "INTERNAL"]:
        return True
    return required_access_level.upper() in [tag.upper() for tag in user_clearance_tags]


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> Dict[str, Any]:
    """Dependency that extracts user from Bearer JWT token if present, else defaults to Guest Employee."""
    if credentials and credentials.credentials:
        payload = decode_jwt_token(credentials.credentials)
        if payload and "username" in payload and payload["username"] in DEMO_USERS:
            return DEMO_USERS[payload["username"]]

    # Default fallback for unauthenticated requests
    return DEMO_USERS["emp_user"]


def user_can_run_baseline(user: Dict[str, Any]) -> bool:
    """Only privileged roles may run unfiltered baseline retrieval."""
    return user.get("role") in PRIVILEGED_ROLES


async def get_current_user_required(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> Dict[str, Any]:
    """Dependency that requires a valid Bearer JWT token; rejects anonymous callers with 401."""
    if credentials and credentials.credentials:
        payload = decode_jwt_token(credentials.credentials)
        if payload and "username" in payload and payload["username"] in DEMO_USERS:
            return DEMO_USERS[payload["username"]]
    raise HTTPException(status_code=401, detail="Not authenticated")
