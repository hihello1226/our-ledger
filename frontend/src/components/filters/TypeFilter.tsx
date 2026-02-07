'use client';

import { useState, useRef, useEffect } from 'react';

export type EntryType = 'expense' | 'income' | 'transfer';
export type TransferType = 'internal' | 'external_out' | 'external_in' | null;

interface TypeFilterProps {
  selectedTypes: EntryType[];
  selectedTransferType: TransferType;
  onTypesChange: (types: EntryType[]) => void;
  onTransferTypeChange: (transferType: TransferType) => void;
}

export default function TypeFilter({
  selectedTypes,
  selectedTransferType,
  onTypesChange,
  onTransferTypeChange,
}: TypeFilterProps) {
  const [showTransferMenu, setShowTransferMenu] = useState(false);
  const transferMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (transferMenuRef.current && !transferMenuRef.current.contains(event.target as Node)) {
        setShowTransferMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTypeClick = (type: EntryType) => {
    if (type === 'transfer') {
      setShowTransferMenu(!showTransferMenu);
      return;
    }

    // Toggle type selection
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const handleTransferTypeClick = (transferType: TransferType) => {
    // Toggle transfer in selectedTypes
    if (!selectedTypes.includes('transfer')) {
      onTypesChange([...selectedTypes, 'transfer']);
    }
    onTransferTypeChange(transferType === selectedTransferType ? null : transferType);
    setShowTransferMenu(false);
  };

  const handleTransferToggle = () => {
    if (selectedTypes.includes('transfer')) {
      onTypesChange(selectedTypes.filter((t) => t !== 'transfer'));
      onTransferTypeChange(null);
    } else {
      onTypesChange([...selectedTypes, 'transfer']);
    }
    setShowTransferMenu(false);
  };

  const getTransferLabel = () => {
    if (selectedTypes.includes('transfer') && selectedTransferType) {
      switch (selectedTransferType) {
        case 'internal':
          return '내부 이체';
        case 'external_out':
          return '외부 송금';
        case 'external_in':
          return '외부 입금';
      }
    }
    return '이체';
  };

  const isTypeSelected = (type: EntryType) => selectedTypes.includes(type);

  return (
    <div className="flex gap-2 relative">
      {/* Income Button */}
      <button
        type="button"
        onClick={() => handleTypeClick('income')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          isTypeSelected('income')
            ? 'bg-green-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        수입
      </button>

      {/* Expense Button */}
      <button
        type="button"
        onClick={() => handleTypeClick('expense')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          isTypeSelected('expense')
            ? 'bg-red-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        지출
      </button>

      {/* Transfer Button with Submenu */}
      <div className="relative" ref={transferMenuRef}>
        <button
          type="button"
          onClick={() => handleTypeClick('transfer')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
            isTypeSelected('transfer')
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {getTransferLabel()}
          <svg
            className={`w-4 h-4 transition-transform ${showTransferMenu ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Transfer Type Submenu */}
        {showTransferMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[140px]">
            <button
              type="button"
              onClick={handleTransferToggle}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                isTypeSelected('transfer') && !selectedTransferType ? 'bg-purple-50 text-purple-700' : ''
              }`}
            >
              {isTypeSelected('transfer') ? '이체 해제' : '전체 이체'}
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              type="button"
              onClick={() => handleTransferTypeClick('internal')}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                selectedTransferType === 'internal' ? 'bg-purple-50 text-purple-700' : ''
              }`}
            >
              내부 이체
            </button>
            <button
              type="button"
              onClick={() => handleTransferTypeClick('external_out')}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                selectedTransferType === 'external_out' ? 'bg-purple-50 text-purple-700' : ''
              }`}
            >
              외부 송금
            </button>
            <button
              type="button"
              onClick={() => handleTransferTypeClick('external_in')}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                selectedTransferType === 'external_in' ? 'bg-purple-50 text-purple-700' : ''
              }`}
            >
              외부 입금
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
