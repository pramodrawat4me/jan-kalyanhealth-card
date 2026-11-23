from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CardPrintLog(Base):
    """One row per successful card PDF generation. Drives the 'Today's Card'
    and 'Total Printing' screens, which count print *events*, not customers —
    a reprinted card increments this log again by design.

    `printed_by_admin_id` is set for every print going forward, since card
    printing is admin-only — partners can no longer trigger `/cards/print`.
    It stays nullable so historical rows (printed back when partners could
    print their own cards) remain valid without a backfill.
    """

    __tablename__ = "card_print_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False, index=True)
    partner_id: Mapped[int] = mapped_column(ForeignKey("partners.id"), nullable=False, index=True)
    printed_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admins.id"), nullable=True, index=True)
    printed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
