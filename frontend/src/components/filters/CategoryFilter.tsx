'use client';

import { useState, useRef, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onCategoryChange: (categoryIds: string[]) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategoryIds,
  onCategoryChange,
}: CategoryFilterProps) {
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

  const handleToggleCategory = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onCategoryChange(selectedCategoryIds.filter((id) => id !== categoryId));
    } else {
      onCategoryChange([...selectedCategoryIds, categoryId]);
    }
  };

  const handleSelectAll = () => {
    onCategoryChange([]);
  };

  const getButtonLabel = () => {
    if (selectedCategoryIds.length === 0) {
      return '전체';
    }
    if (selectedCategoryIds.length === 1) {
      if (selectedCategoryIds[0] === 'uncategorized') {
        return '미분류';
      }
      const category = categories.find((c) => c.id === selectedCategoryIds[0]);
      return category?.name || '1개 선택';
    }
    return `${selectedCategoryIds.length}개 선택`;
  };

  // Group categories by type
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
          selectedCategoryIds.length > 0
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        카테고리: {getButtonLabel()}
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
              selectedCategoryIds.length === 0 ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            전체
          </button>

          <div className="border-t border-gray-200 my-1" />

          {/* 미분류 옵션 */}
          <button
            type="button"
            onClick={() => handleToggleCategory('uncategorized')}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
              selectedCategoryIds.includes('uncategorized') ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center ${
                selectedCategoryIds.includes('uncategorized')
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300'
              }`}
            >
              {selectedCategoryIds.includes('uncategorized') && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
            <span className="text-gray-500">미분류</span>
          </button>

          <div className="border-t border-gray-200 my-1" />

          {expenseCategories.length > 0 && (
            <>
              <div className="px-4 py-1 text-xs text-gray-500 font-medium">지출</div>
              {expenseCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleToggleCategory(category.id)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                    selectedCategoryIds.includes(category.id) ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedCategoryIds.includes(category.id)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedCategoryIds.includes(category.id) && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </span>
                  {category.name}
                </button>
              ))}
            </>
          )}

          {incomeCategories.length > 0 && (
            <>
              <div className="border-t border-gray-200 my-1" />
              <div className="px-4 py-1 text-xs text-gray-500 font-medium">수입</div>
              {incomeCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleToggleCategory(category.id)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                    selectedCategoryIds.includes(category.id) ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedCategoryIds.includes(category.id)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedCategoryIds.includes(category.id) && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </span>
                  {category.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
