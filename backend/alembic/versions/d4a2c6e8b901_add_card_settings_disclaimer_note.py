"""add card_settings.disclaimer_note

Lets an admin edit the back-of-card नोट (disclaimer) text at runtime
via Card Settings, instead of it living only in static backend config.

Revision ID: d4a2c6e8b901
Revises: c8e1f3a9b502
Create Date: 2026-07-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4a2c6e8b901"
down_revision: Union[str, None] = "c8e1f3a9b502"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DEFAULT_DISCLAIMER = (
    "नोट: यह कार्ड एक निजी स्वास्थ्य सदस्यता कार्ड है। यह किसी सरकारी योजना "
    "या आयुष्मान भारत कार्ड का विकल्प नहीं है।"
)


def upgrade() -> None:
    op.add_column(
        "card_settings",
        sa.Column(
            "disclaimer_note",
            sa.Text(),
            nullable=False,
            server_default=_DEFAULT_DISCLAIMER,
        ),
    )


def downgrade() -> None:
    op.drop_column("card_settings", "disclaimer_note")
