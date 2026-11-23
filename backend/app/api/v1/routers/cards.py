"""Printing history and the public QR scan endpoint.

Actually printing a card (generating + logging the PDF) is admin-only —
see `admin_customers.py` for `GET /admin/customers/{id}/print`. Partners can
only read their own print history here, never trigger a print themselves.

The public route (`/cards/public/{card_id}`) is the one endpoint in this
router that takes no partner dependency at all — everything else is
partner-scoped by construction.

Deliberately does NOT use `from __future__ import annotations` — see the
comment in `auth.py` for why that combination breaks under slowapi's
`@limiter.limit(...)` decorator.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.v1.deps import Pagination, get_current_admin, get_current_partner, get_db, get_settings_dep, get_storage
from app.core.config import Settings
from app.core.file_storage import FileStorage
from app.core.rate_limit import limiter
from app.models.admin import Admin
from app.models.partner import Partner
from app.repositories.customer_repo import CustomerRepository
from app.repositories.print_log_repo import PrintLogRepository
from app.schemas.card import CardBrandConfigOut, PartnerDashboardSummaryOut, PrintLogItem, PublicCardStatusOut
from app.schemas.card_settings import CardSettingsOut, CardSettingsUpdateIn
from app.schemas.common import ApiResponse, build_meta
from app.services import card_service, card_settings_service, customer_service

router = APIRouter(prefix="/cards", tags=["cards"])


def _to_print_log_item(log, customer, storage: FileStorage) -> PrintLogItem:
    return PrintLogItem(
        customer_id=customer.id,
        card_id=customer.card_id,
        name=customer.name,
        father_husband=customer.father_husband,
        dob=customer.dob,
        gender=customer.gender,
        photo_url=customer_service.resolve_photo_url(storage, customer),
        printed_at=log.printed_at,
    )


@router.get("/today", response_model=ApiResponse[list[PrintLogItem]])
def cards_printed_today(
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
) -> ApiResponse[list[PrintLogItem]]:
    rows = PrintLogRepository(db).list_today_for_partner(partner.id)
    return ApiResponse(data=[_to_print_log_item(log, customer, storage) for log, customer in rows])


@router.get("/printings", response_model=ApiResponse[list[PrintLogItem]])
def printing_history(
    pagination: Pagination = Depends(),
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
) -> ApiResponse[list[PrintLogItem]]:
    rows, total = PrintLogRepository(db).list_for_partner(partner.id, pagination.page, pagination.limit)
    return ApiResponse(
        data=[_to_print_log_item(log, customer, storage) for log, customer in rows],
        meta=build_meta(pagination.page, pagination.limit, total),
    )


@router.get("/dashboard-summary", response_model=ApiResponse[PartnerDashboardSummaryOut])
def partner_dashboard_summary(
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> ApiResponse[PartnerDashboardSummaryOut]:
    customer_repo = CustomerRepository(db)
    print_repo = PrintLogRepository(db)

    return ApiResponse(
        data=PartnerDashboardSummaryOut(
            total_customers=customer_repo.count_for_partner(partner.id),
            customers_registered_today=len(customer_repo.list_created_today(partner.id)),
            cards_printed_today=print_repo.count_today_for_partner(partner.id),
            total_prints=print_repo.count_for_partner(partner.id),
        )
    )


@router.get("/public/{card_id}", response_model=ApiResponse[PublicCardStatusOut])
@limiter.limit("200/minute")
def public_card_status(
    request: Request,
    card_id: str,
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
) -> ApiResponse[PublicCardStatusOut]:
    result = card_service.get_public_card_status(db, storage, card_id)
    return ApiResponse(data=result)


@router.get("/brand-config", response_model=ApiResponse[CardBrandConfigOut])
def card_brand_config(
    db: Session = Depends(get_db), settings: Settings = Depends(get_settings_dep)
) -> ApiResponse[CardBrandConfigOut]:
    """Public, unauthenticated — organisation-level card content (facilities,
    disclaimer, fee, helpline) used to render the live card preview in the
    partner app. See `card_service.get_card_brand_config` for why this and
    the printed PDF read from the exact same settings."""

    return ApiResponse(data=card_service.get_card_brand_config(db, settings))


# Admin-editable subset of the above (front mobile, back helpline,
# registration fee, facilities) — the equivalent of the reference tool's
# "Card Settings" tab. Kept in this module, next to the reader that serves
# the same content publicly, rather than a separate admin_cards.py file.
admin_router = APIRouter(prefix="/admin/card-settings", tags=["admin-card-settings"])


@admin_router.get("", response_model=ApiResponse[CardSettingsOut])
def admin_get_card_settings(
    db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> ApiResponse[CardSettingsOut]:
    return ApiResponse(data=card_settings_service.get_card_settings(db))


@admin_router.put("", response_model=ApiResponse[CardSettingsOut])
def admin_update_card_settings(
    payload: CardSettingsUpdateIn,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[CardSettingsOut]:
    result = card_settings_service.update_card_settings(db, payload)
    db.commit()
    return ApiResponse(data=result, message="Card settings updated successfully.")
