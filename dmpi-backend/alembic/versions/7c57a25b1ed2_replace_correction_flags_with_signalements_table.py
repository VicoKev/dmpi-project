"""replace correction flags on users with signalements_correction_compte table

Revision ID: 7c57a25b1ed2
Revises: 04b26c03e846
Create Date: 2026-07-20 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c57a25b1ed2'
down_revision: Union[str, Sequence[str], None] = '04b26c03e846'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('users', 'correction_signalee')
    op.drop_column('users', 'motif_correction')

    op.create_table(
        'signalements_correction_compte',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('utilisateur_id', sa.Integer(), nullable=False),
        sa.Column('motif', sa.String(), nullable=False),
        sa.Column('statut', sa.String(), nullable=False),
        sa.Column('date_creation', sa.DateTime(), nullable=False),
        sa.Column('date_traitement', sa.DateTime(), nullable=True),
        sa.Column('traite_par', sa.String(), nullable=True),
        sa.Column('vu', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(['utilisateur_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_signalements_correction_compte_id'),
        'signalements_correction_compte', ['id'], unique=False,
    )
    op.create_index(
        op.f('ix_signalements_correction_compte_utilisateur_id'),
        'signalements_correction_compte', ['utilisateur_id'], unique=False,
    )
    op.alter_column('signalements_correction_compte', 'vu', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_signalements_correction_compte_utilisateur_id'), table_name='signalements_correction_compte')
    op.drop_index(op.f('ix_signalements_correction_compte_id'), table_name='signalements_correction_compte')
    op.drop_table('signalements_correction_compte')

    op.add_column('users', sa.Column('motif_correction', sa.String(), nullable=True))
    op.add_column('users', sa.Column('correction_signalee', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column('users', 'correction_signalee', server_default=None)
