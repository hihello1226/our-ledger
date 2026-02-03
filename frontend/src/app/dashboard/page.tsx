'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { summaryAPI, householdAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Summary = {
  month: string;
  total_income: number;
  total_expense: number;
  balance: number;
  by_category: Array<{ category_id: string | null; category_name: string; total: number }>;
  by_member: Array<{
    member_id: string;
    member_name: string;
    total_expense: number;
    total_income: number;
    shared_expense: number;
  }>;
};

type Household = {
  id: string;
  name: string;
  invite_code: string;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, householdData] = await Promise.all([
          summaryAPI.get(month),
          householdAPI.get(),
        ]);
        setSummary(summaryData);
        setHousehold(householdData);
        if (!householdData) {
          router.push('/onboarding');
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
  }, [user, month, router]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{household?.name}</h1>
            <p className="text-sm text-gray-500">안녕하세요, {user?.name}님</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInviteCode(!showInviteCode)}
              className="text-sm text-blue-600 hover:underline"
            >
              초대코드
            </button>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              로그아웃
            </button>
          </div>
        </div>
        {showInviteCode && household && (
          <div className="max-w-4xl mx-auto px-4 pb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                초대 코드: <span className="font-mono font-bold">{household.invite_code}</span>
              </p>
            </div>
          </div>
        )}
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

        {/* Summary Cards */}
        {summary && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="text-sm text-gray-500">수입</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(summary.total_income)}
                </p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-gray-500">지출</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(summary.total_expense)}
                </p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-gray-500">잔액</p>
                <p className={`text-xl font-bold ${summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.balance)}
                </p>
              </div>
            </div>

            {/* By Category */}
            {summary.by_category.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">카테고리별 지출</h2>
                <div className="space-y-2">
                  {summary.by_category.map((cat, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-600">{cat.category_name}</span>
                      <span className="font-medium">{formatCurrency(cat.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By Member */}
            {summary.by_member.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">멤버별 현황</h2>
                <div className="space-y-3">
                  {summary.by_member.map((member) => (
                    <div key={member.member_id} className="border-b pb-2 last:border-0">
                      <p className="font-medium">{member.member_name}</p>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>지출: {formatCurrency(member.total_expense)}</span>
                        <span>공동: {formatCurrency(member.shared_expense)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/entries" className="card text-center hover:shadow-lg transition-shadow">
            <p className="text-lg font-semibold">거래 내역</p>
            <p className="text-sm text-gray-500">수입/지출 관리</p>
          </Link>
          <Link href="/settlement" className="card text-center hover:shadow-lg transition-shadow">
            <p className="text-lg font-semibold">정산</p>
            <p className="text-sm text-gray-500">공동 지출 정산</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
