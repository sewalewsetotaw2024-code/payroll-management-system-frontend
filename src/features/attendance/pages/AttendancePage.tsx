import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Fingerprint, FileText, FileBarChart2, CalendarRange } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Skeleton, GlassCard, StatusBadge } from '../../../components/ui';
import { payrollPeriodApi } from '../../configuration/api/configurationApi';
import { AttendanceSummarySection } from '../components/AttendanceSummarySection';
import { AttendancePeriodSummarySection } from '../components/AttendancePeriodSummarySection';
import type { PayrollPeriod } from '../../configuration/types/configuration.types';

const tabs = [
  { id: 'attendance', label: 'Attendance Data', icon: Fingerprint },
  { id: 'applications', label: 'Leave Applications', icon: FileText },
  { id: 'calculation', label: 'Attendance Summary', icon: FileBarChart2 },
];

export const AttendancePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('attendance');
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(true);
  const [periodError, setPeriodError] = useState(false);

  const fetchCurrentPeriod = useCallback(async () => {
    setLoadingPeriod(true);
    setPeriodError(false);
    try {
      const response = await payrollPeriodApi.getCurrent();
      setCurrentPeriod(response.data?.data ?? null);
    } catch {
      setPeriodError(true);
      setCurrentPeriod(null);
    } finally {
      setLoadingPeriod(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentPeriod();
  }, [fetchCurrentPeriod]);

  const renderTabContent = () => {
    const periodId = currentPeriod?.id ?? null;
    const periodName = currentPeriod?.name ?? '';
    const periodStart = currentPeriod?.startDate ?? '';
    const periodEnd = currentPeriod?.endDate ?? '';

    switch (activeTab) {
      case 'attendance':
        return <AttendanceSummarySection periodId={periodId} />;
      case 'applications': {
        const LA = React.lazy(() =>
          import('../../leave/components/LeaveApplicationsSection').then(m => ({
            default: m.LeaveApplicationsSection,
          }))
        );
        return (
          <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
            <GlassCard padding="lg">
              <LA
                periodId={periodId}
                periodStart={periodStart}
                periodEnd={periodEnd}
                paidLeaveOnly={true}
              />
            </GlassCard>
          </Suspense>
        );
      }
      case 'calculation':
        return (
          <AttendancePeriodSummarySection
            periodId={periodId}
            periodName={periodName}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header with period badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">
            View attendance data, leave applications, and attendance summaries.
          </p>
        </div>
        {currentPeriod && (
          <GlassCard padding="sm" className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <CalendarRange className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">
                {currentPeriod.name || 'Payroll Period'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {new Date(currentPeriod.startDate).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}{' — '}
                {new Date(currentPeriod.endDate).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            </div>
            <StatusBadge status={currentPeriod.status ?? 'DRAFT'} />
          </GlassCard>
        )}
      </div>

      {/* Loading period */}
      {loadingPeriod && (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>
      )}

      {/* No active period */}
      {!loadingPeriod && !currentPeriod && (
        <GlassCard className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <CalendarRange className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">No active payroll period</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Configure and activate a payroll period in Configuration to view attendance and leave data.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Tabs (only when there IS a period) */}
      {currentPeriod && (
        <>
          {/* Glass pill tab bar */}
          <div className="bg-white/60 backdrop-blur-xl border border-slate-200 p-1 rounded-xl w-fit shadow-sm">
            <div className="flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setActiveTab(tab.id); setSearchParams({ tab: tab.id }, { replace: true }); }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer relative',
                      activeTab === tab.id
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-700'
                    )}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="active-attendance-tab"
                        className="absolute inset-0 bg-emerald-600 rounded-lg shadow-md shadow-emerald-600/20"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon className={cn("w-4 h-4 relative z-10", activeTab === tab.id ? "text-white" : "text-slate-400")} />
                    <span className="relative z-10">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </>
      )}
    </div>
  );
};
