'use client';

import { useState } from 'react';
import { Entry } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
}

interface CalendarViewProps {
  entries: Entry[];
  categories: Category[];
  currentMonth: string; // YYYY-MM format
  onMonthChange: (month: string) => void;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (id: string) => void;
}

interface DayData {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  income: number;
  expense: number;
  entries: Entry[];
}

export default function CalendarView({
  entries,
  categories,
  currentMonth,
  onMonthChange,
  onEditEntry,
  onDeleteEntry,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000) {
      return Math.floor(amount / 10000) + '만';
    }
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // Parse current month
  const [year, month] = currentMonth.split('-').map(Number);
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Group entries by date
  const entriesByDate = entries.reduce<Record<string, Entry[]>>((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {});

  // Build calendar grid
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const calendarDays: DayData[] = [];

  // Previous month days
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, month - 2, day);
    const dateStr = date.toISOString().split('T')[0];
    calendarDays.push({
      date,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      income: 0,
      expense: 0,
      entries: [],
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = date.toISOString().split('T')[0];
    const dayEntries = entriesByDate[dateStr] || [];

    let income = 0;
    let expense = 0;
    dayEntries.forEach((entry) => {
      if (entry.type === 'income' || entry.transfer_type === 'external_in') {
        income += entry.amount;
      } else if (entry.type === 'expense' || entry.transfer_type === 'external_out') {
        expense += entry.amount;
      }
    });

    calendarDays.push({
      date,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      income,
      expense,
      entries: dayEntries,
    });
  }

  // Next month days (fill to complete last row)
  const remainingDays = 42 - calendarDays.length; // 6 rows * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    calendarDays.push({
      date,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      income: 0,
      expense: 0,
      entries: [],
    });
  }

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  const handlePrevMonth = () => {
    const prevMonth = new Date(year, month - 2, 1);
    onMonthChange(`${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(year, month, 1);
    onMonthChange(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleToday = () => {
    const now = new Date();
    onMonthChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  const selectedDayData = selectedDate
    ? calendarDays.find((d) => d.dateStr === selectedDate)
    : null;

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              {year}년 {month}월
            </h2>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              오늘
            </button>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-2">
          {weekdays.map((day, idx) => (
            <div
              key={day}
              className={`text-center text-sm font-medium py-2 ${
                idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-600'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {calendarDays.map((day, idx) => {
            const dayOfWeek = idx % 7;
            const isSelected = selectedDate === day.dateStr;

            return (
              <div
                key={day.dateStr + idx}
                onClick={() => day.isCurrentMonth && setSelectedDate(day.dateStr)}
                className={`
                  min-h-[80px] p-1 cursor-pointer transition-colors
                  ${day.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'}
                  ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
                `}
              >
                <div
                  className={`
                    text-sm font-medium mb-1
                    ${!day.isCurrentMonth ? 'text-gray-300' : ''}
                    ${day.isToday ? 'w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full' : ''}
                    ${dayOfWeek === 0 && day.isCurrentMonth && !day.isToday ? 'text-red-500' : ''}
                    ${dayOfWeek === 6 && day.isCurrentMonth && !day.isToday ? 'text-blue-500' : ''}
                  `}
                >
                  {day.date.getDate()}
                </div>
                {day.isCurrentMonth && (day.income > 0 || day.expense > 0) && (
                  <div className="space-y-0.5 mt-0.5">
                    {day.income > 0 && (
                      <div className="text-[10px] text-green-700 bg-green-50 rounded px-1 truncate font-medium">
                        +{formatCurrency(day.income)}
                      </div>
                    )}
                    {day.expense > 0 && (
                      <div className="text-[10px] text-red-700 bg-red-50 rounded px-1 truncate font-medium">
                        -{formatCurrency(day.expense)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDayData && selectedDayData.entries.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">
                {selectedDayData.date.getMonth() + 1}월 {selectedDayData.date.getDate()}일{' '}
                {weekdays[selectedDayData.date.getDay()]}요일
              </span>
              <div className="flex items-center gap-2 text-xs">
                {selectedDayData.income > 0 && (
                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                    수입 +{new Intl.NumberFormat('ko-KR').format(selectedDayData.income)}
                  </span>
                )}
                {selectedDayData.expense > 0 && (
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                    지출 -{new Intl.NumberFormat('ko-KR').format(selectedDayData.expense)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {selectedDayData.entries.map((entry) => {
              const category = categories.find((c) => c.id === entry.category_id);
              return (
                <div
                  key={entry.id}
                  onClick={() => onEditEntry(entry)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: category?.color ? `${category.color}20` : '#F3F4F6' }}
                    >
                      {entry.type === 'transfer' ? '🔄' : (category?.icon || '📌')}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {entry.type === 'transfer'
                          ? (entry.transfer_type === 'internal' ? '내부 이체' :
                             entry.transfer_type === 'external_out' ? '외부 송금' : '외부 입금')
                          : (category?.name || '미분류')}
                      </div>
                      {entry.memo && (
                        <div className="text-xs text-gray-500">{entry.memo}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold text-sm ${
                        entry.type === 'expense' || entry.transfer_type === 'external_out'
                          ? 'text-red-600'
                          : entry.type === 'income' || entry.transfer_type === 'external_in'
                          ? 'text-green-600'
                          : 'text-purple-600'
                      }`}
                    >
                      {entry.type === 'expense' || entry.transfer_type === 'external_out' ? '-' :
                       entry.type === 'income' || entry.transfer_type === 'external_in' ? '+' : ''}
                      {new Intl.NumberFormat('ko-KR').format(entry.amount)}원
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEntry(entry.id);
                      }}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State for Selected Day */}
      {selectedDayData && selectedDayData.entries.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          {selectedDayData.date.getMonth() + 1}월 {selectedDayData.date.getDate()}일에는 거래 내역이 없습니다
        </div>
      )}
    </div>
  );
}
