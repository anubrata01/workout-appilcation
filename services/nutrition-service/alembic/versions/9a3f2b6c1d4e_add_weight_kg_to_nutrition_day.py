"""add weight_kg to nutrition_day

Revision ID: 9a3f2b6c1d4e
Revises: 722ee768e24a
Create Date: 2026-09-13 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a3f2b6c1d4e'
down_revision: Union[str, None] = '722ee768e24a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable, no default — body weight isn't logged every day, unlike
    # water/entries which default to empty/zero.
    op.add_column('nutrition_day', sa.Column('weight_kg', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('nutrition_day', 'weight_kg')
