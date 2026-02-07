// Default category icons (fallback when DB doesn't have icon)
export const CATEGORY_ICONS: Record<string, string> = {
  // Expense
  '식비': '🍽️',
  '교통': '🚗',
  '주거': '🏠',
  '통신': '📱',
  '의료': '🏥',
  '교육': '📚',
  '여가': '🎮',
  '쇼핑': '🛍️',
  '생활': '🧹',
  '경조사': '🎁',
  '보험': '🛡️',
  '세금': '📋',
  '기타지출': '💸',
  // Income
  '급여': '💰',
  '부수입': '💵',
  '이자': '🏦',
  '용돈': '🎀',
  '기타수입': '📥',
};

// Default category colors (fallback when DB doesn't have color)
export const CATEGORY_COLORS: Record<string, string> = {
  // Expense
  '식비': '#F97316',
  '교통': '#3B82F6',
  '주거': '#10B981',
  '통신': '#8B5CF6',
  '의료': '#EF4444',
  '교육': '#06B6D4',
  '여가': '#EC4899',
  '쇼핑': '#F59E0B',
  '생활': '#84CC16',
  '경조사': '#6366F1',
  '보험': '#14B8A6',
  '세금': '#64748B',
  '기타지출': '#9CA3AF',
  // Income
  '급여': '#22C55E',
  '부수입': '#10B981',
  '이자': '#06B6D4',
  '용돈': '#F472B6',
  '기타수입': '#9CA3AF',
};

// Type-based default styles
export const TYPE_STYLES = {
  expense: { icon: '💸', color: '#EF4444' },
  income: { icon: '💰', color: '#22C55E' },
  transfer: { icon: '🔄', color: '#8B5CF6' },
};

export function getCategoryIcon(categoryName: string | null, dbIcon?: string | null): string {
  if (dbIcon) return dbIcon;
  if (categoryName && CATEGORY_ICONS[categoryName]) return CATEGORY_ICONS[categoryName];
  return '📌';
}

export function getCategoryColor(categoryName: string | null, dbColor?: string | null): string {
  if (dbColor) return dbColor;
  if (categoryName && CATEGORY_COLORS[categoryName]) return CATEGORY_COLORS[categoryName];
  return '#9CA3AF';
}
