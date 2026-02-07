'use client';

interface EntryGroupHeaderProps {
  title: string;
  subtitle?: string;
  totalIncome: number;
  totalExpense: number;
}

export default function EntryGroupHeader({
  title,
  subtitle,
  totalIncome,
  totalExpense,
}: EntryGroupHeaderProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.abs(amount));
  };

  const netAmount = totalIncome - totalExpense;

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-gray-100 sticky top-0 z-10 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-gray-900">{title}</span>
        {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
      </div>
      <div className="flex items-center gap-2 text-xs">
        {totalIncome > 0 && (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
            수입 +{formatCurrency(totalIncome)}
          </span>
        )}
        {totalExpense > 0 && (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
            지출 -{formatCurrency(totalExpense)}
          </span>
        )}
        <span className={`px-2 py-1 rounded-full font-bold ${
          netAmount >= 0
            ? 'bg-blue-100 text-blue-700'
            : 'bg-orange-100 text-orange-700'
        }`}>
          {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}
        </span>
      </div>
    </div>
  );
}
