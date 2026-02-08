'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { entriesAPI, Entry, EntryListParams, EntrySummary } from '@/lib/api';

interface UseInfiniteEntriesParams {
  filters: EntryListParams;
  pageSize?: number;
  enabled?: boolean;
}

interface UseInfiniteEntriesResult {
  entries: Entry[];
  summary: EntrySummary | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  loadMore: () => void;
  reset: () => void;
  sentinelRef: (node: HTMLElement | null) => void;
}

export function useInfiniteEntries({
  filters,
  pageSize = 20,
  enabled = true,
}: UseInfiniteEntriesParams): UseInfiniteEntriesResult {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<EntrySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const pageRef = useRef(1);
  const isFetchingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const filtersRef = useRef(filters);
  const pageSizeRef = useRef(pageSize);

  // Update refs when props change
  filtersRef.current = filters;
  pageSizeRef.current = pageSize;

  // Serialize filters for comparison
  const filtersKey = JSON.stringify(filters);

  // Reset when filters change
  useEffect(() => {
    pageRef.current = 1;
    setEntries([]);
    setHasMore(true);
    setFetchTrigger((t) => t + 1);
  }, [filtersKey]);

  // Fetch entries when trigger changes
  useEffect(() => {
    if (!enabled) return;

    const fetchData = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      const isReset = pageRef.current === 1;

      try {
        if (isReset) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const params: EntryListParams = {
          ...filtersRef.current,
          page: pageRef.current,
          page_size: pageSizeRef.current,
        };

        const data = await entriesAPI.list(params);

        if (isReset) {
          setEntries(data.entries);
        } else {
          setEntries((prev) => [...prev, ...data.entries]);
        }

        setSummary(data.summary);
        setTotalCount(data.total_count);
        setHasMore(data.has_next);
      } catch (err) {
        console.error('Failed to fetch entries:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isFetchingRef.current = false;
      }
    };

    fetchData();
  }, [fetchTrigger, enabled]);

  // Load more
  const loadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore && !isFetchingRef.current) {
      pageRef.current += 1;
      setFetchTrigger((t) => t + 1);
    }
  }, [loadingMore, loading, hasMore]);

  // Reset function
  const reset = useCallback(() => {
    pageRef.current = 1;
    setEntries([]);
    setHasMore(true);
    setFetchTrigger((t) => t + 1);
  }, []);

  // Intersection Observer callback for sentinel element
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (node) {
        observerRef.current = new IntersectionObserver(
          (observerEntries) => {
            if (
              observerEntries[0].isIntersecting &&
              hasMore &&
              !loadingMore &&
              !loading &&
              !isFetchingRef.current
            ) {
              loadMore();
            }
          },
          {
            rootMargin: '200px',
          }
        );

        observerRef.current.observe(node);
      }
    },
    [hasMore, loadingMore, loading, loadMore]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    entries,
    summary,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    loadMore,
    reset,
    sentinelRef,
  };
}
