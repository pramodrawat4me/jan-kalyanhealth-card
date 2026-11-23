"""Location master: public read endpoints (used by every partner-facing
dropdown) plus admin-only create and delete endpoints for the location
hierarchy."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_admin, get_db
from app.core.exceptions import NotFoundError
from app.models.admin import Admin
from app.models.location import City, State, Tahsil
from app.repositories.location_repo import LocationRepository
from app.schemas.common import ApiResponse
from app.schemas.location import CityCreate, CityOut, StateCreate, StateOut, TahsilCreate, TahsilOut
from app.services import location_service

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/states", response_model=ApiResponse[list[StateOut]])
def list_states(db: Session = Depends(get_db)) -> ApiResponse[list[StateOut]]:
    states = LocationRepository(db).list_states()
    return ApiResponse(data=[StateOut.model_validate(s) for s in states])


@router.get("/cities/{state_id}", response_model=ApiResponse[list[CityOut]])
def list_cities(state_id: int, db: Session = Depends(get_db)) -> ApiResponse[list[CityOut]]:
    cities = LocationRepository(db).list_cities(state_id)
    return ApiResponse(data=[CityOut.model_validate(c) for c in cities])


@router.get("/tahsils/{city_id}", response_model=ApiResponse[list[TahsilOut]])
def list_tahsils(city_id: int, db: Session = Depends(get_db)) -> ApiResponse[list[TahsilOut]]:
    tahsils = LocationRepository(db).list_tahsils(city_id)
    return ApiResponse(data=[TahsilOut.model_validate(t) for t in tahsils])


admin_router = APIRouter(prefix="/admin/locations", tags=["admin-locations"])


@admin_router.post("/states", response_model=ApiResponse[StateOut], status_code=201)
def create_state(
    payload: StateCreate, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> ApiResponse[StateOut]:
    state = LocationRepository(db).create_state(State(name=payload.name))
    db.commit()
    return ApiResponse(data=StateOut.model_validate(state), message="State added successfully")


@admin_router.post("/cities", response_model=ApiResponse[CityOut], status_code=201)
def create_city(
    payload: CityCreate, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> ApiResponse[CityOut]:
    repo = LocationRepository(db)
    if repo.get_state(payload.state_id) is None:
        raise NotFoundError("State not found.")
    city = repo.create_city(City(name=payload.name, state_id=payload.state_id))
    db.commit()
    return ApiResponse(data=CityOut.model_validate(city), message="City added successfully")


@admin_router.post("/tahsils", response_model=ApiResponse[TahsilOut], status_code=201)
def create_tahsil(
    payload: TahsilCreate, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> ApiResponse[TahsilOut]:
    repo = LocationRepository(db)
    city = repo.get_city(payload.city_id)
    if city is None:
        raise NotFoundError("City not found.")
    tahsil = repo.create_tahsil(Tahsil(name=payload.name, city_id=city.id, state_id=city.state_id))
    db.commit()
    return ApiResponse(data=TahsilOut.model_validate(tahsil), message="Tahsil added successfully")


@admin_router.delete("/states/{state_id}", response_model=ApiResponse[None])
def delete_state(
    state_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> ApiResponse[None]:
    location_service.delete_state(db, state_id)
    db.commit()
    return ApiResponse(message="State deleted successfully")


@admin_router.delete("/cities/{city_id}", response_model=ApiResponse[None])
def delete_city(
    city_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> ApiResponse[None]:
    location_service.delete_city(db, city_id)
    db.commit()
    return ApiResponse(message="City deleted successfully")


@admin_router.delete("/tahsils/{tahsil_id}", response_model=ApiResponse[None])
def delete_tahsil(
    tahsil_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> ApiResponse[None]:
    location_service.delete_tahsil(db, tahsil_id)
    db.commit()
    return ApiResponse(message="Tahsil deleted successfully")
