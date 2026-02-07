'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { accountsAPI, householdAPI, Account, AccountCreateData } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState<AccountCreateData>({
    name: '',
    bank_name: '',
    type: 'personal',
    balance: undefined,
    is_shared_visible: false,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsData, householdData] = await Promise.all([
          accountsAPI.list(),
          householdAPI.get(),
        ]);
        setAccounts(accountsData);
        if (householdData) {
          setHouseholdId(householdData.id);
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        household_id: formData.type === 'shared' ? householdId || undefined : undefined,
      };

      if (editingAccount) {
        const updated = await accountsAPI.update(editingAccount.id, dataToSend);
        setAccounts(accounts.map(a => a.id === updated.id ? updated : a));
      } else {
        const created = await accountsAPI.create(dataToSend);
        setAccounts([created, ...accounts]);
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await accountsAPI.delete(id);
      setAccounts(accounts.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.');
    }
  };

  const openModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        bank_name: account.bank_name || '',
        type: account.type,
        balance: account.balance ?? undefined,
        is_shared_visible: account.is_shared_visible,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        bank_name: '',
        type: 'personal',
        balance: undefined,
        is_shared_visible: false,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    setFormData({
      name: '',
      bank_name: '',
      type: 'personal',
      balance: undefined,
      is_shared_visible: false,
    });
  };

  const isOwnAccount = (account: Account) => account.owner_user_id === user?.id;

  const handleAccountClick = (accountId: string) => {
    router.push(`/entries?account_ids=${accountId}`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const myAccounts = accounts.filter(a => a.owner_user_id === user?.id);
  const sharedAccounts = accounts.filter(a => a.owner_user_id !== user?.id && a.is_shared_visible);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              &larr; 뒤로
            </Link>
            <h1 className="text-xl font-bold text-gray-900">계좌 관리</h1>
          </div>
          <button
            onClick={() => openModal()}
            className="btn-primary"
          >
            + 계좌 추가
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* My Accounts */}
        <section>
          <h2 className="text-lg font-semibold mb-4">내 계좌</h2>
          {myAccounts.length === 0 ? (
            <div className="card text-center text-gray-500 py-8">
              등록된 계좌가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {myAccounts.map(account => (
                <div
                  key={account.id}
                  className="card cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleAccountClick(account.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{account.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          account.type === 'shared' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {account.type === 'shared' ? '공동' : '개인'}
                        </span>
                        {account.is_shared_visible && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                            공개
                          </span>
                        )}
                      </div>
                      {account.bank_name && (
                        <p className="text-sm text-gray-500">{account.bank_name}</p>
                      )}
                      <p className="text-lg font-bold mt-1">
                        {formatCurrency(account.balance)}
                      </p>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openModal(account)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shared Accounts from Others */}
        {sharedAccounts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">공유된 계좌</h2>
            <div className="space-y-3">
              {sharedAccounts.map(account => (
                <div
                  key={account.id}
                  className="card bg-gray-50 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleAccountClick(account.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{account.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          공동
                        </span>
                      </div>
                      {account.bank_name && (
                        <p className="text-sm text-gray-500">{account.bank_name}</p>
                      )}
                      <p className="text-sm text-gray-500">소유자: {account.owner_name}</p>
                      <p className="text-lg font-bold mt-1">
                        {formatCurrency(account.balance)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingAccount ? '계좌 수정' : '계좌 추가'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계좌 이름
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="국민은행 주거래"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  은행명 (선택)
                </label>
                <input
                  type="text"
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="input"
                  placeholder="국민은행"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계좌 유형
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({
                    ...formData,
                    type: e.target.value,
                    is_shared_visible: e.target.value === 'shared' ? true : formData.is_shared_visible,
                  })}
                  className="input"
                >
                  <option value="personal">개인</option>
                  <option value="shared">공동</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  잔액 (선택)
                </label>
                <input
                  type="number"
                  value={formData.balance ?? ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    balance: e.target.value ? parseInt(e.target.value) : undefined,
                  })}
                  className="input"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_shared_visible"
                  checked={formData.is_shared_visible}
                  onChange={(e) => setFormData({ ...formData, is_shared_visible: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="is_shared_visible" className="text-sm text-gray-700">
                  가구 구성원에게 공개
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  {editingAccount ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
