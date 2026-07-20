import React from 'react';
import { Layers } from 'lucide-react';
import { GlassCard } from '../../../components/ui';
import { BatchCard } from './BatchCard';
import type { PayrollBatch } from '../types';

interface BatchCardGridProps {
  batches: PayrollBatch[];
  loading: boolean;
  onBatchClick: (batch: PayrollBatch) => void;
  onBatchRenamed?: (id: string, name: string) => void;
  onStatusChanged?: (id: string, status: PayrollBatch['status']) => void;
  onBatchDeleted?: (id: string) => void;
}

export const BatchCardGrid: React.FC<BatchCardGridProps> = ({
  batches,
  loading,
  onBatchClick,
  onBatchRenamed,
  onStatusChanged,
  onBatchDeleted,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-slate-200" />
              <div className="h-4 bg-slate-200 rounded w-1/3" />
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-12" />
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="w-6 h-6 rounded-md bg-slate-200" />
              ))}
            </div>
            <div className="h-8 bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
          <Layers className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-base font-bold text-slate-700">No Batches Generated Yet</p>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">
          Use the "Generate Batches" button above to create employee batches for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {batches.map((batch) => (
        <BatchCard
          key={batch.id}
          batch={batch}
          onClick={() => onBatchClick(batch)}
          onRenamed={onBatchRenamed}
          onStatusChanged={onStatusChanged}
          onDeleted={onBatchDeleted}
        />
      ))}
    </div>
  );
};
