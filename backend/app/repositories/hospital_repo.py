from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.hospital import Hospital


class HospitalRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, hospital_id: int) -> Hospital | None:
        return self.db.get(Hospital, hospital_id)

    def list_active(self) -> list[Hospital]:
        stmt = select(Hospital).where(Hospital.is_active.is_(True)).order_by(Hospital.name)
        return list(self.db.execute(stmt).scalars().all())

    def list_all(self, page: int, limit: int) -> tuple[list[Hospital], int]:
        base = select(Hospital)
        total = self.db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
        stmt = base.order_by(Hospital.name).offset((page - 1) * limit).limit(limit)
        items = list(self.db.execute(stmt).scalars().all())
        return items, total

    def create(self, hospital: Hospital) -> Hospital:
        self.db.add(hospital)
        self.db.flush()
        return hospital

    def save(self, hospital: Hospital) -> Hospital:
        self.db.flush()
        return hospital

    def delete(self, hospital: Hospital) -> None:
        self.db.delete(hospital)
        self.db.flush()
