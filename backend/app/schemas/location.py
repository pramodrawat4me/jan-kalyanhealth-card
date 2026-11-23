from pydantic import BaseModel, ConfigDict, field_validator


class _NamedLocationCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not (2 <= len(value) <= 100):
            raise ValueError("Name must be between 2 and 100 characters")
        return value


class StateCreate(_NamedLocationCreate):
    pass


class CityCreate(_NamedLocationCreate):
    state_id: int


class TahsilCreate(_NamedLocationCreate):
    city_id: int


class StateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class CityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    state_id: int


class TahsilOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    city_id: int
    state_id: int
