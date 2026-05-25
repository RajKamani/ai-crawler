"""add_improvements_tables

Revision ID: 47cb4ab34251
Revises: 343ebc0aa274
Create Date: 2026-05-25 22:16:28.143740

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '47cb4ab34251'
down_revision: Union[str, Sequence[str], None] = '343ebc0aa274'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 7. Post Views Table
    op.execute("""
    CREATE TABLE IF NOT EXISTS post_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        viewed_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, post_id)
    );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_post_views_user ON post_views(user_id);")

    # 8. Push Notification Tokens Table
    op.execute("""
    CREATE TABLE IF NOT EXISTS notification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        expo_push_token TEXT NOT NULL UNIQUE,
        device_name TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_notification_tokens_user ON notification_tokens(user_id);")

    # 9. Crawl Logs Table
    op.execute("""
    CREATE TABLE IF NOT EXISTS crawl_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        crawler_name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
        posts_found INTEGER DEFAULT 0,
        posts_saved INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMPTZ DEFAULT now(),
        completed_at TIMESTAMPTZ
    );
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS crawl_logs CASCADE")
    op.execute("DROP TABLE IF EXISTS notification_tokens CASCADE")
    op.execute("DROP TABLE IF EXISTS post_views CASCADE")
