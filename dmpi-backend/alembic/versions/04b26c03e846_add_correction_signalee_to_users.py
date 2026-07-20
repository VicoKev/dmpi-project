"""add correction_signalee to users

Revision ID: 04b26c03e846
Revises: cbb9982e44c5
Create Date: 2026-07-20 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '04b26c03e846'
down_revision: Union[str, Sequence[str], None] = 'cbb9982e44c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('correction_signalee', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('users', sa.Column('motif_correction', sa.String(), nullable=True))
    op.alter_column('users', 'correction_signalee', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'motif_correction')
    op.drop_column('users', 'correction_signalee')
