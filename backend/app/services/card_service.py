"""Orchestrates card PDF generation and the public QR scan response.

This is the seam between "customer data" and "printable/public artifact" —
it composes the customer, partner, and location repositories into the shape
`card_pdf_service` and the public schema need, without any of those
repositories knowing about each other.
"""

from __future__ import annotations

import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import NotFoundError
from app.core.file_storage import FileStorage
from app.models.customer import Customer
from app.models.partner import Partner
from app.repositories.card_settings_repo import CardSettingsRepository
from app.repositories.hospital_repo import HospitalRepository
from app.repositories.location_repo import LocationRepository
from app.repositories.partner_repo import PartnerRepository
from app.repositories.print_log_repo import PrintLogRepository
from app.schemas.card import CardBrandConfigOut, HospitalPublicOut, PublicCardStatusOut
from app.services import customer_service
from app.services.card_pdf_service import CardData, build_batch_card_pdf, build_card_pdf

_logger = logging.getLogger(__name__)


def _city_name(db: Session, city_id: int | None) -> str:
    if city_id is None:
        return "-"
    location_repo = LocationRepository(db)
    city = location_repo.get_city(city_id)
    return city.name if city else "-"


def _read_photo_bytes(storage: FileStorage, photo_path: str | None) -> bytes | None:
    """Best-effort photo read: on a host without a persistent disk (e.g. the
    Render free tier), an uploaded photo's file can be wiped by a later
    restart/redeploy while the `Customer.photo_path` DB row still points at
    it. Previously that turned into an unhandled `FileNotFoundError` and a
    bare 500 on every print for that customer — falling back to "no photo"
    (the PDF/preview's existing placeholder) keeps printing usable instead
    of hard-failing on a condition the user can't fix from the UI."""

    if not photo_path:
        return None
    try:
        return storage.read(photo_path)
    except OSError:
        _logger.warning("Customer photo missing on disk at %r — rendering without it.", photo_path)
        return None


def _build_card_data(
    db: Session,
    settings: Settings,
    storage: FileStorage,
    partner: Partner,
    customer: Customer,
    card_settings,
) -> CardData:
    """Assembles one customer's `CardData` — shared by the single-card and
    batch print flows so the two can never drift apart."""

    return CardData(
        card_id=customer.card_id,
        name=customer.name,
        father_husband=customer.father_husband,
        gender=customer.gender.value,
        age=_calculate_age(customer.dob),
        dob=customer.dob.isoformat(),
        mobile=customer.mobile,
        address=customer.address,
        city_name=_city_name(db, customer.city_id),
        entry_date=customer.entry_date.isoformat(),
        validity_date=customer.validity_date.isoformat(),
        photo_bytes=_read_photo_bytes(storage, customer.photo_path),
        partner_name=partner.name,
        partner_id=partner.id,
        qr_target_url=f"{settings.frontend_public_url}/card-status/{customer.card_id}",
        organization_name=settings.organization_name,
        helpline=card_settings.back_helpline,
        tagline=settings.card_tagline,
        registration_fee=card_settings.registration_fee,
        facilities=card_settings.facilities,
        disclaimer_note=card_settings.disclaimer_note,
        show_validity=card_settings.show_validity,
    )


def generate_and_log_card_pdf(
    db: Session,
    settings: Settings,
    storage: FileStorage,
    partner: Partner,
    customer: Customer,
    admin_id: int | None = None,
) -> bytes:
    card_settings = CardSettingsRepository(db).get_or_create()
    data = _build_card_data(db, settings, storage, partner, customer, card_settings)
    pdf_bytes = build_card_pdf(data)

    PrintLogRepository(db).record(partner.id, customer.id, admin_id=admin_id)
    return pdf_bytes


def generate_and_log_batch_pdf(
    db: Session,
    settings: Settings,
    storage: FileStorage,
    customers: list[Customer],
    admin_id: int | None = None,
) -> bytes:
    """Admin "print selected" — one combined A4 PDF (four customers per
    page, see `build_batch_card_pdf`), with one print-log entry per
    customer, exactly as if each had been printed individually."""

    card_settings = CardSettingsRepository(db).get_or_create()
    partner_repo = PartnerRepository(db)
    partners: dict[int, Partner] = {}

    cards: list[CardData] = []
    for customer in customers:
        if customer.partner_id not in partners:
            partner = partner_repo.get_by_id(customer.partner_id)
            if partner is None:
                raise NotFoundError("Customer not found.")
            partners[customer.partner_id] = partner
        cards.append(
            _build_card_data(db, settings, storage, partners[customer.partner_id], customer, card_settings)
        )

    pdf_bytes = build_batch_card_pdf(cards)

    log_repo = PrintLogRepository(db)
    for customer in customers:
        log_repo.record(customer.partner_id, customer.id, admin_id=admin_id)
    return pdf_bytes


def get_card_brand_config(db: Session, settings: Settings) -> CardBrandConfigOut:
    """Organisation-level card content, shared verbatim with the printed
    PDF (see `card_pdf_service` module docstring) — this is what the
    frontend's live card preview fetches so it never hand-duplicates
    facilities/disclaimer text that could drift from what actually prints."""

    card_settings = CardSettingsRepository(db).get_or_create()
    return CardBrandConfigOut(
        organization_name=settings.organization_name,
        tagline=settings.card_tagline,
        back_helpline=card_settings.back_helpline,
        registration_fee=card_settings.registration_fee,
        facilities=card_settings.facilities,
        disclaimer_note=card_settings.disclaimer_note,
        show_validity=card_settings.show_validity,
    )


def get_public_card_status(db: Session, storage: FileStorage, card_id: str) -> PublicCardStatusOut:
    """No authentication, no partner scoping — but this deliberately mirrors
    what's already printed on the physical card (see `PublicCardStatusOut`
    docstring), not a lookup of everything in the `Customer` row. This is
    the only place in the codebase allowed to look up a customer by card_id
    without a partner_id filter, because the result it returns is scrubbed
    to exactly that card-shaped subset before leaving this function.
    """

    customer = _find_customer_by_card_id(db, card_id)
    if customer is None:
        raise NotFoundError("Card not found.")

    partner = PartnerRepository(db).get_by_id(customer.partner_id)
    hospitals = HospitalRepository(db).list_active()
    location_repo = LocationRepository(db)
    city_lookup = location_repo.cities_by_ids([h.city_id for h in hospitals if h.city_id])

    return PublicCardStatusOut(
        card_id=customer.card_id,
        name=customer.name,
        father_husband=customer.father_husband,
        mobile=customer.mobile,
        dob=customer.dob,
        gender=customer.gender,
        address=customer.address,
        city_name=_city_name(db, customer.city_id),
        photo_url=customer_service.resolve_photo_url(storage, customer),
        entry_date=customer.entry_date,
        partner_name=partner.name if partner else "-",
        is_valid=customer.validity_date >= date.today(),
        validity_date=customer.validity_date,
        hospitals=[
            HospitalPublicOut(
                name=h.name,
                address=h.address,
                city_name=city_lookup[h.city_id].name if h.city_id in city_lookup else None,
                phone=h.phone,
                discount_details=h.discount_details,
            )
            for h in hospitals
        ],
    )


def _find_customer_by_card_id(db: Session, card_id: str) -> Customer | None:
    stmt = select(Customer).where(Customer.card_id == card_id, Customer.is_deleted.is_(False))
    return db.execute(stmt).scalar_one_or_none()


def _calculate_age(dob: date) -> int:
    today = date.today()
    years = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return years
