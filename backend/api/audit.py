"""Read-only, privileged access to security telemetry."""

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.security.audit import list_events
from backend.security.auth import get_current_user_required, user_can_run_baseline

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/events")
def get_audit_events(
    limit: int = Query(50, ge=1, le=100),
    before: int | None = Query(None, ge=1),
    event_type: str | None = Query(None, max_length=64),
    severity: str | None = Query(None, pattern="^(info|warning|error)$"),
    user: dict = Depends(get_current_user_required),
):
    """Security staff may inspect cross-user activity; other roles cannot."""
    if not user_can_run_baseline(user):
        raise HTTPException(status_code=403, detail="Audit logs require Admin or IT_Security clearance.")
    return list_events(limit, before, event_type, severity)
