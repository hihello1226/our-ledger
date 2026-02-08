"""Add account_type field to accounts

Revision ID: 006
Revises: 005
Create Date: 2026-02-08

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add account_type column with default value 'checking'
    op.add_column(
        'accounts',
        sa.Column('account_type', sa.String(20), nullable=False, server_default='checking')
    )


def downgrade() -> None:
    op.drop_column('accounts', 'account_type')
