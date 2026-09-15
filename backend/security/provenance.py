"""
TrustRAG Security - Provenance Tracking Module
Records document lineage, integrity hashes, signature status, and audit history.
"""

from datetime import datetime, timezone
import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

PROVENANCE_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "provenance_log.json"


class ProvenanceRecord(BaseModel):
    """Data model representing the provenance record of an ingested document."""
    document_id: str
    filename: str
    sha256_hash: str
    signature_valid: bool
    signer_id: str = "enterprise_sec_key_01"
    uploader: str = "system_admin"
    upload_timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    version: int = 1
    trust_status: str = "Trusted"  # "Trusted", "Suspicious", "Quarantined"
    notes: Optional[str] = None


class ProvenanceTracker:
    """Manages recording and reading document provenance records."""

    def __init__(self, log_path: Path = PROVENANCE_FILE):
        self.log_path = log_path
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.log_path.exists():
            self._save_all({})

    def _load_all(self) -> Dict[str, dict]:
        """Load all provenance records from JSON storage."""
        if not self.log_path.exists():
            return {}
        try:
            with open(self.log_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}

    def _save_all(self, records: Dict[str, dict]) -> None:
        """Atomic save of records dictionary (write tmp + fsync + os.replace)."""
        tmp_path = self.log_path.with_suffix(self.log_path.suffix + ".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, self.log_path)

    def record_provenance(self, record: ProvenanceRecord) -> None:
        """Record or update a document's provenance record."""
        records = self._load_all()
        records[record.document_id] = record.model_dump()
        self._save_all(records)

    def get_provenance(self, document_id: str) -> Optional[ProvenanceRecord]:
        """Retrieve a provenance record by document_id."""
        records = self._load_all()
        data = records.get(document_id)
        if data:
            return ProvenanceRecord(**data)
        return None

    def list_records(self) -> List[ProvenanceRecord]:
        """List all stored provenance records."""
        records = self._load_all()
        return [ProvenanceRecord(**val) for val in records.values()]


# Global tracker instance
provenance_tracker = ProvenanceTracker()
