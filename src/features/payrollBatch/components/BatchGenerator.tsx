import React, { useState } from 'react';
import { RefreshCw, AlertCircle, Package } from 'lucide-react';
import { GlassCard } from '../../../components/ui';

interface BatchGeneratorProps {
  payrollPeriodId: string;
  onGenerate: (periodId: string, batchSize: number) => Promise<any>;
  generating: boolean;
  disabled?: boolean;
}

export const BatchGenerator: React.FC<BatchGeneratorProps> = ({
  payrollPeriodId,
  onGenerate,
  generating,
  disabled,
}) => {
  const [batchSize, setBatchSize] = useState<number>(50);

  const handleGenerate = async () => {
    if (batchSize < 1) return;
    await onGenerate(payrollPeriodId, batchSize);
  };

  return (
    <GlassCard className="relative overflow-hidden">
      {/* Subtle top accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-500 to-brand-400" />

      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-500/20">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Generate Batches</h3>
          <p className="text-xs text-slate-400 font-medium">
            Auto-distribute active employees alphabetically into batches
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        {/* Manual number input */}
        <div className="flex-1">
          <label
            htmlFor="batchSize"
            className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
          >
            Employees per batch
          </label>
          <input
            id="batchSize"
            type="number"
            min={1}
            max={500}
            value={batchSize}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1) setBatchSize(val);
            }}
            className="w-full rounded-lg bg-white/60 backdrop-blur-sm border border-slate-200 px-3 py-2.5 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-shadow hover:shadow-sm"
            placeholder="e.g. 50"
            disabled={generating || disabled}
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Total employees will be split into groups of this size
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || disabled || batchSize < 1}
          className="relative px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-lg shadow-brand-600/20 overflow-hidden group cursor-pointer"
        >
          {/* Shine effect on hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          {generating ? (
            <span className="relative flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating…
            </span>
          ) : (
            <span className="relative flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Generate
            </span>
          )}
        </button>
      </div>

      {disabled && (
        <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50/80 backdrop-blur-sm border border-amber-200/80 px-3 py-2.5 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Select a payroll period first
        </div>
      )}
    </GlassCard>
  );
};
