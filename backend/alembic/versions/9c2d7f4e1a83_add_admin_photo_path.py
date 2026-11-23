"""add admin photo_path

Revision ID: 9c2d7f4e1a83
Revises: 6b4a23e6ea8b
Create Date: 2026-08-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c2d7f4e1a83"
down_revision: Union[str, None] = "6b4a23e6ea8b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("admins", sa.Column("photo_path", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("admins", "photo_path")
