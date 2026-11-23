"""Admin authentication: login, refresh, logout.

Deliberately does NOT use `from __future__ import annotations` — see the
comment in `auth.py` for why that combination breaks under slowapi's
`@limiter.limit(...)` decorator.
"""

from fastapi import APIRouter, Depends, File, Request, Response, UploadFile
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import UnauthorizedError, ValidationError
from app.core.file_storage import FileStorage
from app.core.rate_limit import limiter
from app.core.security import TokenScope
from app.services import admin_service, auth_service
from app.api.v1.deps import get_current_admin, get_db, get_settings_dep, get_storage
from app.models.admin import Admin
from app.schemas.auth import AdminOut, AdminProfileOut, ChangePasswordRequest, LoginRequest, LoginResponseData
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])

REFRESH_COOKIE_NAME = "admin_refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/admin/auth"


def _set_refresh_cookie(response: Response, token: str, settings: Settings) -> None:
    # See the matching comment in `auth.py::_set_refresh_cookie` — the
    # cross-origin Vercel/Render split means the refresh cookie needs
    # `SameSite=None` (+ `Secure`) in production or the browser drops it
    # on every reload, which was logging admins out too.
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
        path=REFRESH_COOKIE_PATH,
        max_age=settings.jwt_refresh_expires_days * 24 * 60 * 60,
    )


@router.post("/login", response_model=ApiResponse[LoginResponseData])
@limiter.limit("5/15minutes")
def admin_login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> ApiResponse[LoginResponseData]:
    admin, tokens = auth_service.login_admin(db, settings, payload.mobile, payload.password)
    db.commit()

    _set_refresh_cookie(response, tokens.refresh_token, settings)

    return ApiResponse(
        data=LoginResponseData(access_token=tokens.access_token, admin=AdminOut.model_validate(admin)),
        message="Login successful",
    )


@router.post("/refresh", response_model=ApiResponse[LoginResponseData])
def admin_refresh(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> ApiResponse[LoginResponseData]:
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise UnauthorizedError("No refresh token present.")

    access_token = auth_service.refresh_access_token(db, settings, refresh_token, TokenScope.ADMIN)
    return ApiResponse(data=LoginResponseData(access_token=access_token))


@router.post("/logout", response_model=ApiResponse[None])
def admin_logout(response: Response, settings: Settings = Depends(get_settings_dep)) -> ApiResponse[None]:
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
    )
    return ApiResponse(message="Logged out")


@router.post("/change-password", response_model=ApiResponse[None])
def admin_change_password_route(
    payload: ChangePasswordRequest,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[None]:
    auth_service.change_password(db, admin, payload.new_password)
    db.commit()
    return ApiResponse(message="Password updated successfully")


def _to_profile(admin: Admin, storage: FileStorage) -> AdminProfileOut:
    return AdminProfileOut(
        id=admin.id,
        name=admin.name,
        mobile=admin.mobile,
        created_at=admin.created_at,
        photo_url=admin_service.resolve_photo_url(storage, admin),
    )


@router.get("/me", response_model=ApiResponse[AdminProfileOut])
def get_admin_me(
    admin: Admin = Depends(get_current_admin),
    storage: FileStorage = Depends(get_storage),
) -> ApiResponse[AdminProfileOut]:
    return ApiResponse(data=_to_profile(admin, storage))


@router.post("/me/photo", response_model=ApiResponse[AdminProfileOut])
def update_admin_photo_route(
    photo: UploadFile = File(...),
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings_dep),
) -> ApiResponse[AdminProfileOut]:
    photo_bytes = photo.file.read()
    if not photo_bytes:
        raise ValidationError("No photo file was uploaded.")

    admin = admin_service.update_admin_photo(db, storage, admin, photo_bytes, settings.max_photo_size_mb)
    db.commit()
    return ApiResponse(data=_to_profile(admin, storage), message="Profile photo updated")
