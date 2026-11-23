"""Customer persistence.

Every read method that returns customer data takes `partner_id` and filters
on it — there is intentionally no "get all customers" method on this
repository. Cross-partner access (needed by the admin customer overview) goes
through `AdminCustomerRepository` instead, which makes the privilege
boundary visible at the call site rather than hidden behind an optional
argument.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import Select, delete, func, or_, select
from sqlalchemy.orm import Session

from app.models.customer import Customer


class CustomerRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _base_query(self, partner_id: int) -> Select:
        return select(Customer).where(
            Customer.partner_id == partner_id,
            Customer.is_deleted.is_(False),
        )

    def create(self, customer: Customer) -> Customer:
        self.db.add(customer)
        self.db.flush()
        return customer

    def get_by_id(self, partner_id: int, customer_id: int) -> Customer | None:
        stmt = self._base_query(partner_id).where(Customer.id == customer_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def card_id_exists(self, card_id: str) -> bool:
        stmt = select(Customer.id).where(Customer.card_id == card_id)
        return self.db.execute(stmt).scalar_one_or_none() is not None

    def list_for_partner(
        self, partner_id: int, page: int, limit: int, search: str | None = None
    ) -> tuple[list[Customer], int]:
        stmt = self._base_query(partner_id)
        if search:
            like = f"%{search}%"
            stmt = stmt.where(
                or_(Customer.card_id.ilike(like), Customer.mobile.ilike(like), Customer.name.ilike(like))
            )

        total = self.db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
        stmt = stmt.order_by(Customer.created_at.desc()).offset((page - 1) * limit).limit(limit)
        items = list(self.db.execute(stmt).scalars().all())
        return items, total

    def list_created_today(self, partner_id: int) -> list[Customer]:
        today = datetime.now(timezone.utc).date()
        stmt = self._base_query(partner_id).where(Customer.entry_date == today).order_by(Customer.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())

    def find(
        self, partner_id: int, mobile: str | None, dob: date | None, card_id: str | None
    ) -> list[Customer]:
        stmt = self._base_query(partner_id)
        if mobile:
            stmt = stmt.where(Customer.mobile == mobile)
        if dob:
            stmt = stmt.where(Customer.dob == dob)
        if card_id:
            stmt = stmt.where(Customer.card_id == card_id)
        stmt = stmt.order_by(Customer.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())

    def soft_delete(self, customer: Customer) -> None:
        customer.is_deleted = True
        customer.deleted_at = datetime.now(timezone.utc)
        self.db.flush()

    def count_for_partner(self, partner_id: int) -> int:
        stmt = select(func.count()).select_from(self._base_query(partner_id).subquery())
        return self.db.execute(stmt).scalar_one()

    def photo_keys_for_partner(self, partner_id: int) -> list[str]:
        """Storage keys of every customer photo for a partner, INCLUDING
        soft-deleted customers — used by the partner-delete purge so the
        photo bytes in `stored_files` are removed along with the rows that
        reference them."""

        stmt = select(Customer.photo_path).where(
            Customer.partner_id == partner_id,
            Customer.photo_path.is_not(None),
        )
        return [key for (key,) in self.db.execute(stmt).all()]

    def hard_delete_all_for_partner(self, partner_id: int) -> int:
        """Physically removes every customer row for a partner, INCLUDING
        soft-deleted ones. Only called from the partner-delete purge, after
        the guard has confirmed no ACTIVE customers remain — soft-deleted
        rows still hold a foreign key to the partner, so they must go before
        the partner row can."""

        result = self.db.execute(delete(Customer).where(Customer.partner_id == partner_id))
        self.db.flush()
        return result.rowcount

    def count_for_partners(self, partner_ids: list[int]) -> dict[int, int]:
        if not partner_ids:
            return {}
        stmt = (
            select(Customer.partner_id, func.count())
            .where(Customer.partner_id.in_(partner_ids), Customer.is_deleted.is_(False))
            .group_by(Customer.partner_id)
        )
        return dict(self.db.execute(stmt).all())
