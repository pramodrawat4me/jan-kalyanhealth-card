from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.print_log import CardPrintLog


class PrintLogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def record(self, partner_id: int, customer_id: int, admin_id: int | None = None) -> CardPrintLog:
        entry = CardPrintLog(partner_id=partner_id, customer_id=customer_id, printed_by_admin_id=admin_id)
        self.db.add(entry)
        self.db.flush()
        return entry

    def last_printed_map(self, customer_ids: list[int]) -> dict[int, datetime]:
        """Latest `printed_at` per customer, for the Printed/Not Printed badge
        shown on customer lists and detail pages (both partner and admin
        sides) — one grouped query per page instead of N per-row lookups."""

        if not customer_ids:
            return {}
        stmt = (
            select(CardPrintLog.customer_id, func.max(CardPrintLog.printed_at))
            .where(CardPrintLog.customer_id.in_(customer_ids))
            .group_by(CardPrintLog.customer_id)
        )
        return dict(self.db.execute(stmt).all())

    def last_printed_at(self, customer_id: int) -> datetime | None:
        return self.last_printed_map([customer_id]).get(customer_id)

    def list_for_customer(self, customer_id: int) -> list[CardPrintLog]:
        """Full print activity for one customer — the audit trail shown on
        the admin Customer Detail page."""

        stmt = (
            select(CardPrintLog).where(CardPrintLog.customer_id == customer_id).order_by(CardPrintLog.printed_at.desc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def _joined_query(self, partner_id: int):
        return (
            select(CardPrintLog, Customer)
            .join(Customer, Customer.id == CardPrintLog.customer_id)
            .where(CardPrintLog.partner_id == partner_id)
        )

    def list_for_partner(self, partner_id: int, page: int, limit: int) -> tuple[list[tuple[CardPrintLog, Customer]], int]:
        base = self._joined_query(partner_id)
        total = self.db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
        stmt = base.order_by(CardPrintLog.printed_at.desc()).offset((page - 1) * limit).limit(limit)
        items = [tuple(row) for row in self.db.execute(stmt).all()]
        return items, total

    def list_today_for_partner(self, partner_id: int) -> list[tuple[CardPrintLog, Customer]]:
        today = datetime.now(timezone.utc).date()
        stmt = (
            self._joined_query(partner_id)
            .where(func.date(CardPrintLog.printed_at) == today)
            .order_by(CardPrintLog.printed_at.desc())
        )
        return [tuple(row) for row in self.db.execute(stmt).all()]

    def count_for_partner(self, partner_id: int) -> int:
        """Distinct customers of this partner whose card has ever been
        printed — one per customer, no matter how many times a card was
        reprinted (see module docstring / `count_for_partners`)."""

        stmt = (
            select(func.count(func.distinct(CardPrintLog.customer_id)))
            .select_from(CardPrintLog)
            .where(CardPrintLog.partner_id == partner_id)
        )
        return self.db.execute(stmt).scalar_one()

    def count_today_for_partner(self, partner_id: int) -> int:
        today = datetime.now(timezone.utc).date()
        stmt = (
            select(func.count(func.distinct(CardPrintLog.customer_id)))
            .select_from(CardPrintLog)
            .where(CardPrintLog.partner_id == partner_id, func.date(CardPrintLog.printed_at) == today)
        )
        return self.db.execute(stmt).scalar_one()

    def count_all(self) -> int:
        return self.db.execute(
            select(func.count(func.distinct(CardPrintLog.customer_id))).select_from(CardPrintLog)
        ).scalar_one()

    def count_all_today(self) -> int:
        today = datetime.now(timezone.utc).date()
        stmt = (
            select(func.count(func.distinct(CardPrintLog.customer_id)))
            .select_from(CardPrintLog)
            .where(func.date(CardPrintLog.printed_at) == today)
        )
        return self.db.execute(stmt).scalar_one()

    def count_for_partners(self, partner_ids: list[int]) -> dict[int, int]:
        """Distinct-customer print counts per partner — a card reprinted five
        times for the same customer still counts once, matching
        `count_for_partner`."""

        if not partner_ids:
            return {}
        stmt = (
            select(CardPrintLog.partner_id, func.count(func.distinct(CardPrintLog.customer_id)))
            .where(CardPrintLog.partner_id.in_(partner_ids))
            .group_by(CardPrintLog.partner_id)
        )
        return dict(self.db.execute(stmt).all())

    def delete_for_partner(self, partner_id: int) -> int:
        """Removes every print-log row for a partner (they all carry
        `partner_id`, so this also covers logs of the partner's customers).
        Only called from the partner-delete purge — print history is an
        audit trail everywhere else and must never be trimmed."""

        result = self.db.execute(delete(CardPrintLog).where(CardPrintLog.partner_id == partner_id))
        self.db.flush()
        return result.rowcount

    def report_by_partner(self, start_date, end_date) -> list[tuple[int, int]]:
        """Distinct-customer print counts grouped by partner within an
        inclusive date range, for the admin Printing Reports module."""

        stmt = (
            select(CardPrintLog.partner_id, func.count(func.distinct(CardPrintLog.customer_id)))
            .where(func.date(CardPrintLog.printed_at) >= start_date, func.date(CardPrintLog.printed_at) <= end_date)
            .group_by(CardPrintLog.partner_id)
            .order_by(func.count(func.distinct(CardPrintLog.customer_id)).desc())
        )
        return list(self.db.execute(stmt).all())
