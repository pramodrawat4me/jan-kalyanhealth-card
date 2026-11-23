"""Customer registration and lookup business rules.

Card ID generation, validity-date derivation, and Aadhaar encryption all live
here so routers stay a thin HTTP translation layer and repositories stay
pure persistence.
"""

from __future__ import annotations

import secrets
from datetime import date

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import NotFoundError
from app.core.file_storage import FileStorage
from app.models.customer import Customer, Gender
from app.repositories.admin_customer_repo import AdminCustomerRepository
from app.repositories.customer_repo import CustomerRepository
from app.services.crypto_service import encrypt_aadhaar, last4

CARD_VALIDITY_YEARS = 3
_CARD_ID_MAX_ATTEMPTS = 10


def _generate_card_id(repo: CustomerRepository, issue_date: date) -> str:
    """YYYYMMDD + 6 random digits, per the developer doc's §6.1 format.
    Retries on the rare collision rather than trusting randomness alone —
    the DB unique constraint is the real backstop.
    """

    prefix = issue_date.strftime("%Y%m%d")
    for _ in range(_CARD_ID_MAX_ATTEMPTS):
        candidate = f"{prefix}{secrets.randbelow(900_000) + 100_000}"
        if not repo.card_id_exists(candidate):
            return candidate
    raise RuntimeError("Could not generate a unique card ID after multiple attempts")


def calculate_validity_date(entry_date: date) -> date:
    try:
        return entry_date.replace(year=entry_date.year + CARD_VALIDITY_YEARS)
    except ValueError:
        # entry_date is Feb 29 on a leap year — land on Feb 28 instead.
        return entry_date.replace(month=2, day=28, year=entry_date.year + CARD_VALIDITY_YEARS)


def create_customer(
    db: Session,
    settings: Settings,
    storage: FileStorage,
    partner_id: int,
    *,
    name: str,
    father_husband: str,
    mobile: str,
    aadhaar_no: str,
    address: str,
    city_id: int,
    dob: date,
    gender: Gender,
    photo_bytes: bytes,
) -> Customer:
    repo = CustomerRepository(db)

    today = date.today()
    photo_path = storage.save_photo(photo_bytes, settings.max_photo_size_mb)

    customer = Customer(
        card_id=_generate_card_id(repo, today),
        partner_id=partner_id,
        name=name,
        father_husband=father_husband,
        mobile=mobile,
        aadhaar_encrypted=encrypt_aadhaar(aadhaar_no, settings.aadhaar_encryption_key),
        aadhaar_last4=last4(aadhaar_no),
        dob=dob,
        gender=gender,
        address=address,
        city_id=city_id,
        photo_path=photo_path,
        entry_date=today,
        validity_date=calculate_validity_date(today),
    )
    return repo.create(customer)


def get_customer_or_404(db: Session, partner_id: int, customer_id: int) -> Customer:
    customer = CustomerRepository(db).get_by_id(partner_id, customer_id)
    if customer is None:
        raise NotFoundError("Customer not found.")
    return customer


def update_customer(
    db: Session,
    settings: Settings,
    storage: FileStorage,
    partner_id: int,
    customer_id: int,
    *,
    name: str,
    father_husband: str,
    mobile: str,
    aadhaar_no: str | None,
    address: str,
    city_id: int,
    dob: date,
    gender: Gender,
    photo_bytes: bytes | None,
) -> Customer:
    """Update a partner-owned customer profile. Card ID, entry date, and
    validity date are intentionally never changed here."""

    customer = get_customer_or_404(db, partner_id, customer_id)

    customer.name = name
    customer.father_husband = father_husband
    customer.mobile = mobile
    customer.address = address
    customer.city_id = city_id
    customer.dob = dob
    customer.gender = gender

    if aadhaar_no:
        customer.aadhaar_encrypted = encrypt_aadhaar(aadhaar_no, settings.aadhaar_encryption_key)
        customer.aadhaar_last4 = last4(aadhaar_no)

    if photo_bytes:
        customer.photo_path = storage.save_photo(photo_bytes, settings.max_photo_size_mb)

    db.flush()
    return customer


def delete_customer(db: Session, partner_id: int, customer_id: int) -> None:
    customer = get_customer_or_404(db, partner_id, customer_id)
    CustomerRepository(db).soft_delete(customer)


def admin_delete_customer(db: Session, customer_id: int) -> None:
    """Admin-side delete — unlike `delete_customer`, not scoped to a single
    partner (an admin can delete any customer regardless of which partner
    registered them). Still a soft delete: `is_deleted` is flagged rather
    than the row being removed, so print history and audit trails survive."""

    customer = AdminCustomerRepository(db).get_by_id(customer_id)
    if customer is None:
        raise NotFoundError("Customer not found.")
    CustomerRepository(db).soft_delete(customer)


def resolve_photo_url(storage: FileStorage, customer: Customer) -> str | None:
    if not customer.photo_path:
        return None
    return storage.resolve_url(customer.photo_path)
