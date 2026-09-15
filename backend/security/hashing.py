"""
TrustRAG Security - Hashing Module
Computes SHA-256 cryptographic digests for documents, files, and text chunks.
"""

import hashlib


def compute_sha256_bytes(data: bytes) -> str:
    """Compute the SHA-256 hex digest for a byte buffer."""
    hasher = hashlib.sha256()
    hasher.update(data)
    return hasher.hexdigest()


def compute_sha256_str(text: str) -> str:
    """Compute the SHA-256 hex digest for a UTF-8 string."""
    return compute_sha256_bytes(text.encode("utf-8"))


def compute_sha256_file(file_path: str, chunk_size: int = 65536) -> str:
    """Compute the SHA-256 hex digest of a file on disk reading in chunks."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(chunk_size):
            hasher.update(chunk)
    return hasher.hexdigest()
