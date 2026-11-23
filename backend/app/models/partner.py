from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Partner(TimestampMixin, Base):
    __tablename__ = "partners"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    mobile: Mapped[str] = mapped_column(String(15), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    state_id: Mapped[int | None] = mapped_column(ForeignKey("states.id"))
    city_id: Mapped[int | None] = mapped_column(ForeignKey("cities.id"))
    tahsil_id: Mapped[int | None] = mapped_column(ForeignKey("tahsils.id"))

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    photo_path: Mapped[str | None] = mapped_column(String(255))

    # Null until the partner dismisses/finishes the first-login welcome tour —
    # server-side so it survives across devices/browser-storage clears rather
    # than a localStorage flag (see frontend OnboardingTour component).
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    state: Mapped["State"] = relationship()  # noqa: F821
    city: Mapped["City"] = relationship()  # noqa: F821
    tahsil: Mapped["Tahsil"] = relationship()  # noqa: F821
