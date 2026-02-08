import { useState, useCallback } from 'react';

export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        // 선택 모드 종료 시 선택 해제
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    isSelectionMode,
    toggleSelection,
    selectAll,
    deselectAll,
    toggleSelectionMode,
    exitSelectionMode,
    selectedCount: selectedIds.size,
  };
}
