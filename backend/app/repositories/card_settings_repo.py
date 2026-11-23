from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.card_settings import CardSettings

_SINGLETON_ID = 1

# Seed values — only used the very first time this row is read (e.g. right
# after a migration on a fresh database). Matches the reference tool's own
# defaults so an admin's first visit to the Card Settings page shows
# sensible, already-correct values rather than blanks.
_DEFAULT_BACK_HELPLINE = "+91-7611131089"
_DEFAULT_REGISTRATION_FEE = "60"
_DEFAULT_FACILITIES = (
    "कैशलेस इलाज\nनेटवर्क अस्पताल\nमेडिकल जाँच में छूट\nदवाइयों में छूट\nआपातकालीन सहायता"
)
_DEFAULT_DISCLAIMER_NOTE = (
    "नोट: यह कार्ड एक निजी स्वास्थ्य सदस्यता कार्ड है। यह किसी सरकारी योजना "
    "या आयुष्मान भारत कार्ड का विकल्प नहीं है।"
)


class CardSettingsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_or_create(self) -> CardSettings:
        """Lazily creates the singleton row on first read instead of
        relying on a migration data-seed — this way the settings are
        self-healing even if the row is ever accidentally deleted."""

        row = self.db.get(CardSettings, _SINGLETON_ID)
        if row is None:
            row = CardSettings(
                id=_SINGLETON_ID,
                back_helpline=_DEFAULT_BACK_HELPLINE,
                registration_fee=_DEFAULT_REGISTRATION_FEE,
                facilities_raw=_DEFAULT_FACILITIES,
                disclaimer_note=_DEFAULT_DISCLAIMER_NOTE,
                show_validity=False,
            )
            self.db.add(row)
            self.db.flush()
        return row

    def update(
        self,
        row: CardSettings,
        *,
        back_helpline: str,
        registration_fee: str,
        facilities_raw: str,
        disclaimer_note: str,
        show_validity: bool,
    ) -> CardSettings:
        row.back_helpline = back_helpline
        row.registration_fee = registration_fee
        row.facilities_raw = facilities_raw
        row.disclaimer_note = disclaimer_note
        row.show_validity = show_validity
        self.db.flush()
        return row
