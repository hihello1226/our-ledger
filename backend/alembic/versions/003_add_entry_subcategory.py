"""Add subcategory field to entries

Revision ID: 003
Revises: 002
Create Date: 2026-02-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add subcategory column to entries table
    op.add_column('entries', sa.Column('subcategory', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('entries', 'subcategory')
