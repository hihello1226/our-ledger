"""add subcategories table and update entries

Revision ID: 007
Revises: 006
Create Date: 2026-02-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    # Create subcategories table
    op.create_table(
        'subcategories',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('category_id', UUID(as_uuid=True), sa.ForeignKey('categories.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('sort_order', sa.Integer(), default=0),
    )

    # Add subcategory_id to entries
    op.add_column('entries', sa.Column('subcategory_id', UUID(as_uuid=True), sa.ForeignKey('subcategories.id'), nullable=True))

    # Remove old subcategory text column (if exists)
    try:
        op.drop_column('entries', 'subcategory')
    except:
        pass  # Column might not exist


def downgrade():
    # Add back the subcategory text column
    op.add_column('entries', sa.Column('subcategory', sa.String(100), nullable=True))

    # Remove subcategory_id from entries
    op.drop_column('entries', 'subcategory_id')

    # Drop subcategories table
    op.drop_table('subcategories')
