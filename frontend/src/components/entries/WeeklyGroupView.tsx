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

interface WeeklyGroupViewProps {
  entries: Entry[];
  categories: Category[];
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (id: string) => void;
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

interface WeeklyGroup {
  weekKey: string;
  weekLabel: string;
  dateRange: string;
  dailyGroups: {
    date: string;
    dayLabel: string;
    totalIncome: number;
    totalExpense: number;
    entries: Entry[];
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

function getWeekDateRange(year: number, month: number, week: number): { start: Date; end: Date } {
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  const startDate = new Date(year, month, 1 + (week - 1) * 7 - firstDayOfWeek);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  // Clamp to month boundaries
  if (startDate.getMonth() !== month) {
    startDate.setDate(1);
    startDate.setMonth(month);
  }
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  if (endDate.getDate() > lastDayOfMonth || endDate.getMonth() !== month) {
    endDate.setDate(lastDayOfMonth);
    endDate.setMonth(month);
  }

  return { start: startDate, end: endDate };
}

export default function WeeklyGroupView({
  entries,
  categories,
  onEditEntry,
  onDeleteEntry,
  isSelectionMode = false,
  selectedIds = new Set(),
  onToggleSelect,
}: WeeklyGroupViewProps) {
  // WeeklyGroupView는 요약 뷰이므로 선택 모드 미지원
  void isSelectionMode;
  void selectedIds;
  void onToggleSelect;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.abs(amount));
  };

  // Group entries by week
  const weeklyData = entries.reduce<Record<string, Entry[]>>((acc, entry) => {
    const date = new Date(entry.date);
    const weekNum = getWeekNumber(date);
    const weekKey = `${date.getFullYear()}-${date.getMonth()}-${weekNum}`;

    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(entry);
    return acc;
  }, {});

  // Convert to groups array
  const groups: WeeklyGroup[] = Object.entries(weeklyData)
    .map(([weekKey, entries]) => {
      const [year, month, week] = weekKey.split('-').map(Number);
      const { start, end } = getWeekDateRange(year, month, week);

      // Group by day within the week
      const dailyData = entries.reduce<Record<string, Entry[]>>((acc, entry) => {
        if (!acc[entry.date]) {
          acc[entry.date] = [];
        }
        acc[entry.date].push(entry);
        return acc;
      }, {});

      const dailyGroups = Object.entries(dailyData)
        .map(([date, dayEntries]) => {
          const dateObj = new Date(date);
          let totalIncome = 0;
          let totalExpense = 0;

          dayEntries.forEach((entry) => {
            if (entry.type === 'income' || entry.transfer_type === 'external_in') {
              totalIncome += entry.amount;
            } else if (entry.type === 'expense' || entry.transfer_type === 'external_out') {
              totalExpense += entry.amount;
            }
          });

          return {
            date,
            dayLabel: `${dateObj.getDate()}일 ${dateObj.toLocaleDateString('ko-KR', { weekday: 'short' })}`,
            totalIncome,
            totalExpense,
            entries: dayEntries,
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date));

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
        weekKey,
        weekLabel: `${month + 1}월 ${week}주차`,
        dateRange: `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`,
        dailyGroups,
        totalIncome,
        totalExpense,
      };
    })
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey));

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
        <div key={group.weekKey} className="bg-white rounded-xl overflow-hidden shadow-sm">
          <EntryGroupHeader
            title={group.weekLabel}
            subtitle={group.dateRange}
            totalIncome={group.totalIncome}
            totalExpense={group.totalExpense}
          />
          <div className="divide-y divide-gray-100">
            {group.dailyGroups.map((day) => {
              const netAmount = day.totalIncome - day.totalExpense;
              return (
                <div
                  key={day.date}
                  className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    // Could expand to show entries, but for now just show summary
                  }}
                >
                  <span className="text-gray-700 font-medium">{day.dayLabel}</span>
                  <div className="flex items-center gap-2 text-xs">
                    {day.totalIncome > 0 && (
                      <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded">
                        +{formatCurrency(day.totalIncome)}
                      </span>
                    )}
                    {day.totalExpense > 0 && (
                      <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded">
                        -{formatCurrency(day.totalExpense)}
                      </span>
                    )}
                    <span className={`font-semibold px-2 py-0.5 rounded ${
                      netAmount >= 0 ? 'text-blue-700 bg-blue-50' : 'text-orange-700 bg-orange-50'
                    }`}>
                      {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}
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
