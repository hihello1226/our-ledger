"""Add color and icon fields to categories

Revision ID: 005
Revises: 004
Create Date: 2026-02-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


# Default category styles
CATEGORY_STYLES = {
    # Expense categories
    '식비': {'color': '#F97316', 'icon': '🍽️'},
    '교통': {'color': '#3B82F6', 'icon': '🚗'},
    '주거': {'color': '#10B981', 'icon': '🏠'},
    '통신': {'color': '#8B5CF6', 'icon': '📱'},
    '의료': {'color': '#EF4444', 'icon': '🏥'},
    '교육': {'color': '#06B6D4', 'icon': '📚'},
    '여가': {'color': '#EC4899', 'icon': '🎮'},
    '쇼핑': {'color': '#F59E0B', 'icon': '🛍️'},
    '생활': {'color': '#84CC16', 'icon': '🧹'},
    '경조사': {'color': '#6366F1', 'icon': '🎁'},
    '보험': {'color': '#14B8A6', 'icon': '🛡️'},
    '세금': {'color': '#64748B', 'icon': '📋'},
    '기타지출': {'color': '#9CA3AF', 'icon': '💸'},
    # Income categories
    '급여': {'color': '#22C55E', 'icon': '💰'},
    '부수입': {'color': '#10B981', 'icon': '💵'},
    '이자': {'color': '#06B6D4', 'icon': '🏦'},
    '용돈': {'color': '#F472B6', 'icon': '🎀'},
    '기타수입': {'color': '#9CA3AF', 'icon': '📥'},
}


def upgrade() -> None:
    # Add columns
    op.add_column('categories', sa.Column('color', sa.String(20), nullable=True))
    op.add_column('categories', sa.Column('icon', sa.String(10), nullable=True))

    # Update existing categories with default styles
    for name, style in CATEGORY_STYLES.items():
        op.execute(
            f"UPDATE categories SET color = '{style['color']}', icon = '{style['icon']}' WHERE name = '{name}'"
        )


def downgrade() -> None:
    op.drop_column('categories', 'icon')
    op.drop_column('categories', 'color')
