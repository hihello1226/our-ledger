// Default category icons (fallback when DB doesn't have icon)
export const CATEGORY_ICONS: Record<string, string> = {
  // Expense - DB 기본 카테고리
  '식비': '🍽️',
  '교통비': '🚗',
  '주거비': '🏠',
  '통신비': '📱',
  '의료비': '🏥',
  '문화/여가': '🎮',
  '쇼핑': '🛍️',
  '기타': '💸',
  // Expense - 확장 카테고리 (사용자 정의)
  '교통/차량': '🚗',
  '문화생활': '🎬',
  '마트/편의점': '🛒',
  '패션/미용': '👗',
  '생활용품': '🪑',
  '주거/통신': '🏠',
  '건강': '🏃',
  '교육': '📚',
  '경조사/회비': '🎁',
  '부모님': '👴',
  '채무': '💳',
  '생활': '🧹',
  '경조사': '🎁',
  '보험': '🛡️',
  '세금': '📋',
  // Income
  '급여': '💰',
  '부수입': '💵',
  '이자': '🏦',
  '용돈': '💵',
  '기타수입': '📥',
  // 미분류
  '미분류': '📌',
};

// Default category colors (fallback when DB doesn't have color)
export const CATEGORY_COLORS: Record<string, string> = {
  // Expense - DB 기본 카테고리
  '식비': '#FF6B35',       // 선명한 오렌지
  '교통비': '#4361EE',     // 진한 파랑
  '주거비': '#2EC4B6',     // 청록색
  '통신비': '#9B5DE5',     // 보라색
  '의료비': '#F72585',     // 핫핑크
  '문화/여가': '#E040FB',  // 밝은 보라
  '쇼핑': '#FFBE0B',       // 골드
  '기타': '#90A4AE',       // 블루그레이
  // Expense - 확장 카테고리 (사용자 정의)
  '교통/차량': '#4361EE',  // 진한 파랑
  '문화생활': '#E040FB',   // 밝은 보라
  '마트/편의점': '#8BC34A', // 연두
  '패션/미용': '#FF4081',  // 핑크
  '생활용품': '#795548',   // 브라운
  '주거/통신': '#607D8B',  // 블루그레이
  '건강': '#4CAF50',       // 녹색
  '교육': '#00B4D8',       // 하늘색
  '경조사/회비': '#FF006E', // 마젠타
  '부모님': '#9C27B0',     // 퍼플
  '채무': '#F44336',       // 레드
  '생활': '#7CB518',       // 라임 그린
  '경조사': '#FF006E',     // 마젠타
  '보험': '#3A86FF',       // 밝은 파랑
  '세금': '#757575',       // 그레이
  // Income
  '급여': '#00C853',       // 선명한 초록
  '부수입': '#00BFA5',     // 청록
  '이자': '#FFD600',       // 노랑
  '용돈': '#FF80AB',       // 연한 핑크
  '기타수입': '#81C784',   // 연두
  // 미분류
  '미분류': '#78909C',     // 회색 블루
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
