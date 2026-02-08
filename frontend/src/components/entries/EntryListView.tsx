'use client';

import { Entry } from '@/lib/api';
import DailyGroupView from './DailyGroupView';
import WeeklyGroupView from './WeeklyGroupView';
import CalendarView from './CalendarView';

export type ViewMode = 'daily' | 'weekly' | 'monthly';

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
}

interface EntryListViewProps {
  entries: Entry[];
  categories: Category[];
  viewMode: ViewMode;
  currentMonth: string;
  onViewModeChange: (mode: ViewMode) => void;
  onMonthChange: (month: string) => void;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (id: string) => void;
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function EntryListView({
  entries,
  categories,
  viewMode,
  currentMonth,
  onViewModeChange,
  onMonthChange,
  onEditEntry,
  onDeleteEntry,
  isSelectionMode = false,
  selectedIds = new Set(),
  onToggleSelect,
}: EntryListViewProps) {
  const viewModes: { key: ViewMode; label: string }[] = [
    { key: 'daily', label: '일별' },
    { key: 'weekly', label: '주별' },
    { key: 'monthly', label: '월별' },
  ];

  return (
    <div className="space-y-4">
      {/* View Mode Selector */}
      <div className="flex gap-2">
        {viewModes.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onViewModeChange(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* View Content */}
      {viewMode === 'daily' && (
        <DailyGroupView
          entries={entries}
          categories={categories}
          onEditEntry={onEditEntry}
          onDeleteEntry={onDeleteEntry}
          isSelectionMode={isSelectionMode}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      )}
      {viewMode === 'weekly' && (
        <WeeklyGroupView
          entries={entries}
          categories={categories}
          onEditEntry={onEditEntry}
          onDeleteEntry={onDeleteEntry}
          isSelectionMode={isSelectionMode}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      )}
      {viewMode === 'monthly' && (
        <CalendarView
          entries={entries}
          categories={categories}
          currentMonth={currentMonth}
          onMonthChange={onMonthChange}
          onEditEntry={onEditEntry}
          onDeleteEntry={onDeleteEntry}
          isSelectionMode={isSelectionMode}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      )}
    </div>
  );
}
