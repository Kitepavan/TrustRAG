"""
TrustRAG API — Authentication Router
Endpoints for user login, current user info, and available demo persona accounts.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.security.auth import (
    authenticate_user,
    create_jwt_token,
    get_current_user_optional,
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
async def login(req: LoginRequest):
    """Log in with username and password to retrieve a JWT token."""
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
async def get_me(user: Dict[str, Any] = Depends(get_current_user_optional)):
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
