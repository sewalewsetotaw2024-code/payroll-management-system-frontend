import React from 'react';
import { Eye, Shield } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { GenerationStatus, PayslipPeriodInfo } from '../types/payslip.types';

interface PeriodListProps {
  periods: PayslipPeriodInfo[];
  selectedPeriodId: string | null;
  onSelect: (periodId: string) => void;
}

const StatusBadge: React.FC<{ status: GenerationStatus }> = ({ status }) => {
  const config: Record<GenerationStatus, { label: string; dotClass: string; bgClass: string; textClass: string; borderClass: string }> = {
    COMPLETED: {
      label: 'Authorized',
      dotClass: 'bg-emerald-500',
      bgClass: 'bg-brand-50',
      textClass: 'text-emerald-700',
      borderClass: 'border-emerald-100',
    },
    GENERATING: {
      label: 'Processing',
      dotClass: 'bg-amber-500',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      borderClass: 'border-amber-100',
    },
    NOT_READY: {
      label: 'Pending',
      dotClass: 'bg-slate-400',
      bgClass: 'bg-slate-50',
      textClass: 'text-slate-600',
      borderClass: 'border-slate-100',
    },
    FAILED: {
      label: 'Error',
      dotClass: 'bg-rose-500',
      bgClass: 'bg-rose-50',
      textClass: 'text-rose-600',
      borderClass: 'border-rose-100',
    },
  };

  const c = config[status] ?? config.NOT_READY;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm',
        c.bgClass,
        c.textClass,
        c.borderClass
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dotClass)} />
      {c.label}
    </span>
  );
};

const fmtDateRange = (start: string, end: string) => {
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  return `${new Date(start).toLocaleDateString('en-US', opts)} — ${new Date(end).toLocaleDateString('en-US', opts)}`;
};

export const PeriodList: React.FC<PeriodListProps> = ({
  periods,
  selectedPeriodId,
  onSelect,
}) => {
  if (periods.length === 0) {
    return (
      <div className="px-8 py-12 text-center">
        <p className="text-sm text-slate-400 font-medium italic">
          No records identified for this fiscal cycle.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-50/50">
            <th className="text-left px-8 py-4 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] border-b border-slate-100">
              Record Cycle
            </th>
            <th className="text-left px-8 py-4 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] border-b border-slate-100">
              Compliance Status
            </th>
            <th className="text-left px-8 py-4 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] border-b border-slate-100">
              Period Range
            </th>
            <th className="text-right px-8 py-4 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] border-b border-slate-100 w-[140px]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period, idx) => {
            const isClickable = period.generationStatus === 'COMPLETED';

            return (
              <tr
                key={period.id}
                className={cn(
                  'transition-all duration-200 border-b border-slate-50',
                  isClickable && 'cursor-pointer hover:bg-slate-50/80',
                  !isClickable && 'opacity-60 bg-slate-50/20',
                )}
                onClick={() => isClickable && onSelect(period.id)}
              >
                <td className="px-8 py-5 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm",
                      isClickable ? "bg-white border-slate-100 text-slate-600" : "bg-slate-50 border-slate-100 text-slate-300"
                    )}>
                      <Shield className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-slate-900 tracking-tight">
                      {period.name ?? period.cycle ?? '—'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5 border-b border-slate-50">
                  <StatusBadge status={period.generationStatus} />
                </td>
                <td className="px-8 py-5 border-b border-slate-50 text-[13px] text-slate-500 font-medium tabular-nums">
                  {fmtDateRange(period.startDate, period.endDate)}
                </td>
                <td className="px-8 py-5 text-right border-b border-slate-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      isClickable && onSelect(period.id);
                    }}
                    disabled={!isClickable}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl border transition-all active:scale-95 cursor-pointer',
                      isClickable
                        ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/10'
                        : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed',
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Open
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
