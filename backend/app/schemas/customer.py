from __future__ import annotations

import re
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.models.customer import Gender

_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")
_AADHAAR_RE = re.compile(r"^\d{12}$")


class CustomerCreate(BaseModel):
    """Fields submitted from the Add Customer form (multipart, photo handled
    separately by the router). Card ID and validity date are deliberately
    absent — both are server-generated."""

    name: str
    father_husband: str
    mobile: str
    aadhaar_no: str
    address: str
    city_id: int
    dob: date
    gender: Gender

    @field_validator("name", "father_husband")
    @classmethod
    def validate_name_length(cls, value: str) -> str:
        value = value.strip()
        if not (2 <= len(value) <= 150):
            raise ValueError("Must be between 2 and 150 characters")
        return value

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, value: str) -> str:
        if not _MOBILE_RE.match(value):
            raise ValueError("Mobile number must be a valid 10-digit Indian mobile number")
        return value

    @field_validator("aadhaar_no")
    @classmethod
    def validate_aadhaar(cls, value: str) -> str:
        if not _AADHAAR_RE.match(value):
            raise ValueError("Aadhaar number must be exactly 12 digits")
        return value

    @field_validator("address")
    @classmethod
    def validate_address(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Address is required")
        if len(value) > 500:
            raise ValueError("Address must be at most 500 characters")
        return value

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, value: date) -> date:
        if value >= date.today():
            raise ValueError("Date of birth must be in the past")
        return value


class CustomerUpdate(BaseModel):
    """Partner edit of an existing customer. Same profile fields as create,
    except Aadhaar is optional — leave it blank to keep the stored value
    (full Aadhaar is never returned to the client). Photo is handled
    separately by the router and is also optional on edit."""

    name: str
    father_husband: str
    mobile: str
    aadhaar_no: str | None = None
    address: str
    city_id: int
    dob: date
    gender: Gender

    @field_validator("name", "father_husband")
    @classmethod
    def validate_name_length(cls, value: str) -> str:
        value = value.strip()
        if not (2 <= len(value) <= 150):
            raise ValueError("Must be between 2 and 150 characters")
        return value

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, value: str) -> str:
        if not _MOBILE_RE.match(value):
            raise ValueError("Mobile number must be a valid 10-digit Indian mobile number")
        return value

    @field_validator("aadhaar_no")
    @classmethod
    def validate_aadhaar(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if not _AADHAAR_RE.match(value):
            raise ValueError("Aadhaar number must be exactly 12 digits")
        return value

    @field_validator("address")
    @classmethod
    def validate_address(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Address is required")
        if len(value) > 500:
            raise ValueError("Address must be at most 500 characters")
        return value

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, value: date) -> date:
        if value >= date.today():
            raise ValueError("Date of birth must be in the past")
        return value


class CustomerOut(BaseModel):
    """Response contract for a single customer. Aadhaar is always masked —
    there is no field here that can carry the decrypted value."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    card_id: str
    partner_id: int
    name: str
    father_husband: str
    mobile: str
    aadhaar_last4: str
    dob: date
    gender: Gender
    address: str
    city_id: int
    # Resolved from the city relationship so the card preview can render
    # "address, city" exactly the way the printed PDF composes it —
    # previously only the raw address reached the frontend, so the preview
    # was missing the city that the export showed.
    city_name: str | None = None
    photo_url: str | None = None
    entry_date: date
    validity_date: date
    # None means the card has never been printed. Populated from
    # `CardPrintLog` (see `PrintLogRepository.last_printed_map`) rather than
    # stored on the row itself, since print history is an event log, not a
    # customer flag.
    last_printed_at: datetime | None = None

    @computed_field  # type: ignore[misc]
    @property
    def age(self) -> int:
        today = date.today()
        years = today.year - self.dob.year
        if (today.month, today.day) < (self.dob.month, self.dob.day):
            years -= 1
        return years


class CustomerListItem(BaseModel):
    """Slimmer shape for list screens (Customers / Total Printing). Includes
    `mobile` and `validity_date` (cheap columns already on the row) so the
    desktop Customers table can show contact info and a valid/expired status
    without a second round trip per customer."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    card_id: str
    name: str
    father_husband: str
    mobile: str
    dob: date
    gender: Gender
    photo_url: str | None = None
    validity_date: date
    last_printed_at: datetime | None = None

    @computed_field  # type: ignore[misc]
    @property
    def age(self) -> int:
        today = date.today()
        years = today.year - self.dob.year
        if (today.month, today.day) < (self.dob.month, self.dob.day):
            years -= 1
        return years


class AdminCustomerOut(CustomerOut):
    """Customer Overview row for the admin portal — same shape as the
    partner-facing detail, plus which partner owns the record."""

    partner_name: str


class BatchPrintIn(BaseModel):
    """Admin "print selected" request. Capped at 20 per batch — card
    generation is CPU-bound (per-string Devanagari rasterisation), so an
    unbounded list could hold a worker long enough to hit request
    timeouts on the free-tier host."""

    customer_ids: list[int] = Field(min_length=1, max_length=20)


class CustomerFindQuery(BaseModel):
    mobile: str | None = None
    dob: date | None = None
    card_id: str | None = None

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, value: str | None) -> str | None:
        if value is not None and not _MOBILE_RE.match(value):
            raise ValueError("Mobile number must be a valid 10-digit Indian mobile number")
        return value
