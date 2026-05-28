"""user_scoped_isolation

Revision ID: c61aa632f253
Revises: 47cb4ab34251
Create Date: 2026-05-28 22:12:23.261307

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c61aa632f253'
down_revision: Union[str, Sequence[str], None] = '47cb4ab34251'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. sources table
    op.add_column('sources', sa.Column('user_id', sa.UUID(), nullable=True))
    op.drop_constraint('sources_url_key', 'sources', type_='unique')
    op.execute("CREATE UNIQUE INDEX idx_sources_global_unique ON public.sources (url) WHERE user_id IS NULL;")
    op.execute("CREATE UNIQUE INDEX idx_sources_user_unique ON public.sources (url, user_id) WHERE user_id IS NOT NULL;")

    # 2. posts table
    op.drop_constraint('posts_url_key', 'posts', type_='unique')
    op.create_unique_constraint('posts_url_source_id_key', 'posts', ['url', 'source_id'])

    # 3. crawler_settings table
    op.add_column('crawler_settings', sa.Column('user_id', sa.UUID(), nullable=True))
    op.drop_constraint('crawler_settings_crawler_name_key', 'crawler_settings', type_='unique')
    op.execute("CREATE UNIQUE INDEX idx_crawler_settings_global_unique ON public.crawler_settings (crawler_name) WHERE user_id IS NULL;")
    op.execute("CREATE UNIQUE INDEX idx_crawler_settings_user_unique ON public.crawler_settings (crawler_name, user_id) WHERE user_id IS NOT NULL;")

    # 4. crawl_logs table
    op.add_column('crawl_logs', sa.Column('user_id', sa.UUID(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Deduplicate sources
    op.execute("""
        WITH duplicates AS (
            SELECT url, MIN(id) as keep_id
            FROM public.sources
            GROUP BY url
        )
        UPDATE public.posts p
        SET source_id = d.keep_id
        FROM public.sources s
        JOIN duplicates d ON s.url = d.url
        WHERE p.source_id = s.id AND s.id <> d.keep_id;
    """)
    op.execute("""
        WITH duplicates AS (
            SELECT url, MIN(id) as keep_id
            FROM public.sources
            GROUP BY url
        )
        DELETE FROM public.sources s
        USING duplicates d
        WHERE s.url = d.url AND s.id <> d.keep_id;
    """)

    # 2. Deduplicate posts
    op.execute("""
        WITH duplicates AS (
            SELECT url, MIN(id) as keep_id
            FROM public.posts
            GROUP BY url
        )
        UPDATE public.bookmarks b
        SET post_id = d.keep_id
        FROM public.posts p
        JOIN duplicates d ON p.url = d.url
        WHERE b.post_id = p.id AND p.id <> d.keep_id
        ON CONFLICT DO NOTHING;
    """)
    op.execute("""
        WITH duplicates AS (
            SELECT url, MIN(id) as keep_id
            FROM public.posts
            GROUP BY url
        )
        UPDATE public.post_views pv
        SET post_id = d.keep_id
        FROM public.posts p
        JOIN duplicates d ON p.url = d.url
        WHERE pv.post_id = p.id AND p.id <> d.keep_id
        ON CONFLICT DO NOTHING;
    """)
    op.execute("""
        WITH duplicates AS (
            SELECT url, MIN(id) as keep_id
            FROM public.posts
            GROUP BY url
        )
        DELETE FROM public.posts p
        USING duplicates d
        WHERE p.url = d.url AND p.id <> d.keep_id;
    """)

    # 3. Deduplicate crawler_settings
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

    # 4. Revert constraints & indexes
    op.execute("DROP INDEX IF EXISTS public.idx_sources_global_unique;")
    op.execute("DROP INDEX IF EXISTS public.idx_sources_user_unique;")
    op.create_unique_constraint('sources_url_key', 'sources', ['url'])
    op.drop_column('sources', 'user_id')

    op.drop_constraint('posts_url_source_id_key', 'posts', type_='unique')
    op.create_unique_constraint('posts_url_key', 'posts', ['url'])

    op.execute("DROP INDEX IF EXISTS public.idx_crawler_settings_global_unique;")
    op.execute("DROP INDEX IF EXISTS public.idx_crawler_settings_user_unique;")
    op.create_unique_constraint('crawler_settings_crawler_name_key', 'crawler_settings', ['crawler_name'])
    op.drop_column('crawler_settings', 'user_id')

    op.drop_column('crawl_logs', 'user_id')

