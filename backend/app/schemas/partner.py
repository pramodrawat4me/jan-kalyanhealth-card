from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")


class PartnerCreate(BaseModel):
    """Admin's Create Partner form. The password is admin-supplied (a
    temporary credential) rather than server-generated, per the documented
    form fields — the partner is expected to change it on first login."""

    name: str
    mobile: str
    password: str
    state_id: int
    city_id: int
    tahsil_id: int

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not (2 <= len(value) <= 150):
            raise ValueError("Name must be between 2 and 150 characters")
        return value

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, value: str) -> str:
        if not _MOBILE_RE.match(value):
            raise ValueError("Mobile number must be a valid 10-digit Indian mobile number")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        return value


class PartnerAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    mobile: str
    is_active: bool
    state_id: int | None
    city_id: int | None
    tahsil_id: int | None
    created_at: datetime
    photo_url: str | None = None
    customer_count: int = 0
    print_count: int = 0
