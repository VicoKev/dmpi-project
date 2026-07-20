"""add demandes_reinitialisation_mot_de_passe

Revision ID: cbb9982e44c5
Revises: 8f2a1c4e6b91
Create Date: 2026-07-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cbb9982e44c5'
down_revision: Union[str, Sequence[str], None] = '8f2a1c4e6b91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'demandes_reinitialisation_mot_de_passe',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('statut', sa.String(), nullable=False),
        sa.Column('date_creation', sa.DateTime(), nullable=False),
        sa.Column('date_traitement', sa.DateTime(), nullable=True),
        sa.Column('traite_par', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_demandes_reinitialisation_mot_de_passe_id'),
        'demandes_reinitialisation_mot_de_passe', ['id'], unique=False,
    )
    op.create_index(
        op.f('ix_demandes_reinitialisation_mot_de_passe_email'),
        'demandes_reinitialisation_mot_de_passe', ['email'], unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_demandes_reinitialisation_mot_de_passe_email'), table_name='demandes_reinitialisation_mot_de_passe')
    op.drop_index(op.f('ix_demandes_reinitialisation_mot_de_passe_id'), table_name='demandes_reinitialisation_mot_de_passe')
    op.drop_table('demandes_reinitialisation_mot_de_passe')
