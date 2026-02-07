'use client';

import { EntrySummary as EntrySummaryType } from '@/lib/api';

interface EntrySummaryProps {
  summary: EntrySummaryType;
}

export default function EntrySummary({ summary }: EntrySummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.abs(amount));
  };

  // 총 입금 = 수입 + 외부 입금
  const totalIn = summary.total_income + summary.total_transfer_in;
  // 총 출금 = 지출 + 외부 송금
  const totalOut = summary.total_expense + summary.total_transfer_out;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="grid grid-cols-3 gap-4 text-center">
        {/* 입금 */}
        <div>
          <div className="text-sm text-gray-500 mb-1">입금</div>
          <div className="text-lg font-semibold text-green-600">
            {formatCurrency(totalIn)}
          </div>
        </div>

        {/* 출금 */}
        <div>
          <div className="text-sm text-gray-500 mb-1">출금</div>
          <div className="text-lg font-semibold text-red-600">
            {formatCurrency(totalOut)}
          </div>
        </div>

        {/* 합계 */}
        <div>
          <div className="text-sm text-gray-500 mb-1">합계</div>
          <div className={`text-lg font-semibold ${
            summary.net_balance >= 0 ? 'text-blue-600' : 'text-red-600'
          }`}>
            {summary.net_balance >= 0 ? '+' : '-'}{formatCurrency(summary.net_balance)}
          </div>
        </div>
      </div>
    </div>
  );
}
