"""Add transfer_type field and indexes

Revision ID: 004
Revises: 003
Create Date: 2026-02-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add transfer_type column to entries table
    op.add_column('entries', sa.Column('transfer_type', sa.String(20), nullable=True))

    # Create indexes for better query performance
    op.create_index('ix_entries_transfer_type', 'entries', ['transfer_type'])
    op.create_index('ix_entries_date', 'entries', ['date'])
    op.create_index('ix_entries_amount', 'entries', ['amount'])


def downgrade() -> None:
    op.drop_index('ix_entries_amount', table_name='entries')
    op.drop_index('ix_entries_date', table_name='entries')
    op.drop_index('ix_entries_transfer_type', table_name='entries')
    op.drop_column('entries', 'transfer_type')
