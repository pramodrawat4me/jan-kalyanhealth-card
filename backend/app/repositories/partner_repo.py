from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.partner import Partner


class PartnerRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, partner_id: int) -> Partner | None:
        return self.db.get(Partner, partner_id)

    def get_by_mobile(self, mobile: str) -> Partner | None:
        stmt = select(Partner).where(Partner.mobile == mobile)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, partner: Partner) -> Partner:
        self.db.add(partner)
        self.db.flush()
        return partner

    def list_all(self, page: int, limit: int, search: str | None = None) -> tuple[list[Partner], int]:
        stmt = select(Partner)
        if search:
            like = f"%{search}%"
            stmt = stmt.where(or_(Partner.name.ilike(like), Partner.mobile.ilike(like)))

        total = self.db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
        stmt = stmt.order_by(Partner.id.desc()).offset((page - 1) * limit).limit(limit)
        items = list(self.db.execute(stmt).scalars().all())
        return items, total

    def save(self, partner: Partner) -> Partner:
        self.db.flush()
        return partner

    def delete(self, partner: Partner) -> None:
        self.db.delete(partner)
        self.db.flush()
