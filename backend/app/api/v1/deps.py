"""Shared FastAPI dependencies: DB session, current partner/admin resolution,
and pagination parsing. Every authenticated router depends on one of
get_current_partner / get_current_admin — there is no generic
"get_current_user" that both scopes share, by design.
"""

from __future__ import annotations

import jwt
from fastapi import Depends, Header, Query
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.exceptions import AccountDeactivatedError, UnauthorizedError
from app.core.file_storage import DatabaseFileStorage, FileStorage
from app.core.security import TokenScope, TokenType, decode_token
from app.db.session import get_db
from app.models.admin import Admin
from app.models.partner import Partner
from app.repositories.admin_repo import AdminRepository
from app.repositories.partner_repo import PartnerRepository


def get_settings_dep() -> Settings:
    return get_settings()


def get_storage(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> FileStorage:
    return DatabaseFileStorage(db, settings.backend_base_url)


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Missing or malformed Authorization header.")
    return authorization.split(" ", 1)[1].strip()


def get_current_partner(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> Partner:
    token = _extract_bearer_token(authorization)
    try:
        payload = decode_token(token, TokenType.ACCESS, settings)
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Access token is invalid or expired.") from exc

    if payload.scope != TokenScope.PARTNER:
        raise UnauthorizedError("This endpoint requires a partner session.")

    partner = PartnerRepository(db).get_by_id(int(payload.subject))
    if partner is None:
        raise UnauthorizedError("Partner account no longer exists.")
    if not partner.is_active:
        raise AccountDeactivatedError()

    return partner


def get_current_admin(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> Admin:
    token = _extract_bearer_token(authorization)
    try:
        payload = decode_token(token, TokenType.ACCESS, settings)
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Access token is invalid or expired.") from exc

    if payload.scope != TokenScope.ADMIN:
        raise UnauthorizedError("This endpoint requires an admin session.")

    admin = AdminRepository(db).get_by_id(int(payload.subject))
    if admin is None:
        raise UnauthorizedError("Admin account no longer exists.")

    return admin


class Pagination:
    def __init__(self, page: int = Query(default=1, ge=1), limit: int = Query(default=20, ge=1, le=100)) -> None:
        self.page = page
        self.limit = limit


__all__ = [
    "get_db",
    "get_settings_dep",
    "get_storage",
    "get_current_partner",
    "get_current_admin",
    "Pagination",
]
