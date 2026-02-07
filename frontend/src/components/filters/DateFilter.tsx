'use client';

import { useState } from 'react';

export type DatePreset = 'today' | 'this_week' | 'this_month' | 'custom' | null;

interface DateFilterProps {
  dateFrom: string;
  dateTo: string;
  datePreset: DatePreset;
  month: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onPresetChange: (preset: DatePreset) => void;
  onMonthChange: (month: string) => void;
}

export default function DateFilter({
  dateFrom,
  dateTo,
  datePreset,
  month,
  onDateFromChange,
  onDateToChange,
  onPresetChange,
  onMonthChange,
}: DateFilterProps) {
  const [showCustom, setShowCustom] = useState(datePreset === 'custom');

  const handlePresetClick = (preset: DatePreset) => {
    if (preset === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
    }
    onPresetChange(preset);
  };

  const handlePrevMonth = () => {
    const [year, mon] = month.split('-').map(Number);
    const date = new Date(year, mon - 2, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
    onPresetChange(null);
    setShowCustom(false);
  };

  const handleNextMonth = () => {
    const [year, mon] = month.split('-').map(Number);
    const date = new Date(year, mon, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
    onPresetChange(null);
    setShowCustom(false);
  };

  const formatMonth = (monthStr: string) => {
    const [year, mon] = monthStr.split('-');
    return `${year}년 ${parseInt(mon)}월`;
  };

  const presetButtons = [
    { key: 'today', label: '오늘' },
    { key: 'this_week', label: '이번주' },
    { key: 'this_month', label: '이번달' },
    { key: 'custom', label: '직접' },
  ] as const;

  return (
    <div className="space-y-3">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
        >
          &lt;
        </button>
        <span className="text-lg font-semibold">{formatMonth(month)}</span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
        >
          &gt;
        </button>
      </div>

      {/* Preset Buttons */}
      <div className="flex gap-2">
        {presetButtons.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handlePresetClick(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              datePreset === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      {showCustom && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="input text-sm"
          />
          <span className="text-gray-500">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="input text-sm"
          />
        </div>
      )}
    </div>
  );
}
