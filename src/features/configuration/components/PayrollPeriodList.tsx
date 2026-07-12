import React from 'react';
import {
  CalendarDays, CheckCircle2, Lock, Clock, ChevronRight, Plus, AlertTriangle,
} from 'lucide-react';
import type { PayrollPeriod } from '../types/configuration.types';

interface PayrollPeriodListProps {
  periods: PayrollPeriod[];
  onSelect: (period: PayrollPeriod) => void;
  onCreateNew: () => void;
  saving: boolean;
  fiscalYearName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: 'Open',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  DRAFT: {
    label: 'Draft',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  DONE: {
    label: 'Closed',
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: <Lock className="w-3.5 h-3.5" />,
  },
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const PayrollPeriodList: React.FC<PayrollPeriodListProps> = ({
  periods,
  onSelect,
  onCreateNew,
  saving,
  fiscalYearName,
}) => {
  const sorted = [...periods].sort((a, b) => {
    // ACTIVE first, then DRAFT, then DONE, then by startDate desc within each group
    const order: Record<string, number> = { ACTIVE: 0, DRAFT: 1, DONE: 2 };
    const ao = order[a.status ?? 'DONE'] ?? 3;
    const bo = order[b.status ?? 'DONE'] ?? 3;
    if (ao !== bo) return ao - bo;
    return new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime();
  });

  const activePeriod = sorted.find((p) => p.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-900">
            Payroll Periods
            {fiscalYearName && (
              <span className="ml-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                · {fiscalYearName}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {periods.length} / 12 periods used this fiscal year
          </p>
        </div>
        <button
          id="btn-create-payroll-period"
          onClick={onCreateNew}
          disabled={saving || periods.length >= 12}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all duration-150 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Period
        </button>
      </div>

      {/* Capacity warning */}
      {periods.length >= 10 && periods.length < 12 && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>You are approaching the 12-period limit for this fiscal year ({12 - periods.length} remaining).</span>
        </div>
      )}
      {periods.length >= 12 && (
        <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-700 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Maximum of 12 payroll periods per fiscal year reached. Close or delete existing periods to create new ones.</span>
        </div>
      )}

      {/* Active period hero */}
      {activePeriod && (
        <button
          id={`period-card-active-${activePeriod.id}`}
          onClick={() => onSelect(activePeriod)}
          className="w-full text-left bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-[1.5rem] p-6 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden hover:shadow-2xl transition-all duration-200 group"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08)_0%,transparent_60%)]" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Active Period</span>
                <p className="text-sm font-bold text-white">{activePeriod.name || 'Unnamed Period'}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-300 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="relative grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Start Date</p>
              <p className="text-sm font-bold mt-0.5">{formatDate(activePeriod.startDate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">End Date</p>
              <p className="text-sm font-bold mt-0.5">{formatDate(activePeriod.endDate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Payment Date</p>
              <p className="text-sm font-bold mt-0.5">{formatDate(activePeriod.dateOfPayment)}</p>
            </div>
          </div>
        </button>
      )}

      {/* Period list */}
      {sorted.filter((p) => p.status !== 'ACTIVE').length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">All Periods</p>
          {sorted
            .filter((p) => p.status !== 'ACTIVE')
            .map((period) => {
              const statusCfg = STATUS_CONFIG[period.status ?? 'DONE'] ?? STATUS_CONFIG.DONE;
              return (
                <button
                  key={period.id}
                  id={`period-card-${period.id}`}
                  onClick={() => onSelect(period)}
                  className="w-full text-left bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md rounded-[1.25rem] px-5 py-4 flex items-center gap-4 transition-all duration-150 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{period.name || 'Unnamed Period'}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDate(period.startDate)} — {formatDate(period.endDate)}
                      {period.dateOfPayment && (
                        <span className="ml-2 text-slate-400"> · Pay: {formatDate(period.dateOfPayment)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold text-slate-400 capitalize">
                      {period.cycle?.toLowerCase() ?? ''}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              );
            })}
        </div>
      )}

      {periods.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <CalendarDays className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">No payroll periods yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Create your first payroll period for this fiscal year to get started.
          </p>
        </div>
      )}
    </div>
  );
};
