from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.file_storage import FileStorage
from app.core.security import hash_password
from app.models.partner import Partner
from app.repositories.location_repo import LocationRepository
from app.repositories.partner_repo import PartnerRepository
from app.schemas.partner import PartnerCreate


def create_partner(
    db: Session,
    settings: Settings,
    storage: FileStorage,
    payload: PartnerCreate,
    *,
    photo_bytes: bytes | None = None,
) -> Partner:
    if PartnerRepository(db).get_by_mobile(payload.mobile) is not None:
        raise ConflictError("A partner with this mobile number already exists.")

    location_repo = LocationRepository(db)
    if location_repo.get_state(payload.state_id) is None:
        raise ValidationError("Selected state does not exist.", fields={"state_id": "Invalid"})
    city = location_repo.get_city(payload.city_id)
    if city is None or city.state_id != payload.state_id:
        raise ValidationError("Selected city does not belong to the selected state.", fields={"city_id": "Invalid"})
    tahsils = location_repo.list_tahsils(payload.city_id)
    if not any(t.id == payload.tahsil_id for t in tahsils):
        raise ValidationError(
            "Selected tahsil does not belong to the selected city.", fields={"tahsil_id": "Invalid"}
        )

    photo_path = storage.save_photo(photo_bytes, settings.max_photo_size_mb) if photo_bytes else None

    partner = Partner(
        name=payload.name,
        mobile=payload.mobile,
        password_hash=hash_password(payload.password),
        state_id=payload.state_id,
        city_id=payload.city_id,
        tahsil_id=payload.tahsil_id,
        photo_path=photo_path,
        is_active=True,
    )
    return PartnerRepository(db).create(partner)


def resolve_photo_url(storage: FileStorage, partner: Partner) -> str | None:
    if not partner.photo_path:
        return None
    return storage.resolve_url(partner.photo_path)


def get_partner_or_404(db: Session, partner_id: int) -> Partner:
    partner = PartnerRepository(db).get_by_id(partner_id)
    if partner is None:
        raise NotFoundError("Partner not found.")
    return partner


def set_partner_active(db: Session, partner_id: int, is_active: bool) -> Partner:
    partner = get_partner_or_404(db, partner_id)
    partner.is_active = is_active
    return PartnerRepository(db).save(partner)


def delete_partner(db: Session, partner_id: int) -> None:
    """Hard-delete a partner account — permitted once the partner has no
    ACTIVE customers left.

    Customer deletion in this app is a soft delete (`is_deleted` flag), so
    a partner whose customers were all removed in the UI still owns rows in
    `customers`, `card_print_logs`, and `stored_files` — all holding
    foreign keys or storage references back here. Deleting the partner
    therefore purges those leftovers in dependency order: print logs first,
    then photo bytes, then the customer rows, then the partner itself.
    (Before this purge existed, the guard counted soft-deleted rows too,
    which made such partners permanently undeletable.)

    A partner with active customers is still refused — deactivate instead,
    or delete the customers first."""

    from app.repositories.customer_repo import CustomerRepository
    from app.repositories.print_log_repo import PrintLogRepository
    from app.repositories.stored_file_repo import StoredFileRepository

    partner = get_partner_or_404(db, partner_id)
    customer_repo = CustomerRepository(db)

    if customer_repo.count_for_partner(partner_id) > 0:
        raise ConflictError(
            "This partner still has active customers and can't be deleted. "
            "Delete the customers first, or deactivate the partner instead."
        )

    PrintLogRepository(db).delete_for_partner(partner_id)

    photo_keys = customer_repo.photo_keys_for_partner(partner_id)
    if partner.photo_path:
        photo_keys.append(partner.photo_path)
    StoredFileRepository(db).delete_by_keys(photo_keys)

    customer_repo.hard_delete_all_for_partner(partner_id)
    PartnerRepository(db).delete(partner)
