import { useState, useCallback } from 'react';
import { useData } from '../../../hooks/use-data';
import { listBatchEmployees } from '../api';
import type { PayrollBatchEmployeeItem } from '../types';

export function useBatchEmployees(batchId: string | null) {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');

  const fetcher = useCallback(async () => {
    if (!batchId) return { items: [] as PayrollBatchEmployeeItem[], totalItems: 0, totalPages: 0 };
    console.log('[useBatchEmployees] fetching employees for batchId:', batchId, 'page:', page, 'search:', search);
    return listBatchEmployees({ batchId, page, limit, search: search || undefined });
  }, [batchId, page, limit, search]);

  const { data, loading, error, refetch } = useData(fetcher, {
    autoFetch: !!batchId,
  });

  return {
    employees: data?.items ?? [],
    totalItems: data?.totalItems ?? 0,
    totalPages: data?.totalPages ?? 0,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch,
    refetch,
  };
}
