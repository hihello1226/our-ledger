'use client';

import { useState, useRef, useEffect } from 'react';

interface AmountFilterProps {
  amountMin: string;
  amountMax: string;
  onAmountMinChange: (value: string) => void;
  onAmountMaxChange: (value: string) => void;
}

export default function AmountFilter({
  amountMin,
  amountMax,
  onAmountMinChange,
  onAmountMaxChange,
}: AmountFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasFilter = amountMin || amountMax;

  const getButtonLabel = () => {
    if (!hasFilter) return '금액';

    const formatAmount = (val: string) => {
      const num = parseInt(val);
      if (num >= 10000) {
        return `${Math.floor(num / 10000)}만`;
      }
      return new Intl.NumberFormat('ko-KR').format(num);
    };

    if (amountMin && amountMax) {
      return `${formatAmount(amountMin)}~${formatAmount(amountMax)}`;
    }
    if (amountMin) {
      return `${formatAmount(amountMin)}~`;
    }
    return `~${formatAmount(amountMax)}`;
  };

  const presetRanges = [
    { label: '1만원 이하', min: '', max: '10000' },
    { label: '1~5만원', min: '10000', max: '50000' },
    { label: '5~10만원', min: '50000', max: '100000' },
    { label: '10만원 이상', min: '100000', max: '' },
  ];

  const handlePresetClick = (min: string, max: string) => {
    onAmountMinChange(min);
    onAmountMaxChange(max);
    setIsOpen(false);
  };

  const handleClear = () => {
    onAmountMinChange('');
    onAmountMaxChange('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
          hasFilter
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {getButtonLabel()}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-[220px]">
          {/* Preset Ranges */}
          <div className="px-3 pb-2 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              {presetRanges.map((range, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetClick(range.min, range.max)}
                  className="px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Range */}
          <div className="px-3 py-2">
            <div className="text-xs text-gray-500 mb-2">직접 입력</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amountMin}
                onChange={(e) => onAmountMinChange(e.target.value)}
                placeholder="최소"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-gray-400">~</span>
              <input
                type="number"
                value={amountMax}
                onChange={(e) => onAmountMaxChange(e.target.value)}
                placeholder="최대"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Clear Button */}
          {hasFilter && (
            <div className="px-3 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClear}
                className="w-full py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                초기화
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
