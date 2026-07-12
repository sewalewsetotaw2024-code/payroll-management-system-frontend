import { useState, useCallback } from 'react';
import { useData } from '../../../hooks/use-data';
import { listBatchesByPeriod, generateBatches } from '../api';
import type { PayrollBatch, GenerateBatchesResponse } from '../types';

export function usePayrollBatches(payrollPeriodId: string | null) {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const fetcher = useCallback(async () => {
    if (!payrollPeriodId) return { batches: [], totalItems: 0, totalPages: 0 };
    return listBatchesByPeriod({ payrollPeriodId, page, limit });
  }, [payrollPeriodId, page, limit]);

  const { data, loading, error, refetch } = useData(fetcher, {
    autoFetch: true,
  });

  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateBatchesResponse | null>(null);

  const handleGenerate = useCallback(async (periodId: string, batchSize = 50) => {
    setGenerating(true);
    try {
      const result = await generateBatches({ payrollPeriodId: periodId, batchSize });
      setGenerateResult(result);
      await refetch();
      return result;
    } finally {
      setGenerating(false);
    }
  }, [refetch]);

  return {
    batches: data?.batches ?? [],
    totalItems: data?.totalItems ?? 0,
    totalPages: data?.totalPages ?? 0,
    loading,
    error,
    page,
    setPage,
    generating,
    generateResult,
    generate: handleGenerate,
    refetch,
  };
}
