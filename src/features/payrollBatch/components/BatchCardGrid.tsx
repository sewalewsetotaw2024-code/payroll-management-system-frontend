import React from 'react';
import { Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { GlassCard } from '../../../components/ui';
import { BatchCard } from './BatchCard';
import type { PayrollBatch } from '../types';

interface BatchCardGridProps {
  batches: PayrollBatch[];
  totalItems: number;
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  onBatchRenamed?: (id: string, name: string) => void;
  onStatusChanged?: (id: string, status: PayrollBatch['status']) => void;
}

export const BatchCardGrid: React.FC<BatchCardGridProps> = ({
  batches,
  totalItems,
  totalPages,
  page,
  onPageChange,
  loading,
  onBatchRenamed,
  onStatusChanged,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/60 backdrop-blur-lg border border-slate-200 rounded-xl p-5 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
            <div className="flex gap-1.5 mt-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="w-6 h-6 rounded-md bg-slate-200" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
          <Layers className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-base font-bold text-slate-700">No batches yet</p>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">
          Use the generator above to create batches for this period
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          Batch Groups
          <span className="text-sm font-medium text-slate-400 bg-white/60 backdrop-blur-sm border border-slate-200 px-2 py-0.5 rounded-md">
            {totalItems}
          </span>
        </h3>
        <p className="text-[11px] text-slate-400 font-medium">
          Sorted by name
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map((batch) => (
          <BatchCard key={batch.id} batch={batch} onRenamed={onBatchRenamed} onStatusChanged={onStatusChanged} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="px-1 text-slate-300 text-xs">...</span>
                )}
                <button
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    p === page
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                      : 'text-slate-500 hover:bg-white/60 hover:border-slate-200 border border-transparent',
                  )}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}

      {!loading && totalPages > 0 && (
        <p className="text-[11px] text-slate-400 text-center">
          Showing {batches.length} of {totalItems} batch{totalItems !== 1 ? 'es' : ''}
        </p>
      )}
    </div>
  );
};
