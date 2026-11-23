"""Admin-editable organisation card content — see `CardSettings` model
docstring for what this is and why it's split out from the static
backend config (`Settings`)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.card_settings import CardSettings
from app.repositories.card_settings_repo import CardSettingsRepository
from app.schemas.card_settings import CardSettingsOut, CardSettingsUpdateIn


def _to_out(row: CardSettings) -> CardSettingsOut:
    return CardSettingsOut(
        back_helpline=row.back_helpline,
        registration_fee=row.registration_fee,
        facilities=row.facilities,
        disclaimer_note=row.disclaimer_note,
        show_validity=row.show_validity,
    )


def get_card_settings(db: Session) -> CardSettingsOut:
    return _to_out(CardSettingsRepository(db).get_or_create())


def update_card_settings(db: Session, payload: CardSettingsUpdateIn) -> CardSettingsOut:
    repo = CardSettingsRepository(db)
    row = repo.get_or_create()
    facilities_raw = "\n".join(line.strip() for line in payload.facilities if line.strip())
    row = repo.update(
        row,
        back_helpline=payload.back_helpline.strip(),
        registration_fee=payload.registration_fee.strip(),
        facilities_raw=facilities_raw,
        disclaimer_note=payload.disclaimer_note.strip(),
        show_validity=payload.show_validity,
    )
    return _to_out(row)
