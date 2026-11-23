"""Partner authentication: login, refresh, logout, change password.

The refresh token is never exposed to JavaScript — it travels only as an
httpOnly cookie scoped to the refresh endpoint's own path, so it cannot be
read by client-side code and is not sent on unrelated requests.

Deliberately does NOT use `from __future__ import annotations`: slowapi's
`@limiter.limit(...)` wrapper's own `__globals__` (not this module's) is
what FastAPI/Pydantic ends up resolving string annotations against, which
breaks forward-ref lookups for names like `LoginRequest`. Keeping real
annotation objects here sidesteps that entirely.
"""

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import UnauthorizedError
from app.core.file_storage import FileStorage
from app.core.rate_limit import limiter
from app.core.security import TokenScope
from app.services import auth_service, partner_service
from app.api.v1.deps import get_current_partner, get_db, get_settings_dep, get_storage
from app.models.partner import Partner
from app.schemas.auth import ChangePasswordRequest, LoginRequest, LoginResponseData, PartnerOut, PartnerProfileOut
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "partner_refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"


def _set_refresh_cookie(response: Response, token: str, settings: Settings) -> None:
    # In production the frontend (Vercel) and backend (Render) are on
    # different registrable domains, so every refresh call is a cross-site
    # request. `SameSite=Lax` cookies are withheld from cross-site
    # fetch/XHR requests (they only ride along on top-level navigations),
    # so a `Lax` refresh cookie is silently dropped on every page reload —
    # `SameSite=None` (which requires `Secure`) is required for it to be
    # sent. Locally, frontend and backend share `localhost` as the
    # registrable domain, so `Lax` + non-secure still works for dev over
    # plain HTTP.
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
def login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> ApiResponse[LoginResponseData]:
    partner, tokens = auth_service.login_partner(db, settings, payload.mobile, payload.password)
    db.commit()

    _set_refresh_cookie(response, tokens.refresh_token, settings)

    return ApiResponse(
        data=LoginResponseData(access_token=tokens.access_token, partner=PartnerOut.model_validate(partner)),
        message="Login successful",
    )


@router.post("/refresh", response_model=ApiResponse[LoginResponseData])
def refresh(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> ApiResponse[LoginResponseData]:
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise UnauthorizedError("No refresh token present.")

    access_token = auth_service.refresh_access_token(db, settings, refresh_token, TokenScope.PARTNER)
    return ApiResponse(data=LoginResponseData(access_token=access_token))


@router.post("/logout", response_model=ApiResponse[None])
def logout(response: Response, settings: Settings = Depends(get_settings_dep)) -> ApiResponse[None]:
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
    )
    return ApiResponse(message="Logged out")


@router.post("/change-password", response_model=ApiResponse[None])
def change_password_route(
    payload: ChangePasswordRequest,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> ApiResponse[None]:
    auth_service.change_password(db, partner, payload.new_password)
    db.commit()
    return ApiResponse(message="Password updated successfully")


@router.get("/me", response_model=ApiResponse[PartnerProfileOut])
def get_me(
    partner: Partner = Depends(get_current_partner),
    storage: FileStorage = Depends(get_storage),
) -> ApiResponse[PartnerProfileOut]:
    return ApiResponse(
        data=PartnerProfileOut(
            id=partner.id,
            name=partner.name,
            mobile=partner.mobile,
            is_active=partner.is_active,
            state_id=partner.state_id,
            city_id=partner.city_id,
            tahsil_id=partner.tahsil_id,
            onboarding_completed_at=partner.onboarding_completed_at,
            state_name=partner.state.name if partner.state else None,
            city_name=partner.city.name if partner.city else None,
            tahsil_name=partner.tahsil.name if partner.tahsil else None,
            photo_url=partner_service.resolve_photo_url(storage, partner),
            created_at=partner.created_at,
        )
    )


@router.post("/onboarding/complete", response_model=ApiResponse[PartnerOut])
def complete_onboarding_route(
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> ApiResponse[PartnerOut]:
    partner = auth_service.complete_onboarding(db, partner)
    db.commit()
    return ApiResponse(data=PartnerOut.model_validate(partner))
