"""Login, token issuance, refresh, and password-change business logic.

Kept intentionally symmetric for partner and admin flows so the two scopes
are easy to reason about side by side, while remaining fully independent —
there is no shared "user" table or code path that conflates the two roles.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import jwt
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import AccountDeactivatedError, InvalidCredentialsError, UnauthorizedError
from app.core.security import (
    TokenScope,
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.admin import Admin
from app.models.partner import Partner
from app.repositories.admin_repo import AdminRepository
from app.repositories.partner_repo import PartnerRepository


@dataclass
class TokenPair:
    access_token: str
    refresh_token: str


def login_partner(db: Session, settings: Settings, mobile: str, password: str) -> tuple[Partner, TokenPair]:
    partner = PartnerRepository(db).get_by_mobile(mobile)
    if partner is None or not verify_password(password, partner.password_hash):
        raise InvalidCredentialsError()

    if not partner.is_active:
        raise AccountDeactivatedError()

    tokens = TokenPair(
        access_token=create_access_token(str(partner.id), TokenScope.PARTNER, settings),
        refresh_token=create_refresh_token(str(partner.id), TokenScope.PARTNER, settings),
    )
    return partner, tokens


def login_admin(db: Session, settings: Settings, mobile: str, password: str) -> tuple[Admin, TokenPair]:
    admin = AdminRepository(db).get_by_mobile(mobile)
    if admin is None or not verify_password(password, admin.password_hash):
        raise InvalidCredentialsError()

    tokens = TokenPair(
        access_token=create_access_token(str(admin.id), TokenScope.ADMIN, settings),
        refresh_token=create_refresh_token(str(admin.id), TokenScope.ADMIN, settings),
    )
    return admin, tokens


def refresh_access_token(db: Session, settings: Settings, refresh_token: str, expected_scope: TokenScope) -> str:
    """Validate a refresh token and issue a brand new access token.

    Re-checks that a partner is still active on every refresh so a
    deactivation takes effect immediately, even mid-session.
    """

    try:
        payload = decode_token(refresh_token, TokenType.REFRESH, settings)
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Refresh token is invalid or expired.") from exc

    if payload.scope != expected_scope:
        raise UnauthorizedError("Refresh token scope mismatch.")

    if payload.scope == TokenScope.PARTNER:
        partner = PartnerRepository(db).get_by_id(int(payload.subject))
        if partner is None:
            raise UnauthorizedError("Account no longer exists.")
        if not partner.is_active:
            raise AccountDeactivatedError()

    return create_access_token(payload.subject, payload.scope, settings)


def change_password(db: Session, account: Partner | Admin, new_password: str) -> None:
    """Shared by both the partner and admin `/change-password` routes —
    identical logic, just a different account table, since both models
    carry the same `password_hash` column."""

    account.password_hash = hash_password(new_password)
    db.flush()


def complete_onboarding(db: Session, partner: Partner) -> Partner:
    """Marks the first-login welcome tour as seen. Idempotent — replaying the
    tour from Profile/Help does not reset this, it just re-shows the modal
    client-side without touching server state."""

    if partner.onboarding_completed_at is None:
        partner.onboarding_completed_at = datetime.now(timezone.utc)
        db.flush()
    return partner
