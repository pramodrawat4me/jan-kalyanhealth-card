"""Admin "Customer Overview" — cross-partner search, detail, printing, and
CSV export.

Uses `AdminCustomerRepository`, which is the only repository allowed to
query customers without a partner_id filter, and only admin-authenticated
routes may reach it. Card printing lives here (not in `cards.py`) because
printing is admin-only by design — partners can view a read-only profile
but cannot generate the printable card themselves.
"""

from __future__ import annotations

import csv
import io
import re
import unicodedata
from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.api.v1.deps import Pagination, get_current_admin, get_db, get_settings_dep, get_storage
from app.core.config import Settings
from app.core.exceptions import NotFoundError
from app.core.file_storage import FileStorage
from app.models.admin import Admin
from app.repositories.admin_customer_repo import AdminCustomerRepository
from app.repositories.admin_repo import AdminRepository
from app.repositories.partner_repo import PartnerRepository
from app.repositories.print_log_repo import PrintLogRepository
from app.schemas.card import CardActivityOut
from app.schemas.common import ApiResponse, build_meta
from app.schemas.customer import AdminCustomerOut, BatchPrintIn
from app.services import card_service, customer_service

router = APIRouter(prefix="/admin/customers", tags=["admin-customers"])


def _partner_names(db: Session, partner_ids: list[int]) -> dict[int, str]:
    repo = PartnerRepository(db)
    names: dict[int, str] = {}
    for pid in set(partner_ids):
        partner = repo.get_by_id(pid)
        names[pid] = partner.name if partner else "-"
    return names


def _to_admin_out(
    customer, storage: FileStorage, partner_name: str, last_printed_at: datetime | None = None
) -> AdminCustomerOut:
    return AdminCustomerOut(
        id=customer.id,
        card_id=customer.card_id,
        partner_id=customer.partner_id,
        partner_name=partner_name,
        name=customer.name,
        father_husband=customer.father_husband,
        mobile=customer.mobile,
        aadhaar_last4=customer.aadhaar_last4,
        dob=customer.dob,
        gender=customer.gender,
        address=customer.address,
        city_id=customer.city_id,
        city_name=customer.city.name if customer.city else None,
        photo_url=customer_service.resolve_photo_url(storage, customer),
        entry_date=customer.entry_date,
        validity_date=customer.validity_date,
        last_printed_at=last_printed_at,
    )


@router.get("", response_model=ApiResponse[list[AdminCustomerOut]])
def list_customers(
    pagination: Pagination = Depends(),
    search: str | None = None,
    partner_id: int | None = None,
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[list[AdminCustomerOut]]:
    items, total = AdminCustomerRepository(db).search(pagination.page, pagination.limit, search, partner_id)
    names = _partner_names(db, [c.partner_id for c in items])
    print_map = PrintLogRepository(db).last_printed_map([c.id for c in items])
    return ApiResponse(
        data=[_to_admin_out(c, storage, names[c.partner_id], print_map.get(c.id)) for c in items],
        meta=build_meta(pagination.page, pagination.limit, total),
    )


@router.get("/export")
def export_customers_csv(
    search: str | None = None,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> StreamingResponse:
    repo = AdminCustomerRepository(db)
    partner_repo = PartnerRepository(db)
    partner_cache: dict[int, str] = {}

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["Card ID", "Name", "Father/Husband", "Mobile", "Gender", "DOB", "City ID", "Partner", "Entry Date", "Validity Date"]
    )
    for customer in repo.iter_all(search):
        if customer.partner_id not in partner_cache:
            partner = partner_repo.get_by_id(customer.partner_id)
            partner_cache[customer.partner_id] = partner.name if partner else "-"
        writer.writerow(
            [
                customer.card_id,
                customer.name,
                customer.father_husband,
                customer.mobile,
                customer.gender.value,
                customer.dob.strftime("%d-%m-%Y"),
                customer.city_id,
                partner_cache[customer.partner_id],
                customer.entry_date.strftime("%d-%m-%Y"),
                customer.validity_date.strftime("%d-%m-%Y"),
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=customers_export.csv"},
    )


@router.post("/print-batch")
def print_cards_batch(
    payload: BatchPrintIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    storage: FileStorage = Depends(get_storage),
    admin: Admin = Depends(get_current_admin),
) -> Response:
    """Admin "print selected": one combined A4 PDF with four customers per
    page (front + back side by side per row). Each customer in the batch
    gets a print-log entry, exactly as if printed individually."""

    repo = AdminCustomerRepository(db)
    customers = []
    missing: list[int] = []
    seen: set[int] = set()
    for customer_id in payload.customer_ids:
        if customer_id in seen:
            continue
        seen.add(customer_id)
        customer = repo.get_by_id(customer_id)
        if customer is None:
            missing.append(customer_id)
        else:
            customers.append(customer)
    if missing:
        raise NotFoundError(f"Customers not found: {', '.join(str(m) for m in missing)}")

    pdf_bytes = card_service.generate_and_log_batch_pdf(db, settings, storage, customers, admin_id=admin.id)
    db.commit()

    filename = f"cards_batch_{datetime.now().strftime('%d-%m-%Y_%H%M')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# NOTE: `/{customer_id}...` routes below must stay registered *after* every
# static-segment route above (`/export`, `/print-batch`, and `` itself) —
# FastAPI matches routes in declaration order, so a path-param route
# declared first would swallow requests like `/admin/customers/export` as
# customer_id="export" and fail int conversion instead of reaching the
# real handler.


def _get_customer_or_404(repo: AdminCustomerRepository, customer_id: int):
    customer = repo.get_by_id(customer_id)
    if customer is None:
        raise NotFoundError("Customer not found.")
    return customer


def _card_pdf_filename(customer_name: str, card_id: str) -> str:
    """`<Customer Name>_<Card ID>.pdf` so downloads are identifiable by
    who they belong to instead of a bare card ID. Transliterates to a safe
    ASCII slug for the plain `filename` fallback (older browsers) — the
    caller also sends a UTF-8 `filename*` so the customer's real name
    (Hindi included) shows up wherever it's supported."""

    ascii_name = unicodedata.normalize("NFKD", customer_name).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^A-Za-z0-9]+", "_", ascii_name).strip("_") or "customer"
    return f"{slug}_{card_id}.pdf"


@router.get("/{customer_id}", response_model=ApiResponse[AdminCustomerOut])
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[AdminCustomerOut]:
    customer = _get_customer_or_404(AdminCustomerRepository(db), customer_id)
    partner_name = _partner_names(db, [customer.partner_id])[customer.partner_id]
    last_printed_at = PrintLogRepository(db).last_printed_at(customer.id)
    return ApiResponse(data=_to_admin_out(customer, storage, partner_name, last_printed_at))


@router.get("/{customer_id}/print")
def print_card(
    customer_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    storage: FileStorage = Depends(get_storage),
    admin: Admin = Depends(get_current_admin),
) -> Response:
    """The only route in the app that generates a printable card PDF —
    printing is admin-only. Still resolves and logs against the customer's
    owning partner (`partner_name`, `partner_id` on the card, and the
    partner-scoped print-history screens all key off that), but the caller
    must be an authenticated admin."""

    customer = _get_customer_or_404(AdminCustomerRepository(db), customer_id)
    partner = PartnerRepository(db).get_by_id(customer.partner_id)
    if partner is None:
        raise NotFoundError("Customer not found.")

    pdf_bytes = card_service.generate_and_log_card_pdf(db, settings, storage, partner, customer, admin_id=admin.id)
    db.commit()

    ascii_filename = _card_pdf_filename(customer.name, customer.card_id)
    utf8_filename = f"{customer.name}_{customer.card_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'inline; filename="{ascii_filename}"; filename*=UTF-8\'\'{quote(utf8_filename)}'
            )
        },
    )


@router.delete("/{customer_id}", response_model=ApiResponse[None])
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[None]:
    """Admin-side delete — unlike the partner delete route, not scoped to
    the customer's own partner (an admin can delete any customer)."""

    customer_service.admin_delete_customer(db, customer_id)
    db.commit()
    return ApiResponse(message="Customer deleted successfully")


@router.get("/{customer_id}/activity", response_model=ApiResponse[list[CardActivityOut]])
def customer_activity(
    customer_id: int,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[list[CardActivityOut]]:
    """Full print audit trail for one customer's card — every generation,
    and which admin triggered it."""

    _get_customer_or_404(AdminCustomerRepository(db), customer_id)
    logs = PrintLogRepository(db).list_for_customer(customer_id)

    admin_repo = AdminRepository(db)
    admin_names: dict[int, str] = {}
    for log in logs:
        if log.printed_by_admin_id is not None and log.printed_by_admin_id not in admin_names:
            found = admin_repo.get_by_id(log.printed_by_admin_id)
            admin_names[log.printed_by_admin_id] = found.name if found else "Admin"

    return ApiResponse(
        data=[
            CardActivityOut(
                printed_at=log.printed_at,
                printed_by=admin_names[log.printed_by_admin_id] if log.printed_by_admin_id is not None else "Partner",
            )
            for log in logs
        ]
    )
