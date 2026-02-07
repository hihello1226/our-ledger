'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { entriesAPI, householdAPI, accountsAPI, Entry, Account, EntryCreateData, EntryListResponse, EntrySummary as EntrySummaryType } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import FilterBar, { FilterState } from '@/components/filters/FilterBar';
import EntrySummary from '@/components/EntrySummary';
import EntryListView, { ViewMode } from '@/components/entries/EntryListView';

type Category = {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
};

type Member = {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
};

const getInitialMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getInitialFilters = (): FilterState => ({
  month: getInitialMonth(),
  dateFrom: '',
  dateTo: '',
  datePreset: null,
  types: [],
  transferType: null,
  categoryIds: [],
  accountIds: [],
  amountMin: '',
  amountMax: '',
  memoSearch: '',
});

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // URL 쿼리 파라미터에서 초기 필터 설정
  useEffect(() => {
    const accountIdsParam = searchParams.get('account_ids');
    if (accountIdsParam) {
      setFilters(prev => ({
        ...prev,
        accountIds: accountIdsParam.split(','),
      }));
    }
  }, [searchParams]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // Summary state
  const [summary, setSummary] = useState<EntrySummaryType | null>(null);

  // Form state
  const [formType, setFormType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [formTransferType, setFormTransferType] = useState<string>('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formMemo, setFormMemo] = useState('');
  const [formPayerMemberId, setFormPayerMemberId] = useState('');
  const [formShared, setFormShared] = useState(false);
  const [formAccountId, setFormAccountId] = useState('');
  const [formTransferFromAccountId, setFormTransferFromAccountId] = useState('');
  const [formTransferToAccountId, setFormTransferToAccountId] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchEntries = useCallback(async () => {
    try {
      const params: Record<string, unknown> = {
        page,
        page_size: pageSize,
      };

      // Add filter params - 기본은 항상 month 사용
      if (filters.datePreset && filters.datePreset !== 'custom') {
        params.date_preset = filters.datePreset;
      } else if (filters.datePreset === 'custom' && (filters.dateFrom || filters.dateTo)) {
        if (filters.dateFrom) params.date_from = filters.dateFrom;
        if (filters.dateTo) params.date_to = filters.dateTo;
      } else {
        // 기본: 해당 월 데이터 표시
        params.month = filters.month;
      }

      // 타입 필터 (멀티 선택 지원)
      if (filters.types.length > 0 && filters.types.length < 3) {
        params.types = filters.types;
      }
      // 3개 전부 선택 = 전체이므로 필터 안 함

      if (filters.transferType) params.transfer_type = filters.transferType;
      if (filters.categoryIds.length) params.category_ids = filters.categoryIds;
      if (filters.accountIds.length) params.account_ids = filters.accountIds;
      if (filters.amountMin) params.amount_min = parseInt(filters.amountMin);
      if (filters.amountMax) params.amount_max = parseInt(filters.amountMax);
      if (filters.memoSearch) params.memo_search = filters.memoSearch;

      const data: EntryListResponse = await entriesAPI.list(params);
      setEntries(data.entries);
      setTotalCount(data.total_count);
      setTotalPages(data.total_pages);
      setHasNext(data.has_next);
      setHasPrev(data.has_prev);
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData, membersData, accountsData] = await Promise.all([
          entriesAPI.getCategories(),
          householdAPI.getMembers(),
          accountsAPI.list(),
        ]);
        setCategories(categoriesData);
        setMembers(membersData);
        setAccounts(accountsData);

        // Set default payer to current user
        const currentMember = membersData.find(m => m.user_id === user?.id);
        if (currentMember) {
          setFormPayerMemberId(currentMember.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (user && !loading) {
      fetchEntries();
    }
  }, [user, loading, fetchEntries]);

  const resetForm = () => {
    setFormType('expense');
    setFormTransferType('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime('');
    setFormCategoryId('');
    setFormMemo('');
    setFormShared(false);
    setFormAccountId('');
    setFormTransferFromAccountId('');
    setFormTransferToAccountId('');
    setFormError('');
    setEditingEntry(null);
    const currentMember = members.find(m => m.user_id === user?.id);
    if (currentMember) {
      setFormPayerMemberId(currentMember.id);
    }
  };

  const handleOpenForm = (entry?: Entry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormType(entry.type as 'expense' | 'income' | 'transfer');
      setFormTransferType(entry.transfer_type || '');
      setFormAmount(String(entry.amount));
      setFormDate(entry.date);
      if (entry.occurred_at) {
        const time = new Date(entry.occurred_at).toTimeString().slice(0, 5);
        setFormTime(time);
      } else {
        setFormTime('');
      }
      setFormCategoryId(entry.category_id || '');
      setFormMemo(entry.memo || '');
      setFormPayerMemberId(entry.payer_member_id);
      setFormShared(entry.shared);
      setFormAccountId(entry.account_id || '');
      setFormTransferFromAccountId(entry.transfer_from_account_id || '');
      setFormTransferToAccountId(entry.transfer_to_account_id || '');
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      // Validate transfer fields
      if (formType === 'transfer') {
        if (!formTransferFromAccountId || !formTransferToAccountId) {
          setFormError('이체의 경우 출금 계좌와 입금 계좌를 모두 선택해야 합니다.');
          setFormLoading(false);
          return;
        }
        if (formTransferFromAccountId === formTransferToAccountId) {
          setFormError('출금 계좌와 입금 계좌는 서로 달라야 합니다.');
          setFormLoading(false);
          return;
        }
      }

      // Build occurred_at if time is provided
      let occurred_at: string | undefined;
      if (formDate && formTime) {
        occurred_at = `${formDate}T${formTime}:00`;
      }

      const data: EntryCreateData = {
        type: formType,
        transfer_type: formType === 'transfer' && formTransferType ? formTransferType : undefined,
        amount: Number(formAmount),
        date: formDate,
        occurred_at,
        category_id: formCategoryId || undefined,
        memo: formMemo || undefined,
        payer_member_id: formPayerMemberId,
        shared: formShared,
        account_id: formAccountId || undefined,
        transfer_from_account_id: formType === 'transfer' ? formTransferFromAccountId : undefined,
        transfer_to_account_id: formType === 'transfer' ? formTransferToAccountId : undefined,
      };

      if (editingEntry) {
        await entriesAPI.update(editingEntry.id, data);
      } else {
        await entriesAPI.create(data);
      }

      await fetchEntries();
      setShowForm(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;

    try {
      await entriesAPI.delete(id);
      await fetchEntries();
    } catch (err) {
      alert('삭제에 실패했습니다');
    }
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page when filters change
  };

  const handleResetFilters = () => {
    setFilters(getInitialFilters());
    setPage(1);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredCategories = categories.filter(c =>
    formType === 'transfer' ? false : c.type === formType
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            &lt; 대시보드
          </Link>
          <h1 className="text-xl font-bold text-gray-900">거래 내역</h1>
          <button
            onClick={() => handleOpenForm()}
            className="btn btn-primary"
          >
            + 추가
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          categories={categories}
          accounts={accounts}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {/* Entry Summary */}
        {summary && <EntrySummary summary={summary} />}

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>총 {totalCount.toLocaleString()}건</span>
          {totalPages > 1 && (
            <span>{page} / {totalPages} 페이지</span>
          )}
        </div>

        {/* Entries List */}
        <EntryListView
          entries={entries}
          categories={categories}
          viewMode={viewMode}
          currentMonth={filters.month}
          onViewModeChange={setViewMode}
          onMonthChange={(month) => handleFilterChange({ month, datePreset: null, dateFrom: '', dateTo: '' })}
          onEditEntry={handleOpenForm}
          onDeleteEntry={handleDelete}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={!hasPrev}
              className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &lt;&lt;
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!hasPrev}
              className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &lt;
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={!hasNext}
              className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &gt;
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={!hasNext}
              className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &gt;&gt;
            </button>
          </div>
        )}
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingEntry ? '거래 수정' : '거래 추가'}
            </h2>

            {formError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormType('expense');
                    setFormCategoryId('');
                    setFormTransferType('');
                  }}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    formType === 'expense'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  지출
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormType('income');
                    setFormCategoryId('');
                    setFormTransferType('');
                  }}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    formType === 'income'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  수입
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormType('transfer');
                    setFormCategoryId('');
                    setFormShared(false);
                  }}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    formType === 'transfer'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  이체
                </button>
              </div>

              {/* Transfer Type Selection (only for transfer) */}
              {formType === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">이체 유형</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormTransferType('internal')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        formTransferType === 'internal'
                          ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      내부 이체
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTransferType('external_out')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        formTransferType === 'external_out'
                          ? 'bg-orange-100 text-orange-700 border-2 border-orange-500'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      외부 송금
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTransferType('external_in')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        formTransferType === 'external_in'
                          ? 'bg-teal-100 text-teal-700 border-2 border-teal-500'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      외부 입금
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formTransferType === 'internal' && '내 계좌 간 이동 (정산에서 제외)'}
                    {formTransferType === 'external_out' && '외부로 송금 (지출로 처리)'}
                    {formTransferType === 'external_in' && '외부에서 입금 (수입으로 처리)'}
                  </p>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700">금액</label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0"
                  className="input mt-1"
                  required
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">날짜</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="input mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">시간 (선택)</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="input mt-1"
                  />
                </div>
              </div>

              {/* Transfer Account Selection */}
              {formType === 'transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">출금 계좌</label>
                    <select
                      value={formTransferFromAccountId}
                      onChange={(e) => setFormTransferFromAccountId(e.target.value)}
                      className="input mt-1"
                      required
                    >
                      <option value="">선택하세요</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} {account.bank_name ? `(${account.bank_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">입금 계좌</label>
                    <select
                      value={formTransferToAccountId}
                      onChange={(e) => setFormTransferToAccountId(e.target.value)}
                      className="input mt-1"
                      required
                    >
                      <option value="">선택하세요</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} {account.bank_name ? `(${account.bank_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Account (for income/expense) */}
              {formType !== 'transfer' && accounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">계좌 (선택)</label>
                  <select
                    value={formAccountId}
                    onChange={(e) => setFormAccountId(e.target.value)}
                    className="input mt-1"
                  >
                    <option value="">선택 안함</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} {account.bank_name ? `(${account.bank_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category (only for income/expense) */}
              {formType !== 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">카테고리</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="input mt-1"
                  >
                    <option value="">선택 안함</option>
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Payer */}
              <div>
                <label className="block text-sm font-medium text-gray-700">결제자</label>
                <select
                  value={formPayerMemberId}
                  onChange={(e) => setFormPayerMemberId(e.target.value)}
                  className="input mt-1"
                  required
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.user_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shared (only for expense) */}
              {formType === 'expense' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="shared"
                    checked={formShared}
                    onChange={(e) => setFormShared(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="shared" className="text-sm text-gray-700">
                    공동 지출 (정산 대상)
                  </label>
                </div>
              )}

              {/* Memo */}
              <div>
                <label className="block text-sm font-medium text-gray-700">메모</label>
                <input
                  type="text"
                  value={formMemo}
                  onChange={(e) => setFormMemo(e.target.value)}
                  placeholder="메모 (선택)"
                  className="input mt-1"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="btn btn-secondary flex-1"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn btn-primary flex-1"
                >
                  {formLoading ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
