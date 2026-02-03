"""v1.1 accounts and extensions

Revision ID: 002
Revises: 001
Create Date: 2024-02-01

Changes:
- Add accounts table
- Add external_data_sources table
- Add entry_external_refs table
- Add monthly_settlements table
- Extend entries table with occurred_at, account_id, transfer fields
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create accounts table
    op.create_table(
        'accounts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('owner_user_id', sa.UUID(), nullable=False),
        sa.Column('household_id', sa.UUID(), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('bank_name', sa.String(100), nullable=True),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('balance', sa.Integer(), nullable=True),
        sa.Column('is_shared_visible', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['owner_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['household_id'], ['households.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_accounts_owner_user_id', 'accounts', ['owner_user_id'])
    op.create_index('ix_accounts_household_id', 'accounts', ['household_id'])

    # 2. Extend entries table
    # Add occurred_at column
    op.add_column('entries', sa.Column('occurred_at', sa.DateTime(), nullable=True))

    # Add account_id column
    op.add_column('entries', sa.Column('account_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_entries_account_id',
        'entries', 'accounts',
        ['account_id'], ['id']
    )

    # Add transfer_from_account_id column
    op.add_column('entries', sa.Column('transfer_from_account_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_entries_transfer_from_account_id',
        'entries', 'accounts',
        ['transfer_from_account_id'], ['id']
    )

    # Add transfer_to_account_id column
    op.add_column('entries', sa.Column('transfer_to_account_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_entries_transfer_to_account_id',
        'entries', 'accounts',
        ['transfer_to_account_id'], ['id']
    )

    # Populate occurred_at from date for existing entries
    op.execute("""
        UPDATE entries
        SET occurred_at = date::timestamp
        WHERE occurred_at IS NULL
    """)

    # 3. Create external_data_sources table
    op.create_table(
        'external_data_sources',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('household_id', sa.UUID(), nullable=False),
        sa.Column('created_by_user_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('sheet_id', sa.String(255), nullable=False),
        sa.Column('sheet_name', sa.String(255), nullable=False, server_default='Sheet1'),
        sa.Column('account_id', sa.UUID(), nullable=True),
        sa.Column('column_mapping', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('sync_direction', sa.String(20), nullable=False, server_default='import'),
        sa.Column('last_synced_at', sa.DateTime(), nullable=True),
        sa.Column('last_synced_row', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['household_id'], ['households.id']),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_external_data_sources_household_id', 'external_data_sources', ['household_id'])

    # 4. Create entry_external_refs table
    op.create_table(
        'entry_external_refs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('entry_id', sa.UUID(), nullable=False),
        sa.Column('source_id', sa.UUID(), nullable=False),
        sa.Column('external_row_id', sa.String(255), nullable=False),
        sa.Column('external_hash', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['entry_id'], ['entries.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_id'], ['external_data_sources.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_id', 'external_row_id', name='uq_source_external_row')
    )
    op.create_index('ix_entry_external_refs_entry_id', 'entry_external_refs', ['entry_id'])
    op.create_index('ix_entry_external_refs_source_id', 'entry_external_refs', ['source_id'])

    # 5. Create monthly_settlements table
    op.create_table(
        'monthly_settlements',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('household_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('month', sa.String(7), nullable=False),
        sa.Column('settlement_amount', sa.Integer(), nullable=False),
        sa.Column('is_finalized', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['household_id'], ['households.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('household_id', 'user_id', 'month', name='uq_household_user_month')
    )
    op.create_index('ix_monthly_settlements_household_id', 'monthly_settlements', ['household_id'])
    op.create_index('ix_monthly_settlements_user_id', 'monthly_settlements', ['user_id'])
    op.create_index('ix_monthly_settlements_month', 'monthly_settlements', ['month'])


def downgrade() -> None:
    # Drop monthly_settlements table
    op.drop_index('ix_monthly_settlements_month', table_name='monthly_settlements')
    op.drop_index('ix_monthly_settlements_user_id', table_name='monthly_settlements')
    op.drop_index('ix_monthly_settlements_household_id', table_name='monthly_settlements')
    op.drop_table('monthly_settlements')

    # Drop entry_external_refs table
    op.drop_index('ix_entry_external_refs_source_id', table_name='entry_external_refs')
    op.drop_index('ix_entry_external_refs_entry_id', table_name='entry_external_refs')
    op.drop_table('entry_external_refs')

    # Drop external_data_sources table
    op.drop_index('ix_external_data_sources_household_id', table_name='external_data_sources')
    op.drop_table('external_data_sources')

    # Remove entries table extensions
    op.drop_constraint('fk_entries_transfer_to_account_id', 'entries', type_='foreignkey')
    op.drop_column('entries', 'transfer_to_account_id')

    op.drop_constraint('fk_entries_transfer_from_account_id', 'entries', type_='foreignkey')
    op.drop_column('entries', 'transfer_from_account_id')

    op.drop_constraint('fk_entries_account_id', 'entries', type_='foreignkey')
    op.drop_column('entries', 'account_id')

    op.drop_column('entries', 'occurred_at')

    # Drop accounts table
    op.drop_index('ix_accounts_household_id', table_name='accounts')
    op.drop_index('ix_accounts_owner_user_id', table_name='accounts')
    op.drop_table('accounts')
