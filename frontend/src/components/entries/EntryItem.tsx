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
}

export default function EntryItem({ entry, categories, onEdit, onDelete }: EntryItemProps) {
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

  return (
    <div
      className="flex items-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
      onClick={() => onEdit(entry)}
    >
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

      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(entry.id);
        }}
        className="text-gray-300 hover:text-red-500 flex-shrink-0 ml-1"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
