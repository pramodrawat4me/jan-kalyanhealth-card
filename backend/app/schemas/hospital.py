from __future__ import annotations

from pydantic import BaseModel, ConfigDict, field_validator


class HospitalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str | None
    city_id: int | None
    state_id: int | None
    phone: str | None
    discount_details: str | None
    is_active: bool


class HospitalCreate(BaseModel):
    name: str
    address: str | None = None
    city_id: int | None = None
    state_id: int | None = None
    phone: str | None = None
    discount_details: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not (2 <= len(value) <= 200):
            raise ValueError("Hospital name must be between 2 and 200 characters")
        return value


class HospitalUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    city_id: int | None = None
    state_id: int | None = None
    phone: str | None = None
    discount_details: str | None = None
