"""Aadhaar-at-rest encryption using AES-256-GCM.

Only encryption is exposed for application use today — no API route has a
product requirement to return a decrypted Aadhaar number, so the decrypt
helper exists solely for potential future authorized/audited access (e.g. a
manual admin support tool) and is not wired into any router.
"""

from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_NONCE_SIZE = 12


def _get_key(base64_key: str) -> bytes:
    key = base64.b64decode(base64_key)
    if len(key) != 32:
        raise ValueError("AADHAAR_ENCRYPTION_KEY must decode to exactly 32 bytes")
    return key


def encrypt_aadhaar(plain_aadhaar: str, base64_key: str) -> str:
    key = _get_key(base64_key)
    nonce = os.urandom(_NONCE_SIZE)
    ciphertext = AESGCM(key).encrypt(nonce, plain_aadhaar.encode("utf-8"), associated_data=None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_aadhaar(encrypted_value: str, base64_key: str) -> str:
    key = _get_key(base64_key)
    raw = base64.b64decode(encrypted_value)
    nonce, ciphertext = raw[:_NONCE_SIZE], raw[_NONCE_SIZE:]
    return AESGCM(key).decrypt(nonce, ciphertext, associated_data=None).decode("utf-8")


def last4(aadhaar: str) -> str:
    return aadhaar[-4:]
