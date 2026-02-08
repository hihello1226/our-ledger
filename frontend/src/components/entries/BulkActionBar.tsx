'use client';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export default function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onCancel,
  isDeleting = false,
}: BulkActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 safe-area-bottom">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-900">
              {selectedCount}개 선택됨
            </span>
            {selectedCount < totalCount ? (
              <button
                onClick={onSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                전체 선택
              </button>
            ) : (
              <button
                onClick={onDeselectAll}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                선택 해제
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={onDelete}
              disabled={selectedCount === 0 || isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  삭제 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  삭제
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
