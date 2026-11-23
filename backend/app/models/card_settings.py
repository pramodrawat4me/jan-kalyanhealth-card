from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class CardSettings(TimestampMixin, Base):
    """Singleton row (id is always 1) holding the organisation-level card
    content an admin can edit at runtime — the equivalent of the reference
    tool's "Card Settings" tab (helpline back, default fee, facilities
    list, disclaimer note, whether the validity date prints on the front).

    Organisation name, tagline, and card ID format stay as static backend
    config — these fields are the ones an admin plausibly needs to change
    without a deploy.
    """

    __tablename__ = "card_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    back_helpline: Mapped[str] = mapped_column(String(20), nullable=False)
    registration_fee: Mapped[str] = mapped_column(String(20), nullable=False)
    facilities_raw: Mapped[str] = mapped_column(Text, nullable=False)
    disclaimer_note: Mapped[str] = mapped_column(Text, nullable=False)
    show_validity: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    @property
    def facilities(self) -> list[str]:
        return [line.strip() for line in self.facilities_raw.splitlines() if line.strip()]
