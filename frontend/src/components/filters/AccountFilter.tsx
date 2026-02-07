'use client';

import { useState, useRef, useEffect } from 'react';

interface Account {
  id: string;
  name: string;
  bank_name: string | null;
}

interface AccountFilterProps {
  accounts: Account[];
  selectedAccountIds: string[];
  onAccountChange: (accountIds: string[]) => void;
}

export default function AccountFilter({
  accounts,
  selectedAccountIds,
  onAccountChange,
}: AccountFilterProps) {
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

  const handleToggleAccount = (accountId: string) => {
    if (selectedAccountIds.includes(accountId)) {
      onAccountChange(selectedAccountIds.filter((id) => id !== accountId));
    } else {
      onAccountChange([...selectedAccountIds, accountId]);
    }
  };

  const handleSelectAll = () => {
    onAccountChange([]);
  };

  const getButtonLabel = () => {
    if (selectedAccountIds.length === 0) {
      return '전체';
    }
    if (selectedAccountIds.length === 1) {
      const account = accounts.find((a) => a.id === selectedAccountIds[0]);
      return account?.name || '1개 선택';
    }
    return `${selectedAccountIds.length}개 선택`;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
          selectedAccountIds.length > 0
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        계좌: {getButtonLabel()}
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
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-[200px] max-h-[300px] overflow-y-auto">
          <button
            type="button"
            onClick={handleSelectAll}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
              selectedAccountIds.length === 0 ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            전체
          </button>

          <div className="border-t border-gray-200 my-1" />

          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => handleToggleAccount(account.id)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                selectedAccountIds.includes(account.id) ? 'bg-blue-50 text-blue-700' : ''
              }`}
            >
              <span
                className={`w-4 h-4 rounded border flex items-center justify-center ${
                  selectedAccountIds.includes(account.id)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300'
                }`}
              >
                {selectedAccountIds.includes(account.id) && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
              <span>
                {account.name}
                {account.bank_name && (
                  <span className="text-gray-500 text-xs ml-1">({account.bank_name})</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
