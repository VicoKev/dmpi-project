"""add document justificatif to signalements_correction_compte

Revision ID: b3f7c1a9d2e4
Revises: 9a1d2f6c7e3b
Create Date: 2026-07-21 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3f7c1a9d2e4'
down_revision: Union[str, Sequence[str], None] = '9a1d2f6c7e3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('signalements_correction_compte', sa.Column('document_nom_original', sa.String(), nullable=True))
    op.add_column('signalements_correction_compte', sa.Column('document_chemin_stockage', sa.String(), nullable=True))
    op.add_column('signalements_correction_compte', sa.Column('document_type_mime', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('signalements_correction_compte', 'document_type_mime')
    op.drop_column('signalements_correction_compte', 'document_chemin_stockage')
    op.drop_column('signalements_correction_compte', 'document_nom_original')
