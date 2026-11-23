from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.hospital import Hospital
from app.models.location import City, State, Tahsil
from app.models.partner import Partner


class LocationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_states(self) -> list[State]:
        return list(self.db.execute(select(State).order_by(State.name)).scalars().all())

    def list_cities(self, state_id: int) -> list[City]:
        stmt = select(City).where(City.state_id == state_id).order_by(City.name)
        return list(self.db.execute(stmt).scalars().all())

    def list_tahsils(self, city_id: int) -> list[Tahsil]:
        stmt = select(Tahsil).where(Tahsil.city_id == city_id).order_by(Tahsil.name)
        return list(self.db.execute(stmt).scalars().all())

    def city_exists(self, city_id: int) -> bool:
        return self.db.get(City, city_id) is not None

    def get_city(self, city_id: int) -> City | None:
        return self.db.get(City, city_id)

    def get_state(self, state_id: int) -> State | None:
        return self.db.get(State, state_id)

    def create_state(self, state: State) -> State:
        self.db.add(state)
        self.db.flush()
        return state

    def create_city(self, city: City) -> City:
        self.db.add(city)
        self.db.flush()
        return city

    def create_tahsil(self, tahsil: Tahsil) -> Tahsil:
        self.db.add(tahsil)
        self.db.flush()
        return tahsil

    def cities_by_ids(self, city_ids: list[int]) -> dict[int, City]:
        if not city_ids:
            return {}
        stmt = select(City).where(City.id.in_(city_ids))
        return {city.id: city for city in self.db.execute(stmt).scalars().all()}

    def get_tahsil(self, tahsil_id: int) -> Tahsil | None:
        return self.db.get(Tahsil, tahsil_id)

    # --- deletion usage guards -------------------------------------------
    # Counts of the rows that would be orphaned if a location vanished.
    # Customer counts include soft-deleted rows on purpose: they still hold
    # the foreign key, so the delete would fail (or dangle) either way.

    def _count(self, stmt) -> int:
        return self.db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    def usage_for_tahsil(self, tahsil_id: int) -> dict[str, int]:
        return {
            "partners": self._count(select(Partner.id).where(Partner.tahsil_id == tahsil_id)),
        }

    def usage_for_city(self, city_id: int) -> dict[str, int]:
        return {
            "partners": self._count(select(Partner.id).where(Partner.city_id == city_id)),
            "customers": self._count(select(Customer.id).where(Customer.city_id == city_id)),
            "hospitals": self._count(select(Hospital.id).where(Hospital.city_id == city_id)),
        }

    def usage_for_state(self, state_id: int) -> dict[str, int]:
        state_city_ids = select(City.id).where(City.state_id == state_id)
        return {
            "partners": self._count(select(Partner.id).where(Partner.state_id == state_id)),
            "customers": self._count(select(Customer.id).where(Customer.city_id.in_(state_city_ids))),
            "hospitals": self._count(
                select(Hospital.id).where(
                    (Hospital.state_id == state_id) | (Hospital.city_id.in_(state_city_ids))
                )
            ),
        }

    # --- deletion (cascades down the location tree only) -----------------

    def delete_tahsil(self, tahsil: Tahsil) -> None:
        self.db.delete(tahsil)
        self.db.flush()

    def delete_city_cascade(self, city_id: int) -> None:
        self.db.execute(delete(Tahsil).where(Tahsil.city_id == city_id))
        self.db.execute(delete(City).where(City.id == city_id))
        self.db.flush()

    def delete_state_cascade(self, state_id: int) -> None:
        self.db.execute(delete(Tahsil).where(Tahsil.state_id == state_id))
        self.db.execute(delete(City).where(City.state_id == state_id))
        self.db.execute(delete(State).where(State.id == state_id))
        self.db.flush()
