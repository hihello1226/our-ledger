'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CATEGORY_COLORS } from '@/lib/categoryStyles';

interface CategoryData {
  category_id: string | null;
  category_name: string;
  total: number;
}

interface CategoryDonutChartProps {
  data: CategoryData[];
  totalExpense: number;
}

export default function CategoryDonutChart({ data, totalExpense }: CategoryDonutChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const chartData = data.map((item) => ({
    name: item.category_name,
    value: item.total,
    color: CATEGORY_COLORS[item.category_name] || '#9CA3AF',
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{item.name}</p>
          <p className="text-gray-600">{formatCurrency(item.value)}</p>
          <p className="text-sm text-gray-400">
            {((item.value / totalExpense) * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">카테고리별 지출</h3>
        <div className="h-48 flex items-center justify-center text-gray-400">
          지출 데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">카테고리별 지출</h3>
      <div className="h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center total */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-xs text-gray-500">총 지출</p>
            <p className="text-sm font-bold text-gray-900">
              {totalExpense >= 10000
                ? `${Math.floor(totalExpense / 10000).toLocaleString()}만`
                : formatCurrency(totalExpense)}
            </p>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {chartData.slice(0, 5).map((item, index) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-600">{item.name}</span>
          </div>
        ))}
        {chartData.length > 5 && (
          <span className="text-xs text-gray-400">+{chartData.length - 5}개</span>
        )}
      </div>
    </div>
  );
}
