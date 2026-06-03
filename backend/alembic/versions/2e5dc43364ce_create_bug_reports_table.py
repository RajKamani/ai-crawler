"""create_bug_reports_table

Revision ID: 2e5dc43364ce
Revises: 67b38bf6f686
Create Date: 2026-06-03 22:03:35.251368

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e5dc43364ce'
down_revision: Union[str, Sequence[str], None] = '67b38bf6f686'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        CREATE TABLE IF NOT EXISTS bug_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            steps_to_reproduce TEXT,
            device_info JSONB,
            logs TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_bug_reports_user ON bug_reports(user_id);
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS bug_reports CASCADE")
