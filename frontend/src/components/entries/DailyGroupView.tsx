'use client';

import { Entry } from '@/lib/api';
import EntryGroupHeader from './EntryGroupHeader';
import EntryItem from './EntryItem';

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
}

interface DailyGroupViewProps {
  entries: Entry[];
  categories: Category[];
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (id: string) => void;
}

interface DailyGroup {
  date: string;
  dayOfWeek: string;
  entries: Entry[];
  totalIncome: number;
  totalExpense: number;
}

export default function DailyGroupView({
  entries,
  categories,
  onEditEntry,
  onDeleteEntry,
}: DailyGroupViewProps) {
  // Group entries by date
  const groupedEntries = entries.reduce<Record<string, Entry[]>>((acc, entry) => {
    const date = entry.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {});

  // Convert to array and sort by date desc
  const groups: DailyGroup[] = Object.entries(groupedEntries)
    .map(([date, entries]) => {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.toLocaleDateString('ko-KR', { weekday: 'short' });

      let totalIncome = 0;
      let totalExpense = 0;

      entries.forEach((entry) => {
        if (entry.type === 'income' || entry.transfer_type === 'external_in') {
          totalIncome += entry.amount;
        } else if (entry.type === 'expense' || entry.transfer_type === 'external_out') {
          totalExpense += entry.amount;
        }
      });

      return {
        date,
        dayOfWeek,
        entries,
        totalIncome,
        totalExpense,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const formatDateTitle = (dateStr: string, dayOfWeek: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일 ${dayOfWeek}`;
  };

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl text-center text-gray-500 py-12">
        조건에 맞는 거래 내역이 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.date} className="bg-white rounded-xl overflow-hidden shadow-sm">
          <EntryGroupHeader
            title={formatDateTitle(group.date, group.dayOfWeek)}
            totalIncome={group.totalIncome}
            totalExpense={group.totalExpense}
          />
          <div>
            {group.entries.map((entry) => (
              <EntryItem
                key={entry.id}
                entry={entry}
                categories={categories}
                onEdit={onEditEntry}
                onDelete={onDeleteEntry}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
