"""add notifications_vues table

Revision ID: c4e8a2f1b6d7
Revises: b3f7c1a9d2e4
Create Date: 2026-07-22 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4e8a2f1b6d7'
down_revision: Union[str, Sequence[str], None] = 'b3f7c1a9d2e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'notifications_vues',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('utilisateur_id', sa.Integer(), nullable=False),
        sa.Column('cle', sa.String(), nullable=False),
        sa.Column('reference_id', sa.String(), nullable=False),
        sa.Column('date_vue', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['utilisateur_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('utilisateur_id', 'cle', 'reference_id', name='uq_notification_vue'),
    )
    op.create_index(op.f('ix_notifications_vues_id'), 'notifications_vues', ['id'])
    op.create_index(op.f('ix_notifications_vues_utilisateur_id'), 'notifications_vues', ['utilisateur_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_notifications_vues_utilisateur_id'), table_name='notifications_vues')
    op.drop_index(op.f('ix_notifications_vues_id'), table_name='notifications_vues')
    op.drop_table('notifications_vues')
