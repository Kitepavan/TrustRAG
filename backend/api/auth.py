"""
TrustRAG API — Authentication Router
Endpoints for user login, current user info, and available demo persona accounts.
"""

import os

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.security.auth import (
    authenticate_user,
    create_jwt_token,
    get_current_user_required,
    DEMO_USERS,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    """Log in with username and password to retrieve a JWT token.

    Sync route: the scrypt hash verification is CPU-heavy and must not block
    the event loop (FastAPI runs sync handlers in the threadpool).
    """
    user = authenticate_user(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_jwt_token({
        "username": user["username"],
        "role": user["role"],
        "clearance_level": user["clearance_level"],
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
            "clearance_level": user["clearance_level"],
            "clearance_tags": user["clearance_tags"],
        },
    }


@router.get("/me")
async def get_me(user: Dict[str, Any] = Depends(get_current_user_required)):
    """Get current authenticated user profile."""
    return {
        "username": user["username"],
        "full_name": user["full_name"],
        "role": user["role"],
        "clearance_level": user["clearance_level"],
        "clearance_tags": user["clearance_tags"],
    }


@router.get("/personas")
async def list_demo_personas():
    """List available demo personas for the RBAC switcher in the UI.

    Deliberately excludes passwords: this endpoint is reachable before login and
    must not act as a credential oracle. The demo login form posts real credentials.
    """
    return [
        {
            "username": u["username"],
            "full_name": u["full_name"],
            "role": u["role"],
            "clearance_tags": u["clearance_tags"],
        }
        for u in DEMO_USERS.values()
    ]


@router.get("/demo-status")
async def get_demo_status():
    """Report whether fixed demo passwords are enabled.

    Drives the 1-click demo login in the UI so it is hidden when demo mode is
    off and those fixed passwords would fail.
    """
    return {"demo_mode": os.environ.get("TRUSTRAG_DEMO_MODE", "false").lower() == "true"}
