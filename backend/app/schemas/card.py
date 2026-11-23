from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, computed_field

from app.models.customer import Gender


class PrintLogItem(BaseModel):
    """One row on the Total Printing / Today's Card screens."""

    customer_id: int
    card_id: str
    name: str
    father_husband: str
    dob: date
    gender: Gender
    photo_url: str | None = None
    printed_at: datetime

    @computed_field  # type: ignore[misc]
    @property
    def age(self) -> int:
        today = date.today()
        years = today.year - self.dob.year
        if (today.month, today.day) < (self.dob.month, self.dob.day):
            years -= 1
        return years


class CardActivityOut(BaseModel):
    """One row of the print audit trail shown on the admin Customer Detail
    page — every time this specific card was generated, and who printed it.
    `printed_by` is an admin name for every print going forward (printing is
    admin-only); older rows created before that change show "Partner"."""

    printed_at: datetime
    printed_by: str


class PartnerDashboardSummaryOut(BaseModel):
    """Powers the Partner Dashboard's operational snapshot — deliberately a
    single round trip (rather than the dashboard composing totals from the
    customers/today/printings list endpoints) so the workspace's first paint
    isn't gated behind three separate requests."""

    total_customers: int
    customers_registered_today: int
    cards_printed_today: int
    total_prints: int


class HospitalPublicOut(BaseModel):
    name: str
    address: str | None
    city_name: str | None
    phone: str | None
    discount_details: str | None


class PublicCardStatusOut(BaseModel):
    """What a QR scan reveals. Deliberately excludes Aadhaar (never printed
    on the card, so never exposed here either) — but everything else here
    mirrors what's already printed on the physical card itself (name,
    father/husband, mobile, DOB, gender, address, photo, partner, validity),
    since scanning the QR requires physically holding that same card, it's
    not a new disclosure beyond what's already on it."""

    card_id: str
    name: str
    father_husband: str
    mobile: str
    dob: date
    gender: Gender
    address: str
    city_name: str | None
    photo_url: str | None
    entry_date: date
    partner_name: str
    is_valid: bool
    validity_date: date
    hospitals: list[HospitalPublicOut]

    @computed_field  # type: ignore[misc]
    @property
    def age(self) -> int:
        today = date.today()
        years = today.year - self.dob.year
        if (today.month, today.day) < (self.dob.month, self.dob.day):
            years -= 1
        return years


class CardBrandConfigOut(BaseModel):
    """Organisation-level card content that isn't per-customer — the back
    side's helpline banner, facilities list and disclaimer note, and the
    fee label. Public and cacheable: the
    frontend's live card preview fetches this once so its front/back
    layout renders from the exact same values `card_pdf_service` bakes
    into the printed PDF, instead of a second hand-maintained copy of
    these strings drifting out of sync.

    `back_helpline`/`registration_fee`/`facilities`/`disclaimer_note`/
    `show_validity` come from the admin-editable `CardSettings` row;
    organisation name and tagline remain static backend config (`Settings`)."""

    organization_name: str
    tagline: str
    back_helpline: str
    registration_fee: str
    facilities: list[str]
    disclaimer_note: str
    show_validity: bool
