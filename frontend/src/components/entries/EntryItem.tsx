'use client';

import { Entry } from '@/lib/api';
import { getCategoryIcon } from '@/lib/categoryStyles';

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
}

interface EntryItemProps {
  entry: Entry;
  categories: Category[];
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function EntryItem({
  entry,
  categories,
  onEdit,
  onDelete,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: EntryItemProps) {
  const category = categories.find((c) => c.id === entry.category_id);
  const icon = getCategoryIcon(category?.name || null, category?.icon);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const getAmountColor = () => {
    if (entry.type === 'expense') return 'text-red-600';
    if (entry.type === 'income') return 'text-green-600';
    if (entry.transfer_type === 'external_out') return 'text-orange-600';
    if (entry.transfer_type === 'external_in') return 'text-teal-600';
    return 'text-purple-600';
  };

  const getAmountPrefix = () => {
    if (entry.type === 'expense' || entry.transfer_type === 'external_out') return '-';
    if (entry.type === 'income' || entry.transfer_type === 'external_in') return '+';
    return '';
  };

  const getTypeLabel = () => {
    if (entry.type === 'transfer') {
      switch (entry.transfer_type) {
        case 'internal': return '내부 이체';
        case 'external_out': return '외부 송금';
        case 'external_in': return '외부 입금';
        default: return '이체';
      }
    }
    return entry.type === 'income' ? '수입' : '지출';
  };

  const formatTime = (occurredAt: string | null) => {
    if (!occurredAt) return '';
    const date = new Date(occurredAt);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(entry.id);
    } else {
      onEdit(entry);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 py-3 px-4 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
        isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
      }`}
      onClick={handleClick}
    >
      {/* Checkbox (선택 모드일 때만 표시) */}
      {isSelectionMode && (
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-gray-300 bg-white'
          }`}
        >
          {isSelected && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      )}

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: category?.color ? `${category.color}20` : '#F3F4F6' }}
      >
        {entry.type === 'transfer' ? '🔄' : icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
            {entry.type === 'transfer' ? getTypeLabel() : (category?.name || '미분류')}
            {entry.subcategory_name && entry.type !== 'transfer' && (
              <span className="text-gray-500 font-normal"> &gt; {entry.subcategory_name}</span>
            )}
          </span>
          {entry.shared && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">공동</span>
          )}
        </div>
        <div className="text-sm text-gray-500 truncate">
          {formatTime(entry.occurred_at)}
          {entry.memo && ` · ${entry.memo}`}
          {entry.account_name && ` · ${entry.account_name}`}
          {entry.type === 'transfer' && entry.transfer_from_account_name && (
            <span className="text-purple-500">
              {` ${entry.transfer_from_account_name} → ${entry.transfer_to_account_name}`}
            </span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <div className={`font-bold ${getAmountColor()}`}>
          {getAmountPrefix()}{formatCurrency(entry.amount)}
        </div>
        {entry.balance_after !== null && (
          <div className="text-xs text-gray-400">
            잔액 {formatCurrency(entry.balance_after)}
          </div>
        )}
      </div>

      {/* Delete Button (선택 모드가 아닐 때만 표시) */}
      {!isSelectionMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('삭제하시겠습니까?')) {
              onDelete(entry.id);
            }
          }}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
          title="삭제"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}
