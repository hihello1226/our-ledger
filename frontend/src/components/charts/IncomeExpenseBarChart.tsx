'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';

interface IncomeExpenseBarChartProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export default function IncomeExpenseBarChart({
  totalIncome,
  totalExpense,
  balance,
}: IncomeExpenseBarChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatCompact = (amount: number) => {
    if (amount >= 10000) {
      return `${Math.floor(amount / 10000).toLocaleString()}만`;
    }
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const chartData = [
    { name: '수입', value: totalIncome, color: '#22C55E' },
    { name: '지출', value: totalExpense, color: '#EF4444' },
  ];

  const maxValue = Math.max(totalIncome, totalExpense);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{item.name}</p>
          <p style={{ color: item.payload.color }} className="font-bold">
            {formatCurrency(item.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (totalIncome === 0 && totalExpense === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">수입/지출 비교</h3>
        <div className="h-48 flex items-center justify-center text-gray-400">
          데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">수입/지출 비교</h3>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis type="number" hide domain={[0, maxValue * 1.1]} />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Balance display */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">잔액</span>
          <span
            className={`text-lg font-bold ${
              balance >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}
          >
            {balance >= 0 ? '+' : ''}
            {formatCompact(balance)}원
          </span>
        </div>
      </div>
    </div>
  );
}
