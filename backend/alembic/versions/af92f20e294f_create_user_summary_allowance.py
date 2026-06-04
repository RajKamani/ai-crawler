"""create_user_summary_allowance

Revision ID: af92f20e294f
Revises: 2e5dc43364ce
Create Date: 2026-06-04 23:43:38.615978

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'af92f20e294f'
down_revision: Union[str, Sequence[str], None] = '2e5dc43364ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'user_summary_allowance',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('usage_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('free_used', sa.Integer(), server_default='0', nullable=False),
        sa.Column('rewarded_earned', sa.Integer(), server_default='0', nullable=False),
        sa.Column('rewarded_used', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('user_id', 'usage_date')
    )
    op.create_index('idx_summary_allowance_date', 'user_summary_allowance', ['usage_date'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_summary_allowance_date', table_name='user_summary_allowance')
    op.drop_table('user_summary_allowance')
