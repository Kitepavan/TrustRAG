"""Structured security events. No prompts, document text, tokens, or secrets are stored."""

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

AUDIT_DB = Path("data/security_audit.sqlite3")
logger = logging.getLogger(__name__)


@contextmanager
def _connect():
    AUDIT_DB.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(AUDIT_DB), timeout=5)
    try:
        AUDIT_DB.chmod(0o600)
        with connection:
            connection.execute("""CREATE TABLE IF NOT EXISTS events (
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                id TEXT NOT NULL, timestamp TEXT NOT NULL, actor TEXT NOT NULL,
                event_type TEXT NOT NULL, severity TEXT NOT NULL,
                request_id TEXT NOT NULL, details TEXT NOT NULL
            )""")
            yield connection
    finally:
        connection.close()


def record_event(actor: str, event_type: str, severity: str = "info",
                 request_id: str = "", **details) -> bool:
    """Append an event without allowing a telemetry failure to bypass enforcement."""
    try:
        with _connect() as connection:
            connection.execute(
                "INSERT INTO events (id, timestamp, actor, event_type, severity, request_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (uuid4().hex, datetime.now(timezone.utc).isoformat(), actor,
                 event_type, severity, request_id, json.dumps(details)),
            )
        return True
    except (OSError, sqlite3.Error):
        logger.exception("Security audit event could not be persisted")
        return False


def list_events(limit: int = 50, before: int | None = None,
                event_type: str | None = None, severity: str | None = None) -> dict:
    clauses, parameters = [], []
    for field, value in (("event_type", event_type), ("severity", severity)):
        if value:
            clauses.append(f"{field} = ?")
            parameters.append(value)
    if before is not None:
        clauses.append("sequence < ?")
        parameters.append(before)
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    with _connect() as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT * FROM events" + where + " ORDER BY sequence DESC LIMIT ?",
            [*parameters, limit + 1],
        ).fetchall()
    events = [dict(row) for row in rows[:limit]]
    for event in events:
        event["details"] = json.loads(event["details"])
    return {"events": events, "next_cursor": events[-1]["sequence"] if len(rows) > limit else None}
