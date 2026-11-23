"""add partner photo_path

Revision ID: 6b4a23e6ea8b
Revises: d4a2c6e8b901
Create Date: 2026-08-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6b4a23e6ea8b"
down_revision: Union[str, None] = "d4a2c6e8b901"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("partners", sa.Column("photo_path", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("partners", "photo_path")
