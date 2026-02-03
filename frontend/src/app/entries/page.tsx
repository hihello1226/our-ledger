'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { entriesAPI, householdAPI, accountsAPI, Entry, Account, EntryCreateData } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Category = {
  id: string;
  name: string;
  type: string;
};

type Member = {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
};

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Form state
  const [formType, setFormType] = useState<'expense' | 'income' | 'transfer'>('expense');
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

  const fetchEntries = async () => {
    try {
      const data = await entriesAPI.list({ month });
      setEntries(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [entriesData, categoriesData, membersData, accountsData] = await Promise.all([
          entriesAPI.list({ month }),
          entriesAPI.getCategories(),
          householdAPI.getMembers(),
          accountsAPI.list(),
        ]);
        setEntries(entriesData);
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
  }, [user, month]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const resetForm = () => {
    setFormType('expense');
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

  const handlePrevMonth = () => {
    const [year, mon] = month.split('-').map(Number);
    const date = new Date(year, mon - 2, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, mon] = month.split('-').map(Number);
    const date = new Date(year, mon, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const getEntryTypeLabel = (type: string) => {
    switch (type) {
      case 'expense': return '지출';
      case 'income': return '수입';
      case 'transfer': return '이체';
      default: return type;
    }
  };

  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case 'expense': return 'bg-red-100 text-red-700';
      case 'income': return 'bg-green-100 text-green-700';
      case 'transfer': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
        {/* Month Selector */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-200 rounded">
            &lt;
          </button>
          <span className="text-lg font-semibold">{month}</span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-gray-200 rounded">
            &gt;
          </button>
        </div>

        {/* Entries List */}
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="card text-center text-gray-500">
              이번 달 거래 내역이 없습니다
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="card flex items-center justify-between cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleOpenForm(entry)}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm px-2 py-0.5 rounded ${getEntryTypeColor(entry.type)}`}>
                      {getEntryTypeLabel(entry.type)}
                    </span>
                    {entry.shared && (
                      <span className="text-sm px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        공동
                      </span>
                    )}
                    {entry.type !== 'transfer' && (
                      <span className="text-sm text-gray-500">{entry.category_name || '미분류'}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {entry.date} · {entry.payer_name}
                    {entry.account_name && ` · ${entry.account_name}`}
                    {entry.type === 'transfer' && entry.transfer_from_account_name && entry.transfer_to_account_name && (
                      <span className="text-purple-600">
                        {' '}({entry.transfer_from_account_name} → {entry.transfer_to_account_name})
                      </span>
                    )}
                    {entry.memo && ` · ${entry.memo}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${
                    entry.type === 'expense' ? 'text-red-600' :
                    entry.type === 'income' ? 'text-green-600' :
                    'text-purple-600'
                  }`}>
                    {entry.type === 'expense' ? '-' : entry.type === 'income' ? '+' : ''}{formatCurrency(entry.amount)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entry.id);
                    }}
                    className="text-gray-400 hover:text-red-600"
                  >
                    x
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
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
