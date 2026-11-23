from __future__ import annotations

from pydantic import BaseModel, Field


class CardSettingsOut(BaseModel):
    """Organisation-level card content an admin can edit at runtime —
    the back-of-card helpline banner, the registration fee label, the
    back page's facilities list and disclaimer note, and whether the
    validity date prints on the front face."""

    back_helpline: str
    registration_fee: str
    facilities: list[str]
    disclaimer_note: str
    show_validity: bool


class CardSettingsUpdateIn(BaseModel):
    back_helpline: str = Field(min_length=1, max_length=20)
    registration_fee: str = Field(min_length=1, max_length=20)
    facilities: list[str] = Field(default_factory=list)
    disclaimer_note: str = Field(min_length=1, max_length=400)
    show_validity: bool = False
