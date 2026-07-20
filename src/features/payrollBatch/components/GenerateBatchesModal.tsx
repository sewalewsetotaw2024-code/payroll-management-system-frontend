import React, { useState } from 'react';
import { RefreshCw, Info } from 'lucide-react';
import { Modal } from '../../../components/ui';
import type { PeriodOption } from '../types';

interface GenerateBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: PeriodOption[];
  selectedPeriodId: string | null;
  onPeriodChange: (id: string) => void;
  onGenerate: (periodId: string, batchSize: number) => Promise<any>;
  generating: boolean;
}

export const GenerateBatchesModal: React.FC<GenerateBatchesModalProps> = ({
  isOpen,
  onClose,
  periods,
  selectedPeriodId,
  onPeriodChange,
  onGenerate,
  generating,
}) => {
  const [batchSize, setBatchSize] = useState<number>(50);
  const [namingPrefix, setNamingPrefix] = useState('Batch');

  const handleGenerate = async () => {
    if (!selectedPeriodId || batchSize < 1) return;
    await onGenerate(selectedPeriodId, batchSize);
    if (!generating) onClose();
  };

  const footer = (
    <>
      <button
        onClick={onClose}
        disabled={generating}
        className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onClick={handleGenerate}
        disabled={generating || !selectedPeriodId || batchSize < 1}
        className="px-5 py-2.5 text-sm font-bold text-white bg-primary rounded-lg hover:bg-brand-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/20"
      >
        {generating ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Generate
          </>
        )}
      </button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Payroll Batches" size="lg" footer={footer}>
      <div className="space-y-5">
        {/* Period */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Period <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedPeriodId ?? ''}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
          >
            <option value="">— Select Period —</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name ?? `${new Date(p.startDate).toLocaleDateString()} — ${new Date(p.endDate).toLocaleDateString()}`}
              </option>
            ))}
          </select>
        </div>

        {/* Employees Per Batch */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Employees Per Batch
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={500}
              value={batchSize}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) setBatchSize(val);
              }}
              className="w-28 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            />
            <span className="text-sm text-slate-500">employees per batch</span>
          </div>
        </div>

        {/* Naming */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Batch Naming <span className="text-slate-400 font-normal">(optional — defaults to "Batch A", "Batch B", etc.)</span>
          </label>
          <input
            type="text"
            value={namingPrefix}
            onChange={(e) => setNamingPrefix(e.target.value)}
            placeholder="e.g. Batch"
            className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
          />
        </div>

        {/* Info hint */}
        <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <span>Employees will be evenly distributed across batches alphabetically by default.</span>
        </div>

      </div>
    </Modal>
  );
};
