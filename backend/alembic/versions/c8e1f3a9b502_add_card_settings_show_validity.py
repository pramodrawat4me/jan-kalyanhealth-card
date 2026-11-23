"""add card_settings.show_validity toggle

Lets an admin turn the printed वैधता (validity date) row on the card
face back on/off at runtime, instead of it being a hardcoded design
decision. Defaults to off, matching the current card design.

Revision ID: c8e1f3a9b502
Revises: b3f8e5a1d704
Create Date: 2026-07-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8e1f3a9b502'
down_revision: Union[str, None] = 'b3f8e5a1d704'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'card_settings',
        sa.Column('show_validity', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column('card_settings', 'show_validity')
