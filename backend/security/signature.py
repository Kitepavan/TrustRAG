"""
TrustRAG Security - Digital Signature Module (Ed25519)
Handles key pair generation, document signing, and signature verification.
"""

import base64
import os
from pathlib import Path
from typing import Optional, Tuple

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

# Default path for enterprise keypair
KEYS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "keys"
DEFAULT_PRIVATE_KEY_PATH = KEYS_DIR / "enterprise_privkey.pem"
DEFAULT_PUBLIC_KEY_PATH = KEYS_DIR / "enterprise_pubkey.pem"


def generate_ed25519_keypair() -> Tuple[ed25519.Ed25519PrivateKey, ed25519.Ed25519PublicKey]:
    """Generate a new Ed25519 private/public keypair."""
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    return private_key, public_key


def save_private_key_pem(private_key: ed25519.Ed25519PrivateKey, file_path: Path) -> None:
    """Save an Ed25519 private key to a PEM file."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    with open(file_path, "wb") as f:
        os.fchmod(f.fileno(), 0o600)
        f.write(pem)


def save_public_key_pem(public_key: ed25519.Ed25519PublicKey, file_path: Path) -> None:
    """Save an Ed25519 public key to a PEM file."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    with open(file_path, "wb") as f:
        f.write(pem)


def load_private_key_pem(file_path: Path) -> ed25519.Ed25519PrivateKey:
    """Load an Ed25519 private key from a PEM file."""
    with open(file_path, "rb") as f:
        data = f.read()
    key = serialization.load_pem_private_key(data, password=None)
    if not isinstance(key, ed25519.Ed25519PrivateKey):
        raise ValueError("Key is not an Ed25519 private key")
    return key


def load_public_key_pem(file_path: Path) -> ed25519.Ed25519PublicKey:
    """Load an Ed25519 public key from a PEM file."""
    with open(file_path, "rb") as f:
        data = f.read()
    key = serialization.load_pem_public_key(data)
    if not isinstance(key, ed25519.Ed25519PublicKey):
        raise ValueError("Key is not an Ed25519 public key")
    return key


def ensure_enterprise_keys() -> Tuple[ed25519.Ed25519PrivateKey, ed25519.Ed25519PublicKey]:
    """
    Ensure standard enterprise keypair exists in data/keys/.
    Generates them if they do not already exist.
    """
    if DEFAULT_PRIVATE_KEY_PATH.exists() and DEFAULT_PUBLIC_KEY_PATH.exists():
        priv = load_private_key_pem(DEFAULT_PRIVATE_KEY_PATH)
        pub = load_public_key_pem(DEFAULT_PUBLIC_KEY_PATH)
        if priv.public_key().public_bytes_raw() != pub.public_bytes_raw():
            raise ValueError("Enterprise keypair does not match")
        return priv, pub

    if DEFAULT_PRIVATE_KEY_PATH.exists() or DEFAULT_PUBLIC_KEY_PATH.exists():
        raise ValueError("Incomplete enterprise keypair; restore missing key instead of rotating automatically")
    priv, pub = generate_ed25519_keypair()
    save_private_key_pem(priv, DEFAULT_PRIVATE_KEY_PATH)
    save_public_key_pem(pub, DEFAULT_PUBLIC_KEY_PATH)
    return priv, pub


def sign_data(data: bytes, private_key: Optional[ed25519.Ed25519PrivateKey] = None) -> str:
    """
    Sign binary data using an Ed25519 private key.
    If private_key is omitted, uses the default enterprise key.
    Returns base64-encoded signature string.
    """
    if private_key is None:
        private_key, _ = ensure_enterprise_keys()
    
    signature_bytes = private_key.sign(data)
    return base64.b64encode(signature_bytes).decode("utf-8")


def verify_signature(
    data: bytes,
    signature_b64: str,
    public_key: Optional[ed25519.Ed25519PublicKey] = None,
) -> bool:
    """
    Verify a base64 Ed25519 signature against binary data.
    If public_key is omitted, uses the default enterprise public key.
    Returns True if valid, False if invalid or corrupt signature.
    """
    try:
        if public_key is None:
            public_key = load_public_key_pem(DEFAULT_PUBLIC_KEY_PATH)
        signature_bytes = base64.b64decode(signature_b64, validate=True)
        public_key.verify(signature_bytes, data)
        return True
    except (InvalidSignature, ValueError, OSError, TypeError):
        # InvalidSignature = bad signature; ValueError covers malformed base64.
        # Fails closed: any verification error is treated as untrusted.
        return False
