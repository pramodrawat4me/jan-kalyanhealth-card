"""Cross-partner customer reads for the admin "Customer Overview" module.

Kept as its own repository — distinct from `CustomerRepository`, whose every
method requires a `partner_id` — so any query that spans partners is
visually obvious at the call site and can only ever be reached through an
admin-authenticated router.
"""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.customer import Customer


class AdminCustomerRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, customer_id: int) -> Customer | None:
        stmt = select(Customer).where(Customer.id == customer_id, Customer.is_deleted.is_(False))
        return self.db.execute(stmt).scalar_one_or_none()

    def search(
        self, page: int, limit: int, search: str | None = None, partner_id: int | None = None
    ) -> tuple[list[Customer], int]:
        stmt = select(Customer).where(Customer.is_deleted.is_(False))
        if partner_id is not None:
            stmt = stmt.where(Customer.partner_id == partner_id)
        if search:
            like = f"%{search}%"
            stmt = stmt.where(
                or_(Customer.card_id.ilike(like), Customer.mobile.ilike(like), Customer.name.ilike(like))
            )

        total = self.db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
        stmt = stmt.order_by(Customer.created_at.desc()).offset((page - 1) * limit).limit(limit)
        items = list(self.db.execute(stmt).scalars().all())
        return items, total

    def iter_all(self, search: str | None = None):
        """Unpaginated generator used only by CSV export — never exposed as
        a JSON list endpoint."""

        stmt = select(Customer).where(Customer.is_deleted.is_(False))
        if search:
            like = f"%{search}%"
            stmt = stmt.where(
                or_(Customer.card_id.ilike(like), Customer.mobile.ilike(like), Customer.name.ilike(like))
            )
        stmt = stmt.order_by(Customer.created_at.desc())
        yield from self.db.execute(stmt).scalars()
