from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class State(Base):
    __tablename__ = "states"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    cities: Mapped[list["City"]] = relationship(back_populates="state")


class City(Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    state_id: Mapped[int] = mapped_column(ForeignKey("states.id"), nullable=False)

    state: Mapped["State"] = relationship(back_populates="cities")
    tahsils: Mapped[list["Tahsil"]] = relationship(back_populates="city")


class Tahsil(Base):
    __tablename__ = "tahsils"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), nullable=False)
    state_id: Mapped[int] = mapped_column(ForeignKey("states.id"), nullable=False)

    city: Mapped["City"] = relationship(back_populates="tahsils")
