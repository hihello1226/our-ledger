"""Initial migration

Revision ID: 001
Revises:
Create Date: 2024-01-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Households table
    op.create_table(
        'households',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('invite_code', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invite_code')
    )

    # Household members table
    op.create_table(
        'household_members',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('household_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('role', sa.String(20), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['household_id'], ['households.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('household_id', 'user_id', name='uq_household_user')
    )

    # Categories table
    op.create_table(
        'categories',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('household_id', sa.UUID(), nullable=True),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['household_id'], ['households.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Entries table
    op.create_table(
        'entries',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('household_id', sa.UUID(), nullable=False),
        sa.Column('created_by_user_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('category_id', sa.UUID(), nullable=True),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.Column('payer_member_id', sa.UUID(), nullable=False),
        sa.Column('shared', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['household_id'], ['households.id'], ),
        sa.ForeignKeyConstraint(['payer_member_id'], ['household_members.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Insert default categories
    op.execute("""
        INSERT INTO categories (id, household_id, name, type, sort_order) VALUES
        (gen_random_uuid(), NULL, '식비', 'expense', 1),
        (gen_random_uuid(), NULL, '교통비', 'expense', 2),
        (gen_random_uuid(), NULL, '주거비', 'expense', 3),
        (gen_random_uuid(), NULL, '통신비', 'expense', 4),
        (gen_random_uuid(), NULL, '의료비', 'expense', 5),
        (gen_random_uuid(), NULL, '문화/여가', 'expense', 6),
        (gen_random_uuid(), NULL, '쇼핑', 'expense', 7),
        (gen_random_uuid(), NULL, '기타', 'expense', 8),
        (gen_random_uuid(), NULL, '급여', 'income', 1),
        (gen_random_uuid(), NULL, '부수입', 'income', 2),
        (gen_random_uuid(), NULL, '용돈', 'income', 3),
        (gen_random_uuid(), NULL, '기타수입', 'income', 4)
    """)


def downgrade() -> None:
    op.drop_table('entries')
    op.drop_table('categories')
    op.drop_table('household_members')
    op.drop_table('households')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
