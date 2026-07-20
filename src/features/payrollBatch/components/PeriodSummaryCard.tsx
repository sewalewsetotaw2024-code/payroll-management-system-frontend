import React from 'react';
import { CalendarRange, ChevronDown, Users, Clock, User } from 'lucide-react';
import { GlassCard } from '../../../components/ui';

interface PeriodSummaryCardProps {
  periods: Array<{ id: string; name: string | null; startDate: string; endDate: string }>;
  selectedPeriodId: string | null;
  onPeriodChange: (id: string) => void;
  totalEmployees: number;
  batchCount: number;
  batchSize: number;
}

export const PeriodSummaryCard: React.FC<PeriodSummaryCardProps> = ({
  periods,
  selectedPeriodId,
  onPeriodChange,
  totalEmployees,
  batchCount,
  batchSize,
}) => {
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-500 to-brand-400" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-800">
            Period Summary
          </h3>
          {selectedPeriod && (
            <span className="text-sm text-slate-400 font-medium">
              — {selectedPeriod.name ?? `${formatDate(selectedPeriod.startDate)} — ${formatDate(selectedPeriod.endDate)}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedPeriodId ?? ''}
              onChange={(e) => onPeriodChange(e.target.value || '')}
              className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 cursor-pointer"
            >
              <option value="">Select Period</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? `${formatDate(p.startDate)} — ${formatDate(p.endDate)}`}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            {totalEmployees} employees · {batchCount} batches
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="text-center p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
            <CalendarRange className="w-3 h-3" /> Period Range
          </p>
          <p className="text-sm font-semibold text-slate-800">
            {selectedPeriod
              ? `${formatDate(selectedPeriod.startDate)} — ${formatDate(selectedPeriod.endDate)}`
              : '—'}
          </p>
        </div>
        <div className="text-center p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">FY</p>
          <p className="text-sm font-semibold text-slate-800">
            {selectedPeriod
              ? `FY ${new Date(selectedPeriod.startDate).getFullYear()}`
              : '—'}
          </p>
        </div>
        <div className="text-center p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Created
          </p>
          <p className="text-xs text-slate-500">—</p>
        </div>
        <div className="text-center p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
            <Users className="w-3 h-3" /> Batch Size
          </p>
          <p className="text-sm font-semibold text-slate-800">
            {batchSize} / batch
          </p>
        </div>
        <div className="text-center p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
            <User className="w-3 h-3" /> Created By
          </p>
          <p className="text-xs text-slate-500">—</p>
        </div>
      </div>
    </GlassCard>
  );
};
