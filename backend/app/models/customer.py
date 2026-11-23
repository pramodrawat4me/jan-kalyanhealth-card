from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Gender(StrEnum):
    MALE = "male"
    FEMALE = "female"


class Customer(TimestampMixin, Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    card_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    partner_id: Mapped[int] = mapped_column(ForeignKey("partners.id"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    father_husband: Mapped[str] = mapped_column(String(150), nullable=False)
    mobile: Mapped[str] = mapped_column(String(15), nullable=False, index=True)

    aadhaar_encrypted: Mapped[str] = mapped_column(String(255), nullable=False)
    aadhaar_last4: Mapped[str] = mapped_column(String(4), nullable=False)

    dob: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[Gender] = mapped_column(SAEnum(Gender, name="gender_enum"), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), nullable=False)
    photo_path: Mapped[str | None] = mapped_column(String(500))

    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    validity_date: Mapped[date] = mapped_column(Date, nullable=False)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    city: Mapped["City"] = relationship()  # noqa: F821
