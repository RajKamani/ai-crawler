"""initial_schema

Revision ID: 343ebc0aa274
Revises: 
Create Date: 2026-05-25 22:16:17.861925

"""
import os
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '343ebc0aa274'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    this_dir = os.path.dirname(os.path.abspath(__file__))
    schema_path = os.path.abspath(os.path.join(this_dir, '..', '..', 'db', 'schema.sql'))
    if os.path.exists(schema_path):
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        connection = op.get_bind()
        connection.execute(sa.text(schema_sql))
    else:
        raise FileNotFoundError(f"Initial schema file not found at {schema_path}")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TRIGGER IF EXISTS tsvectorupdate ON posts")
    op.execute("DROP FUNCTION IF EXISTS posts_trigger_func")
    op.execute("DROP TABLE IF EXISTS crawler_settings CASCADE")
    op.execute("DROP TABLE IF EXISTS user_blogs CASCADE")
    op.execute("DROP TABLE IF EXISTS user_subreddits CASCADE")
    op.execute("DROP TABLE IF EXISTS bookmarks CASCADE")
    op.execute("DROP TABLE IF EXISTS posts CASCADE")
    op.execute("DROP TABLE IF EXISTS sources CASCADE")
