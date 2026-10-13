"""v3: meals + serving detail on entries, food catalogue, goals, body measurements

Revision ID: c4d8e1f7a3b2
Revises: 9a3f2b6c1d4e
Create Date: 2026-10-13 12:00:00.000000

Everything here is additive: new columns carry server defaults so rows written
by older app builds stay valid, and the new tables are independent.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4d8e1f7a3b2'
down_revision: Union[str, None] = '9a3f2b6c1d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- food_entry: meal, serving detail, extra nutrients ---
    op.alter_column('food_entry', 'name', existing_type=sa.String(length=120), type_=sa.String(length=160),
                    existing_nullable=False)
    for col in ('fiber_g', 'sugar_g', 'sodium_mg'):
        op.add_column('food_entry', sa.Column(col, sa.Float(), nullable=False, server_default='0'))
    op.add_column('food_entry', sa.Column('meal', sa.String(length=12), nullable=False, server_default='snack'))
    op.add_column('food_entry', sa.Column('eaten_at', sa.String(length=5), nullable=True))
    op.add_column('food_entry', sa.Column('serving_amount', sa.Float(), nullable=True))
    op.add_column('food_entry', sa.Column('serving_unit', sa.String(length=10), nullable=False, server_default='g'))
    op.add_column('food_entry', sa.Column('food_id', sa.UUID(), nullable=True))

    # --- food catalogue ---
    op.create_table(
        'food',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('owner_user_id', sa.UUID(), nullable=True),
        sa.Column('source', sa.String(length=20), nullable=False, server_default='curated'),
        sa.Column('name', sa.String(length=160), nullable=False),
        sa.Column('brand', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('calories_100g', sa.Float(), nullable=False, server_default='0'),
        sa.Column('protein_100g', sa.Float(), nullable=False, server_default='0'),
        sa.Column('carbs_100g', sa.Float(), nullable=False, server_default='0'),
        sa.Column('fat_100g', sa.Float(), nullable=False, server_default='0'),
        sa.Column('fiber_100g', sa.Float(), nullable=False, server_default='0'),
        sa.Column('sugar_100g', sa.Float(), nullable=False, server_default='0'),
        sa.Column('sodium_mg_100g', sa.Float(), nullable=False, server_default='0'),
        sa.Column('serving_g', sa.Float(), nullable=False, server_default='100'),
        sa.Column('serving_label', sa.String(length=40), nullable=False, server_default=''),
        sa.Column('is_approx', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('owner_user_id', 'name', 'brand', name='unique_food_per_owner'),
    )
    op.create_index(op.f('ix_food_owner_user_id'), 'food', ['owner_user_id'], unique=False)
    op.create_index(op.f('ix_food_name'), 'food', ['name'], unique=False)

    # --- goals ---
    op.create_table(
        'nutrition_goal',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('calories', sa.Integer(), nullable=False, server_default='2000'),
        sa.Column('protein_g', sa.Float(), nullable=False, server_default='100'),
        sa.Column('carbs_g', sa.Float(), nullable=False, server_default='250'),
        sa.Column('fat_g', sa.Float(), nullable=False, server_default='65'),
        sa.Column('water_ml', sa.Integer(), nullable=False, server_default='2500'),
        sa.Column('target_weight_kg', sa.Float(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('user_id'),
    )

    # --- body measurements ---
    op.create_table(
        'body_measurement',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'date', 'kind', name='unique_user_date_kind'),
    )
    op.create_index(op.f('ix_body_measurement_user_id'), 'body_measurement', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_body_measurement_user_id'), table_name='body_measurement')
    op.drop_table('body_measurement')
    op.drop_table('nutrition_goal')
    op.drop_index(op.f('ix_food_name'), table_name='food')
    op.drop_index(op.f('ix_food_owner_user_id'), table_name='food')
    op.drop_table('food')
    for col in ('food_id', 'serving_unit', 'serving_amount', 'eaten_at', 'meal', 'sodium_mg', 'sugar_g', 'fiber_g'):
        op.drop_column('food_entry', col)
    op.alter_column('food_entry', 'name', existing_type=sa.String(length=160), type_=sa.String(length=120),
                    existing_nullable=False)
