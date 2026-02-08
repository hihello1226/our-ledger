'use client';

import Link from 'next/link';
import { Entry } from '@/lib/api';
import { getCategoryIcon } from '@/lib/categoryStyles';

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
}

interface RecentTransactionsProps {
  entries: Entry[];
  categories: Category[];
}

export default function RecentTransactions({ entries, categories }: RecentTransactionsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const getAmountColor = (entry: Entry) => {
    if (entry.type === 'expense') return 'text-red-600';
    if (entry.type === 'income') return 'text-green-600';
    if (entry.transfer_type === 'external_out') return 'text-orange-600';
    if (entry.transfer_type === 'external_in') return 'text-teal-600';
    return 'text-purple-600';
  };

  const getAmountPrefix = (entry: Entry) => {
    if (entry.type === 'expense' || entry.transfer_type === 'external_out') return '-';
    if (entry.type === 'income' || entry.transfer_type === 'external_in') return '+';
    return '';
  };

  const recentEntries = entries.slice(0, 5);

  if (recentEntries.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">최근 거래</h3>
          <Link href="/entries" className="text-sm text-blue-600 hover:underline">
            전체보기 &rarr;
          </Link>
        </div>
        <div className="py-8 text-center text-gray-400">
          거래 내역이 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">최근 거래</h3>
        <Link href="/entries" className="text-sm text-blue-600 hover:underline">
          전체보기 &rarr;
        </Link>
      </div>
      <div className="divide-y divide-gray-100 -mx-4">
        {recentEntries.map((entry) => {
          const category = categories.find((c) => c.id === entry.category_id);
          const icon = getCategoryIcon(category?.name || null, category?.icon);

          return (
            <div
              key={entry.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                style={{
                  backgroundColor: category?.color
                    ? `${category.color}20`
                    : '#F3F4F6',
                }}
              >
                {entry.type === 'transfer' ? '🔄' : icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {entry.type === 'transfer'
                    ? entry.transfer_type === 'internal'
                      ? '내부 이체'
                      : entry.transfer_type === 'external_out'
                      ? '외부 송금'
                      : '외부 입금'
                    : category?.name || '미분류'}
                </div>
                {entry.memo && (
                  <div className="text-xs text-gray-500 truncate">{entry.memo}</div>
                )}
              </div>
              <div className={`text-sm font-bold ${getAmountColor(entry)} flex-shrink-0`}>
                {getAmountPrefix(entry)}
                {formatCurrency(entry.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
