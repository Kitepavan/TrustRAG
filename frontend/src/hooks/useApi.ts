import { useState, useEffect, useRef, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
  });

  const fetcherRef = useRef(fetcher);
  const requestId = useRef(0);

  // Keep the ref in sync without mutating during render
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    const id = ++requestId.current;
    if (options?.silent) {
      setState((prev) => ({ ...prev, refreshing: true, error: null }));
    } else {
      setState({ data: null, loading: true, refreshing: false, error: null });
    }
    try {
      const data = await fetcherRef.current();
      if (id !== requestId.current) return;
      setState({ data, loading: false, refreshing: false, error: null });
    } catch (err) {
      if (id !== requestId.current) return;
      setState(prev => ({
        data: options?.silent ? prev.data : null,
        loading: false,
        refreshing: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  useEffect(() => {
    void refetch();
    return () => { requestId.current += 1; };
    // deps intentionally drives when the fetch runs; refetch is stable via useCallback
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, refetch };
}
