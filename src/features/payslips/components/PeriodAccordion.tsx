import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { FiscalYearWithPeriods } from '../types/payslip.types';
import { PeriodList } from './PeriodList';

interface PeriodAccordionProps {
  fiscalYears: FiscalYearWithPeriods[];
  selectedPeriodId: string | null;
  onSelectPeriod: (periodId: string, periodName: string) => void;
  loading?: boolean;
}

const FYBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status === 'ACTIVE';
  const isClosed = status === 'CLOSED';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border',
        isActive ? 'bg-brand-50 border-emerald-100 text-emerald-700' :
        isClosed ? 'bg-slate-50 border-slate-200 text-slate-500' :
        'bg-amber-50 border-amber-200 text-amber-700'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', 
        isActive ? 'bg-emerald-500' : 
        isClosed ? 'bg-slate-400' : 
        'bg-amber-500'
      )} />
      {status}
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

export const PeriodAccordion: React.FC<PeriodAccordionProps> = ({
  fiscalYears,
  selectedPeriodId,
  onSelectPeriod,
  loading = false,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    fiscalYears.find((fy) => fy.status === 'ACTIVE')?.id ?? fiscalYears[0]?.id ?? null,
  );

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-8 py-6 space-y-3">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-slate-50 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-50 animate-pulse rounded-lg w-1/3" />
                  <div className="h-3 bg-slate-50 animate-pulse rounded-lg w-2/5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fiscalYears.map((fy) => {
        const isExpanded = expandedId === fy.id;
        const isActive = fy.status === 'ACTIVE';
        const completedCount = fy.periods.filter(
          (p) => p.generationStatus === 'COMPLETED',
        ).length;
        const totalCount = fy.periods.length;

        return (
          <div
            key={fy.id}
            className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
          >
            <div
              onClick={() => toggle(fy.id)}
              className="flex items-center justify-between px-8 py-6 cursor-pointer select-none hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-5">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors',
                    isActive
                      ? 'bg-brand-50 border-emerald-100 text-emerald-600'
                      : 'bg-slate-50 border-slate-200 text-slate-400',
                  )}
                >
                  <Calendar className="w-5 h-5" strokeWidth={2.5} />
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-lg font-bold tracking-tight",
                      isActive ? "text-slate-900" : "text-slate-600"
                    )}>
                      {fy.name}
                    </span>
                    <FYBadge status={fy.status} />
                  </div>
                  <p className="text-[13px] text-slate-400 font-medium mt-0.5">
                    {fmtDateRange(fy.startDate, fy.endDate)}
                    {' · '}
                    <span className="text-slate-500">{totalCount} Periods</span>
                    {completedCount > 0 && (
                      <>
                        {' · '}
                        <span className="text-emerald-600 font-bold">{completedCount} Ready</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border",
                isExpanded ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-100 text-slate-400"
              )}>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 transition-transform duration-300',
                    isExpanded && 'rotate-180',
                  )}
                />
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="border-t border-slate-100"
                >
                  <PeriodList
                    periods={fy.periods}
                    selectedPeriodId={selectedPeriodId}
                    onSelect={onSelectPeriod}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
