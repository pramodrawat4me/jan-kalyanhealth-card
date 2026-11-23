import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")


class LoginRequest(BaseModel):
    mobile: str
    password: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, value: str) -> str:
        if not _MOBILE_RE.match(value):
            raise ValueError("Mobile number must be a valid 10-digit Indian mobile number")
        return value


class PartnerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    mobile: str
    is_active: bool
    state_id: int | None
    city_id: int | None
    tahsil_id: int | None
    onboarding_completed_at: datetime | None = None


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    mobile: str


class PartnerProfileOut(PartnerOut):
    """Everything the partner's own Profile page shows — a superset of the
    login-time `PartnerOut` with the fields that only matter once you're
    already looking at your own account (location names rather than bare
    IDs, photo, when the account was created)."""

    state_name: str | None = None
    city_name: str | None = None
    tahsil_name: str | None = None
    photo_url: str | None = None
    created_at: datetime


class AdminProfileOut(AdminOut):
    """Admin's own Profile page — same idea as `PartnerProfileOut`."""

    created_at: datetime
    photo_url: str | None = None


class LoginResponseData(BaseModel):
    access_token: str
    partner: PartnerOut | None = None
    admin: AdminOut | None = None


class ChangePasswordRequest(BaseModel):
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_strength(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
            raise ValueError("Password must contain at least one letter and one number")
        return value

    @model_validator(mode="after")
    def validate_confirmation(self) -> "ChangePasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self
