"""
TrustRAG — shared pytest configuration.

Ensures a JWT signing secret exists before any backend module is imported, so the
fail-closed behavior in auth.py does not break the suite in environments where .env
is not loaded. Tests create their own tokens, so any stable value is fine here.
"""

import os

os.environ.setdefault("TRUSTRAG_JWT_SECRET", "trustrag-test-signing-secret")
