"""add prestataire_id to users

Revision ID: 8f2a1c4e6b91
Revises: 0b4babda729b
Create Date: 2026-07-16 14:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f2a1c4e6b91'
down_revision: Union[str, Sequence[str], None] = '0b4babda729b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('prestataire_id', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'prestataire_id')
