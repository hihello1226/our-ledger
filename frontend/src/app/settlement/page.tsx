'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { settlementAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Settlement = {
  month: string;
  total_shared_expense: number;
  settlements: Array<{
    from_member_id: string;
    from_member_name: string;
    to_member_id: string;
    to_member_name: string;
    amount: number;
  }>;
};

export default function SettlementPage() {
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await settlementAPI.get(month);
        setSettlement(data);
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
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            &lt; 대시보드
          </Link>
          <h1 className="text-xl font-bold text-gray-900">정산</h1>
          <div className="w-16"></div>
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

        {settlement && (
          <>
            {/* Total Shared Expense */}
            <div className="card text-center">
              <p className="text-sm text-gray-500">총 공동 지출</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(settlement.total_shared_expense)}
              </p>
            </div>

            {/* Settlements */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">정산 내역</h2>
              {settlement.settlements.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  정산할 내역이 없습니다
                </p>
              ) : (
                <div className="space-y-4">
                  {settlement.settlements.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-red-600">
                          {item.from_member_name}
                        </span>
                        <span className="text-gray-400">-&gt;</span>
                        <span className="font-medium text-green-600">
                          {item.to_member_name}
                        </span>
                      </div>
                      <span className="text-lg font-bold">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-sm text-gray-500 text-center">
              * 공동 지출로 표시된 거래만 정산에 포함됩니다
            </div>
          </>
        )}
      </main>
    </div>
  );
}
