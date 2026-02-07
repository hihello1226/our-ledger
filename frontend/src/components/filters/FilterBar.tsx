'use client';

import DateFilter, { DatePreset } from './DateFilter';
import TypeFilter, { EntryType, TransferType } from './TypeFilter';
import CategoryFilter from './CategoryFilter';
import AccountFilter from './AccountFilter';
import AmountFilter from './AmountFilter';
import SearchFilter from './SearchFilter';
import FilterChip from './FilterChip';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Account {
  id: string;
  name: string;
  bank_name: string | null;
}

export interface FilterState {
  month: string;
  dateFrom: string;
  dateTo: string;
  datePreset: DatePreset;
  types: EntryType[];
  transferType: TransferType;
  categoryIds: string[];
  accountIds: string[];
  amountMin: string;
  amountMax: string;
  memoSearch: string;
}

interface FilterBarProps {
  filters: FilterState;
  categories: Category[];
  accounts: Account[];
  onFilterChange: (filters: Partial<FilterState>) => void;
  onReset: () => void;
}

export default function FilterBar({
  filters,
  categories,
  accounts,
  onFilterChange,
  onReset,
}: FilterBarProps) {
  // Build active filter chips
  const activeFilters: { key: string; label: string; onRemove: () => void }[] = [];

  // Type filter chips (멀티 선택)
  const typeLabels: Record<string, string> = {
    income: '수입',
    expense: '지출',
    transfer: '이체',
  };

  filters.types.forEach((type) => {
    if (type) {
      let label = typeLabels[type] || type;
      // 이체의 경우 transferType도 표시
      if (type === 'transfer' && filters.transferType) {
        const transferLabels: Record<string, string> = {
          internal: '내부 이체',
          external_out: '외부 송금',
          external_in: '외부 입금',
        };
        label = transferLabels[filters.transferType] || label;
      }
      activeFilters.push({
        key: `type-${type}`,
        label,
        onRemove: () => {
          const newTypes = filters.types.filter((t) => t !== type);
          onFilterChange({
            types: newTypes,
            transferType: type === 'transfer' ? null : filters.transferType,
          });
        },
      });
    }
  });

  // Category filter chips
  filters.categoryIds.forEach((categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      activeFilters.push({
        key: `category-${categoryId}`,
        label: category.name,
        onRemove: () =>
          onFilterChange({
            categoryIds: filters.categoryIds.filter((id) => id !== categoryId),
          }),
      });
    }
  });

  // Account filter chips
  filters.accountIds.forEach((accountId) => {
    const account = accounts.find((a) => a.id === accountId);
    if (account) {
      activeFilters.push({
        key: `account-${accountId}`,
        label: account.name,
        onRemove: () =>
          onFilterChange({
            accountIds: filters.accountIds.filter((id) => id !== accountId),
          }),
      });
    }
  });

  // Amount filter chip
  if (filters.amountMin || filters.amountMax) {
    const formatAmount = (val: string) => {
      const num = parseInt(val);
      if (num >= 10000) {
        return `${Math.floor(num / 10000)}만`;
      }
      return new Intl.NumberFormat('ko-KR').format(num);
    };

    let label = '';
    if (filters.amountMin && filters.amountMax) {
      label = `${formatAmount(filters.amountMin)}~${formatAmount(filters.amountMax)}원`;
    } else if (filters.amountMin) {
      label = `${formatAmount(filters.amountMin)}원 이상`;
    } else {
      label = `${formatAmount(filters.amountMax)}원 이하`;
    }

    activeFilters.push({
      key: 'amount',
      label,
      onRemove: () => onFilterChange({ amountMin: '', amountMax: '' }),
    });
  }

  // Memo search chip
  if (filters.memoSearch) {
    activeFilters.push({
      key: 'memo',
      label: `"${filters.memoSearch}"`,
      onRemove: () => onFilterChange({ memoSearch: '' }),
    });
  }

  // Date preset chip
  if (filters.datePreset && filters.datePreset !== 'custom') {
    const presetLabels: Record<string, string> = {
      today: '오늘',
      this_week: '이번주',
      this_month: '이번달',
    };
    activeFilters.push({
      key: 'date-preset',
      label: presetLabels[filters.datePreset],
      onRemove: () => onFilterChange({ datePreset: null }),
    });
  }

  // Custom date range chip
  if (filters.datePreset === 'custom' && (filters.dateFrom || filters.dateTo)) {
    let label = '';
    if (filters.dateFrom && filters.dateTo) {
      label = `${filters.dateFrom} ~ ${filters.dateTo}`;
    } else if (filters.dateFrom) {
      label = `${filters.dateFrom}부터`;
    } else {
      label = `${filters.dateTo}까지`;
    }
    activeFilters.push({
      key: 'date-range',
      label,
      onRemove: () => onFilterChange({ datePreset: null, dateFrom: '', dateTo: '' }),
    });
  }

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="space-y-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      {/* Date Filter */}
      <DateFilter
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        datePreset={filters.datePreset}
        month={filters.month}
        onDateFromChange={(dateFrom) => onFilterChange({ dateFrom })}
        onDateToChange={(dateTo) => onFilterChange({ dateTo })}
        onPresetChange={(datePreset) => onFilterChange({ datePreset })}
        onMonthChange={(month) => onFilterChange({ month })}
      />

      {/* Type Filter */}
      <TypeFilter
        selectedTypes={filters.types}
        selectedTransferType={filters.transferType}
        onTypesChange={(types) => onFilterChange({ types })}
        onTransferTypeChange={(transferType) => onFilterChange({ transferType })}
      />

      {/* Second Row: Category, Account, Amount Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <CategoryFilter
          categories={categories}
          selectedCategoryIds={filters.categoryIds}
          onCategoryChange={(categoryIds) => onFilterChange({ categoryIds })}
        />
        <AccountFilter
          accounts={accounts}
          selectedAccountIds={filters.accountIds}
          onAccountChange={(accountIds) => onFilterChange({ accountIds })}
        />
        <AmountFilter
          amountMin={filters.amountMin}
          amountMax={filters.amountMax}
          onAmountMinChange={(amountMin) => onFilterChange({ amountMin })}
          onAmountMaxChange={(amountMax) => onFilterChange({ amountMax })}
        />
        <div className="flex-1 min-w-[200px]">
          <SearchFilter
            value={filters.memoSearch}
            onChange={(memoSearch) => onFilterChange({ memoSearch })}
          />
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-gray-100">
          {activeFilters.map((filter) => (
            <FilterChip key={filter.key} label={filter.label} onRemove={filter.onRemove} />
          ))}
          <button
            type="button"
            onClick={onReset}
            className="text-sm text-gray-500 hover:text-gray-700 ml-2"
          >
            초기화
          </button>
        </div>
      )}
    </div>
  );
}
