"""Password hashing and JWT issuance/verification.

Password hashing uses bcrypt directly (not passlib) to avoid the well-known
passlib/bcrypt version-compatibility warnings and keep the dependency surface
small. JWTs are signed with HS256 using two distinct secrets — one for access
tokens, one for refresh tokens — so a leaked access-token secret cannot be
used to forge long-lived refresh tokens.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from enum import StrEnum
from typing import Any

import bcrypt
import jwt

from app.core.config import Settings


class TokenScope(StrEnum):
    PARTNER = "partner"
    ADMIN = "admin"


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # Malformed hash in storage — treat as a failed verification, not a crash.
        return False


def _encode(subject: str, scope: TokenScope, token_type: TokenType, secret: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "scope": scope.value,
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def create_access_token(subject: str, scope: TokenScope, settings: Settings) -> str:
    return _encode(
        subject,
        scope,
        TokenType.ACCESS,
        settings.jwt_access_secret,
        timedelta(minutes=settings.jwt_access_expires_minutes),
    )


def create_refresh_token(subject: str, scope: TokenScope, settings: Settings) -> str:
    return _encode(
        subject,
        scope,
        TokenType.REFRESH,
        settings.jwt_refresh_secret,
        timedelta(days=settings.jwt_refresh_expires_days),
    )


class TokenPayload:
    __slots__ = ("subject", "scope", "token_type")

    def __init__(self, subject: str, scope: TokenScope, token_type: TokenType) -> None:
        self.subject = subject
        self.scope = scope
        self.token_type = token_type


def decode_token(token: str, token_type: TokenType, settings: Settings) -> TokenPayload:
    """Decode and validate a JWT, raising jwt.PyJWTError on any failure.

    Callers (FastAPI dependencies) are responsible for translating decode
    failures into the appropriate HTTP error.
    """

    secret = settings.jwt_access_secret if token_type == TokenType.ACCESS else settings.jwt_refresh_secret
    payload = jwt.decode(token, secret, algorithms=["HS256"])

    if payload.get("type") != token_type.value:
        raise jwt.InvalidTokenError("Unexpected token type")

    return TokenPayload(
        subject=payload["sub"],
        scope=TokenScope(payload["scope"]),
        token_type=TokenType(payload["type"]),
    )
