"""user_managed_crawlers

Revision ID: 67b38bf6f686
Revises: 47cb4ab34251
Create Date: 2026-05-31 13:31:05.361741

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '67b38bf6f686'
down_revision: Union[str, Sequence[str], None] = '47cb4ab34251'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. crawler_settings table
    op.add_column('crawler_settings', sa.Column('user_id', sa.UUID(), nullable=True))
    op.drop_constraint('crawler_settings_crawler_name_key', 'crawler_settings', type_='unique')
    op.execute("CREATE UNIQUE INDEX idx_crawler_settings_global_unique ON public.crawler_settings (crawler_name) WHERE user_id IS NULL;")
    op.execute("CREATE UNIQUE INDEX idx_crawler_settings_user_unique ON public.crawler_settings (crawler_name, user_id) WHERE user_id IS NOT NULL;")

    # 2. crawl_logs table
    op.add_column('crawl_logs', sa.Column('user_id', sa.UUID(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Revert crawl_logs user_id
    op.drop_column('crawl_logs', 'user_id')

    # 2. Deduplicate crawler_settings
    op.execute("""
        WITH duplicates AS (
            SELECT crawler_name, MIN(id) as keep_id
            FROM public.crawler_settings
            GROUP BY crawler_name
        )
        DELETE FROM public.crawler_settings cs
        USING duplicates d
        WHERE cs.crawler_name = d.crawler_name AND cs.id <> d.keep_id;
    """)

    # 3. Revert crawler_settings constraints & indexes
    op.execute("DROP INDEX IF EXISTS public.idx_crawler_settings_global_unique;")
    op.execute("DROP INDEX IF EXISTS public.idx_crawler_settings_user_unique;")
    op.create_unique_constraint('crawler_settings_crawler_name_key', 'crawler_settings', ['crawler_name'])
    op.drop_column('crawler_settings', 'user_id')
