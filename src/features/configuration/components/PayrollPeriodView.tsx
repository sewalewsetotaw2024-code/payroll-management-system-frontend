import React from 'react';
import {
  CalendarDays, Pencil, Lock, Unlock, CheckCircle2, ChevronDown, ChevronUp, Clock, Info,
} from 'lucide-react';
import type { PayrollPeriod, FiscalYear } from '../types/configuration.types';

interface PayrollPeriodViewProps {
  periods: PayrollPeriod[];
  activeFiscalYears: FiscalYear[];
  saving: boolean;
  onOpenEdit: (period: PayrollPeriod) => void;
  onOpenPeriod: (id: string) => void;
  onClosePeriod: (id: string) => void;
}

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/**
 * PayrollPeriodView — list view matching the Fiscal Year UI pattern.
 * Shows all periods with status badges and row-level Open/Close/Edit actions.
 * Features an expandable item detail view for senior-level UX.
 */
export const PayrollPeriodView: React.FC<PayrollPeriodViewProps> = ({
  periods,
  activeFiscalYears,
  saving,
  onOpenEdit,
  onOpenPeriod,
  onClosePeriod,
}) => {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const activePeriod = periods.find((p) => p.status === 'ACTIVE');

  const toggleExpand = (id: string | undefined) => {
    if (!id) return;
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Active period banner */}
      {activePeriod && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-800">
              Active Period:{' '}
              <span className="text-emerald-900">{activePeriod.name || 'Unnamed Period'}</span>
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {formatDate(activePeriod.startDate)} — {formatDate(activePeriod.endDate)}
              {activePeriod.dateOfPayment && (
                <span className="ml-2">· Payment: {formatDate(activePeriod.dateOfPayment)}</span>
              )}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider shrink-0">
            <Unlock className="w-3.5 h-3.5" />
            Open
          </span>
        </div>
      )}

      {/* Period list */}
      <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {periods.map((period) => {
            const isActive = period.status === 'ACTIVE';
            const isDraft = period.status === 'DRAFT';
            const isClosed = period.status === 'DONE';
            const isExpanded = expandedId === period.id;

            const fyName = activeFiscalYears.find((fy) => fy.id === period.fiscalYearId)?.name;

            return (
              <div key={period.id} className="group overflow-hidden">
                <div
                  className={`flex items-center justify-between px-8 py-5 transition-all cursor-pointer ${
                    isActive ? 'bg-emerald-50/30' : 'hover:bg-slate-50/30'
                  } ${isExpanded ? 'bg-slate-50/50' : ''}`}
                  onClick={() => toggleExpand(period.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
                          : isClosed
                          ? 'bg-slate-100 text-slate-300 border-slate-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      } ${isExpanded ? 'scale-110 shadow-sm' : ''}`}
                    >
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                          {period.name || 'Unnamed Period'}
                        </h4>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <Unlock className="w-3 h-3" />
                            Open
                          </span>
                        )}
                        {isDraft && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700 border border-yellow-200">
                            Draft
                          </span>
                        )}
                        {isClosed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                            <Lock className="w-3 h-3" />
                            Closed
                          </span>
                        )}
                        {period.cycle && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                            {period.cycle.toLowerCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-400 mt-1">
                        {formatDate(period.startDate)} — {formatDate(period.endDate)}
                        {fyName && (
                          <span className="ml-2 text-slate-300">· {fyName}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {!isClosed && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        {isDraft && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenEdit(period); }}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                            title="Edit period"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {isDraft && (
                          <button
                            onClick={(e) => { e.stopPropagation(); period.id && onOpenPeriod(period.id); }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-100 bg-emerald-50/50 rounded-xl transition-all"
                            title="Open period"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Open</span>
                          </button>
                        )}
                        {isActive && (
                          <button
                            onClick={(e) => { e.stopPropagation(); period.id && onClosePeriod(period.id); }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-100 bg-amber-50/50 rounded-xl transition-all"
                            title="Close period"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Close</span>
                          </button>
                        )}
                      </div>
                    )}
                    <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-slate-100 text-slate-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content: High-fidelity details — Big and Bold for readability */}
                {isExpanded && (
                  <div className="px-8 pb-10 pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 p-8 bg-slate-50 border border-slate-200 rounded-[32px] shadow-inner">

                      {/* Column 1: Period Duration */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-blue-500">
                          <div className="p-2 bg-blue-50 rounded-lg shadow-sm border border-blue-100">
                            <CalendarDays className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Period Duration</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Start Date</span>
                            <span className="text-lg font-black text-slate-800">{formatDate(period.startDate)}</span>
                          </div>
                          <div className="flex flex-col gap-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">End Date</span>
                            <span className="text-lg font-black text-slate-800">{formatDate(period.endDate)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Timing & Periodicity */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-slate-500">
                          <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                            <Clock className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-[0.1em]">Timing & Periodicity</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Payment Date</span>
                            <span className="text-lg font-black text-slate-800">{formatDate(period.dateOfPayment)}</span>
                          </div>
                          <div className="flex flex-col gap-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Calendar Cycle</span>
                            <span className="text-lg font-black text-slate-800">{period.calendarDays || '—'} <span className="text-sm font-normal text-slate-400">Days Total</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Workload Capacity */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-emerald-500">
                          <div className="p-2 bg-emerald-50 rounded-lg shadow-sm border border-emerald-100">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Productive Capacity</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-col gap-2 bg-gradient-to-br from-white to-emerald-50/30 p-6 rounded-2xl border border-emerald-200 shadow-sm transition-transform hover:scale-[1.02]">
                            <span className="text-[11px] text-emerald-600 font-black uppercase tracking-widest">Total Monthly Capacity</span>
                            <span className="text-3xl font-black text-emerald-700">
                              {Number(period.defaultMonthlyWorkdays || 0) * Number(period.dailyWorkingHours || 0) || '—'}{' '}
                              <span className="text-sm font-normal text-emerald-500 uppercase">Hours</span>
                            </span>
                            <p className="text-[10px] text-emerald-600/60 font-medium mt-1 italic">Calculated from standard monthly basis</p>
                          </div>
                        </div>
                      </div>

                      {/* Column 4: System Configuration */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-blue-500">
                          <div className="p-2 bg-blue-50 rounded-lg shadow-sm border border-blue-100">
                            <Info className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">System Configuration</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Monthly Standard Basis</span>
                            <span className="text-lg font-black text-slate-800">{period.defaultMonthlyWorkdays || '—'} <span className="text-sm font-normal text-slate-400">Days</span></span>
                          </div>
                          <div className="flex flex-col gap-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Daily Hour Threshold</span>
                            <span className="text-lg font-black text-slate-800">{period.dailyWorkingHours || '—'} <span className="text-sm font-normal text-slate-400">Hours</span></span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
