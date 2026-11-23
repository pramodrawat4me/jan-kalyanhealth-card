"""drop unused card_settings.front_mobile column

The front-of-card top-left mobile tag was switched to show the
cardholder's own number (`Customer.mobile`) instead of an org-wide
setting a while back. This column has been dead ever since — never
read anywhere the card is drawn — so it's dropped rather than left as
a confusing, unused admin form field.

Revision ID: 7a1c9d4e2f6b
Revises: 5e2a8f14c9b1
Create Date: 2026-07-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a1c9d4e2f6b'
down_revision: Union[str, None] = '5e2a8f14c9b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('card_settings', 'front_mobile')


def downgrade() -> None:
    op.add_column(
        'card_settings',
        sa.Column('front_mobile', sa.String(length=20), nullable=False, server_default='9343099468'),
    )
