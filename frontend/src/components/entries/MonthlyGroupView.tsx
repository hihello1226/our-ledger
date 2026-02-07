'use client';

import { Entry } from '@/lib/api';
import EntryGroupHeader from './EntryGroupHeader';

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
}

interface MonthlyGroupViewProps {
  entries: Entry[];
  categories: Category[];
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (id: string) => void;
}

interface MonthlyGroup {
  monthKey: string;
  monthLabel: string;
  weeklyGroups: {
    weekNum: number;
    weekLabel: string;
    totalIncome: number;
    totalExpense: number;
  }[];
  totalIncome: number;
  totalExpense: number;
}

function getWeekNumber(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const firstDayOfWeek = firstDay.getDay();
  return Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
}

export default function MonthlyGroupView({
  entries,
  categories,
  onEditEntry,
  onDeleteEntry,
}: MonthlyGroupViewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.abs(amount));
  };

  // Group entries by month
  const monthlyData = entries.reduce<Record<string, Entry[]>>((acc, entry) => {
    const date = new Date(entry.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(entry);
    return acc;
  }, {});

  // Convert to groups array
  const groups: MonthlyGroup[] = Object.entries(monthlyData)
    .map(([monthKey, entries]) => {
      const [year, month] = monthKey.split('-').map(Number);

      // Group by week within the month
      const weeklyData = entries.reduce<Record<number, Entry[]>>((acc, entry) => {
        const date = new Date(entry.date);
        const weekNum = getWeekNumber(date);

        if (!acc[weekNum]) {
          acc[weekNum] = [];
        }
        acc[weekNum].push(entry);
        return acc;
      }, {});

      const weeklyGroups = Object.entries(weeklyData)
        .map(([weekNumStr, weekEntries]) => {
          const weekNum = parseInt(weekNumStr);
          let totalIncome = 0;
          let totalExpense = 0;

          weekEntries.forEach((entry) => {
            if (entry.type === 'income' || entry.transfer_type === 'external_in') {
              totalIncome += entry.amount;
            } else if (entry.type === 'expense' || entry.transfer_type === 'external_out') {
              totalExpense += entry.amount;
            }
          });

          return {
            weekNum,
            weekLabel: `${weekNum}주차`,
            totalIncome,
            totalExpense,
          };
        })
        .sort((a, b) => b.weekNum - a.weekNum);

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
        monthKey,
        monthLabel: `${year}년 ${month}월`,
        weeklyGroups,
        totalIncome,
        totalExpense,
      };
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

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
        <div key={group.monthKey} className="bg-white rounded-xl overflow-hidden shadow-sm">
          <EntryGroupHeader
            title={group.monthLabel}
            totalIncome={group.totalIncome}
            totalExpense={group.totalExpense}
          />
          <div className="divide-y divide-gray-100">
            {group.weeklyGroups.map((week) => {
              const netAmount = week.totalIncome - week.totalExpense;
              return (
                <div
                  key={week.weekNum}
                  className="flex items-center justify-between py-3 px-4 hover:bg-gray-50"
                >
                  <span className="text-gray-700">{week.weekLabel}</span>
                  <div className="flex items-center gap-3 text-sm">
                    {week.totalIncome > 0 && (
                      <span className="text-green-600">+{formatCurrency(week.totalIncome)}</span>
                    )}
                    {week.totalExpense > 0 && (
                      <span className="text-red-600">-{formatCurrency(week.totalExpense)}</span>
                    )}
                    <span className={`font-medium ${netAmount >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {netAmount >= 0 ? '+' : '-'}{formatCurrency(netAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
