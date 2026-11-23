from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Hospital(TimestampMixin, Base):
    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    city_id: Mapped[int | None] = mapped_column(ForeignKey("cities.id"))
    state_id: Mapped[int | None] = mapped_column(ForeignKey("states.id"))
    phone: Mapped[str | None] = mapped_column(String(20))
    discount_details: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    city: Mapped["City"] = relationship()  # noqa: F821
    state: Mapped["State"] = relationship()  # noqa: F821
