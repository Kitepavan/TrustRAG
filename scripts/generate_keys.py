#!/usr/bin/env python3
"""
TrustRAG Utility — Keypair Generator & Document Signing Tool
Generates enterprise Ed25519 keys and signs documents for security evaluation.
"""

import argparse
import os
from pathlib import Path
import sys

# Ensure backend package is in python path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.security.signature import (
    ensure_enterprise_keys,
    sign_data,
    verify_signature,
    DEFAULT_PUBLIC_KEY_PATH,
    DEFAULT_PRIVATE_KEY_PATH,
)


def main():
    parser = argparse.ArgumentParser(description="TrustRAG Ed25519 Key Generator & Signing Tool")
    parser.add_argument("--gen-keys", action="store_true", help="Generate enterprise keypair if missing")
    parser.add_argument("--sign", type=str, help="Path to file to sign")
    parser.add_argument("--verify", type=str, help="Path to file to verify")
    parser.add_argument("--signature", type=str, help="Base64 signature for verification")
    args = parser.parse_args()

    priv, pub = ensure_enterprise_keys()
    print(f"Enterprise Private Key: {DEFAULT_PRIVATE_KEY_PATH}")
    print(f"Enterprise Public Key:  {DEFAULT_PUBLIC_KEY_PATH}")

    if args.sign:
        sign_path = Path(args.sign)
        if not sign_path.exists():
            print(f"Error: File {sign_path} does not exist.")
            sys.exit(1)
        with open(sign_path, "rb") as f:
            data = f.read()
        sig = sign_data(data, priv)
        print(f"\nDocument: {sign_path.name}")
        print(f"Signature (Ed25519 base64):\n{sig}\n")

    if args.verify and args.signature:
        ver_path = Path(args.verify)
        if not ver_path.exists():
            print(f"Error: File {ver_path} does not exist.")
            sys.exit(1)
        with open(ver_path, "rb") as f:
            data = f.read()
        valid = verify_signature(data, args.signature, pub)
        print(f"Verification Result: {'VALID' if valid else 'INVALID'}")


if __name__ == "__main__":
    main()
