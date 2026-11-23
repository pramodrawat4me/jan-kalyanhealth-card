"""add stored_files table for database-backed photo storage

Render's free-tier web service has no persistent disk — its filesystem is
wiped on redeploys and on the fresh container that spins up after a free
instance idles down and wakes for a new request. Customer photos stored on
local disk (`LocalFileStorage`) would silently vanish a few hours after
upload purely because the service restarted in between. This table lets
`DatabaseFileStorage` persist the processed photo bytes in Postgres
instead, which survives restarts for free.

Revision ID: b3f8e5a1d704
Revises: 7a1c9d4e2f6b
Create Date: 2026-07-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3f8e5a1d704'
down_revision: Union[str, None] = '7a1c9d4e2f6b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'stored_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=50), nullable=False),
        sa.Column('content', sa.LargeBinary(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_stored_files_key'), 'stored_files', ['key'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_stored_files_key'), table_name='stored_files')
    op.drop_table('stored_files')
