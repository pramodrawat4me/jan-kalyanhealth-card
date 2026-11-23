from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.hospital import Hospital
from app.repositories.hospital_repo import HospitalRepository
from app.schemas.hospital import HospitalCreate, HospitalUpdate


def get_hospital_or_404(db: Session, hospital_id: int) -> Hospital:
    hospital = HospitalRepository(db).get_by_id(hospital_id)
    if hospital is None:
        raise NotFoundError("Hospital not found.")
    return hospital


def create_hospital(db: Session, payload: HospitalCreate) -> Hospital:
    hospital = Hospital(**payload.model_dump())
    return HospitalRepository(db).create(hospital)


def update_hospital(db: Session, hospital_id: int, payload: HospitalUpdate) -> Hospital:
    hospital = get_hospital_or_404(db, hospital_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(hospital, field, value)
    return HospitalRepository(db).save(hospital)


def toggle_hospital(db: Session, hospital_id: int) -> Hospital:
    hospital = get_hospital_or_404(db, hospital_id)
    hospital.is_active = not hospital.is_active
    return HospitalRepository(db).save(hospital)


def delete_hospital(db: Session, hospital_id: int) -> None:
    """Hard delete — nothing in the schema references hospitals (customers
    and cards are not tied to them), so removal is always safe. Prefer the
    activate/deactivate toggle for temporary delisting."""

    hospital = get_hospital_or_404(db, hospital_id)
    HospitalRepository(db).delete(hospital)
