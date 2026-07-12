import { useState, useEffect, useCallback, useRef } from 'react';
import { RequestState, ApiError, ApiResponse } from '../lib/api-client';

interface UseDataOptions<T, P> {
  params?: P;
  initialData?: T;
  autoFetch?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
}

/**
 * Generic hook for managing manual data fetching state.
 * @param fetcher A function that returns a Promise of the data
 * @param options Configuration for fetching
 */
export function useData<T, P = any>(
  fetcher: (params?: P) => Promise<ApiResponse<T> | T>,
  options: UseDataOptions<T, P> = {}
) {
  const { params, initialData = null, autoFetch = true, onSuccess, onError } = options;

  const [state, setState] = useState<RequestState<T>>({
    data: initialData,
    loading: autoFetch,
    error: null,
    isRefreshing: false,
  });

  const paramsRef = useRef(params);
  
  // Update ref when params change to avoid stale closures
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const execute = useCallback(async (isRefresh = false) => {
    setState(prev => ({ 
      ...prev, 
      loading: !isRefresh, 
      isRefreshing: isRefresh, 
      error: null 
    }));

    try {
      const response = await fetcher(paramsRef.current);
      // Handle both raw data and ApiResponse wrapped data
      const data = (response as ApiResponse<T>).data !== undefined 
        ? (response as ApiResponse<T>).data 
        : (response as T);

      setState({ data, loading: false, error: null, isRefreshing: false });
      onSuccess?.(data);
    } catch (err: any) {
      const apiError = err as ApiError;
      setState(prev => ({ ...prev, loading: false, error: apiError, isRefreshing: false }));
      onError?.(apiError);
    }
  }, [fetcher, onSuccess, onError]);

  useEffect(() => {
    if (autoFetch) {
      execute();
    }
  }, [autoFetch, execute]);

  const refetch = useCallback(() => execute(true), [execute]);

  return {
    ...state,
    refetch,
    setData: (data: T) => setState(prev => ({ ...prev, data })),
  };
}
