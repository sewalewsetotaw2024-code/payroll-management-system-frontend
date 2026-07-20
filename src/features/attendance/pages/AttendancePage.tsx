import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Fingerprint, FileText, FileBarChart2, CalendarRange,
  Upload, Users, Clock, AlertCircle, CheckCircle2, ChevronDown, X
} from 'lucide-react';
import { Skeleton, GlassCard, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { attendanceApi } from '../api/attendanceApi';
import { AttendanceSummarySection } from '../components/AttendanceSummarySection';
import { AttendancePeriodSummarySection } from '../components/AttendancePeriodSummarySection';
import { fiscalYearApi, payrollPeriodApi } from '../../configuration/api/configurationApi';
import type { PayrollPeriod, FiscalYear } from '../../configuration/types/configuration.types';
import type { ImportDetail } from '../types/attendance.types';

const tabs = [
  { id: 'attendance', label: 'Attendance Data', icon: Fingerprint },
  { id: 'applications', label: 'Leave Applications', icon: FileText },
  { id: 'calculation', label: 'Attendance Summary', icon: FileBarChart2 },
];

export const AttendancePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('attendance');
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [importDetail, setImportDetail] = useState<ImportDetail | null>(null);
  const [triggerImport, setTriggerImport] = useState(false);
  const [summaryCount, setSummaryCount] = useState(0);
  const loadCounterRef = useRef(0);

  /** Load import detail + summary count for a given period, with stale async protection. */
  const loadImportDetail = useCallback(async (periodId: string) => {
    const id = ++loadCounterRef.current;
    try {
      const imports = (await attendanceApi.listImports()) ?? [];
      if (id !== loadCounterRef.current) return;
      const periodImports = imports.filter((i) => i.payrollPeriodId === periodId);
      const activeImport = periodImports.find((i) => i.isActive) ?? periodImports[0];

      if (activeImport) {
        const detail = await attendanceApi.getImportById(activeImport.id);
        if (id !== loadCounterRef.current) return;
        setImportDetail(detail);
        setSummaryCount(detail.monthlySummaries?.length ?? 0);
      } else {
        setImportDetail(null);
        setSummaryCount(0);
      }
    } catch {
      // Non-critical; silently ignore
    }
  }, []);

  /** Initial load: fetch fiscal years, payroll periods, auto-select the active period, and load its import data. */
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      try {
        const [fyRes, periodsRes] = await Promise.all([
          fiscalYearApi.getAll(),
          payrollPeriodApi.getAll(),
        ]);
        if (cancelled) return;

        const fyList: FiscalYear[] =
          (fyRes.data?.data && Array.isArray(fyRes.data.data)) ? fyRes.data.data : [];
        const periodList: PayrollPeriod[] =
          (periodsRes.data?.data && Array.isArray(periodsRes.data.data)) ? periodsRes.data.data : [];

        setFiscalYears(fyList);
        setPeriods(periodList);

        if (periodList.length > 0) {
          const activePeriod = periodList[0];
          setSelectedPeriodId(activePeriod.id!);
          if (activePeriod.fiscalYearId) setSelectedFiscalYearId(activePeriod.fiscalYearId);

          // Load import detail for the auto-selected period
          const imports = (await attendanceApi.listImports()) ?? [];
          if (cancelled) return;
          const periodImports = imports.filter((i) => i.payrollPeriodId === activePeriod.id);
          const activeImport = periodImports.find((i) => i.isActive) ?? periodImports[0];

          if (activeImport) {
            const detail = await attendanceApi.getImportById(activeImport.id);
            if (!cancelled) {
              setImportDetail(detail);
              setSummaryCount(detail.monthlySummaries?.length ?? 0);
            }
          }
        }
      } catch {
        // Errors handled by showing empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  /* ─── Derived data ──────────────────────────────── */

  const filteredPeriods = useMemo(() => {
    if (!selectedFiscalYearId) return periods;
    return periods.filter((p) => p.fiscalYearId === selectedFiscalYearId);
  }, [periods, selectedFiscalYearId]);

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId) ?? null,
    [periods, selectedPeriodId],
  );

  /* ─── Filter handlers ───────────────────────────── */

  const handleFiscalYearChange = (fyId: string) => {
    setSelectedFiscalYearId(fyId);
    const fyPeriods = periods.filter((p) => p.fiscalYearId === fyId);
    if (fyPeriods.length > 0) {
      handlePeriodChange(fyPeriods[0].id!);
    } else {
      setSelectedPeriodId('');
      setImportDetail(null);
      setSummaryCount(0);
    }
  };

  const handlePeriodChange = (periodId: string) => {
    setSelectedPeriodId(periodId);
    const period = periods.find((p) => p.id === periodId);
    if (period?.fiscalYearId) setSelectedFiscalYearId(period.fiscalYearId);
    loadImportDetail(periodId);
  };

  /* ─── Actions ────────────────────────────────────── */

  const handleImportData = () => {
    setActiveTab('attendance');
    setTriggerImport(true);
  };

  const handleImportConsumed = useCallback(() => {
    setTriggerImport(false);
    if (selectedPeriodId) loadImportDetail(selectedPeriodId);
  }, [selectedPeriodId, loadImportDetail]);

  const attendanceStats = useMemo(() => {
    if (!importDetail?.monthlySummaries) return null;
    const summaries = importDetail.monthlySummaries;
    const totalEmployees = summaries.length;
    const totalRegular = summaries.reduce((s, r) => s + Number(r.regularHours ?? 0), 0);
    const totalAbsent = summaries.reduce((s, r) => s + Number(r.absenceHours ?? 0), 0);
    const total = totalRegular + totalAbsent;
    const rate = total > 0 ? Math.round((totalRegular / total) * 1000) / 10 : 0;
    const fmtHrs = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const fmtInt = (n: number) => n.toLocaleString('en-US');
    return [
      { label: 'Total Employees', value: fmtInt(totalEmployees), icon: Users, iconBg: 'bg-brand-100 text-emerald-600' },
      { label: 'Regular Hours', value: fmtHrs(totalRegular), icon: Clock, iconBg: 'bg-brand-100 text-emerald-600' },
      { label: 'Absent Hours', value: fmtHrs(totalAbsent), icon: AlertCircle, iconBg: 'bg-amber-100 text-amber-600' },
      { label: 'Attendance Rate', value: `${rate}%`, icon: CheckCircle2, iconBg: rate >= 90 ? 'bg-brand-100 text-emerald-600' : rate >= 75 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600' },
    ];
  }, [importDetail]);

  const renderTabContent = () => {
    const periodId = selectedPeriod?.id ?? null;
    const periodName = selectedPeriod?.name ?? '';
    const periodStart = selectedPeriod?.startDate ?? '';
    const periodEnd = selectedPeriod?.endDate ?? '';

    switch (activeTab) {
      case 'attendance':
        return (
          <AttendanceSummarySection
            periodId={periodId}
            triggerImport={triggerImport}
            onImportConsumed={handleImportConsumed}
          />
        );
      case 'applications': {
        const LA = React.lazy(() =>
          import('../../leave/components/LeaveApplicationsSection').then(m => ({
            default: m.LeaveApplicationsSection,
          }))
        );
        return (
          <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
            <LA
              periodId={periodId}
              periodStart={periodStart}
              periodEnd={periodEnd}
              paidLeaveOnly={true}
            />
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
    <div className="space-y-10 pb-12 relative">
      {/* Loading period */}
      {loading && (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-[2.5rem]" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Skeleton className="h-32 rounded-[2rem]" />
            <Skeleton className="h-32 rounded-[2rem]" />
            <Skeleton className="h-32 rounded-[2rem]" />
            <Skeleton className="h-32 rounded-[2rem]" />
          </div>
          <Skeleton className="h-20 rounded-[2rem]" />
        </div>
      )}

      {/* No payroll periods configured */}
      {!loading && periods.length === 0 && (
        <div className="glass rounded-[3rem] p-12 flex items-center gap-6 border-white shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 flex items-center justify-center shrink-0 shadow-sm">
            <CalendarRange className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 tracking-tight">Deployment Restricted</p>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Active payroll periods must be initialized in the Configuration matrix before biometric intelligence can be accessed.
            </p>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      {selectedPeriod && (
        <div className="space-y-10">
          {/* ── Header Bento Box ── */}
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 rounded-[3rem] p-10 text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-400/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
                      <Fingerprint className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-black tracking-tight leading-none">Biometric Intelligence</h1>
                      <p className="text-brand-100 font-bold text-xs uppercase tracking-widest mt-2">Attendance & Utilization Tracking</p>
                    </div>
                  </div>
                  <p className="text-brand-50/80 text-sm max-w-xl font-medium leading-relaxed">
                    Analyzing workforce engagement telemetry across all business units. 
                    Real-time synchronization with primary biometric gateways.
                  </p>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border border-white/20 shadow-inner group hover:bg-white/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
                        <CalendarRange className="w-5 h-5 text-brand-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Active Cycle</p>
                        <p className="text-sm font-black text-white">{selectedPeriod.name}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-[10px] font-bold text-emerald-200/70 font-mono">
                        {new Date(selectedPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' — '}
                        {new Date(selectedPeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleImportData}
                    className="w-full bg-white text-brand-primary hover:bg-brand-50 rounded-2xl font-black uppercase tracking-widest text-xs h-12 shadow-2xl shadow-brand-900/40"
                  >
                    <Upload className="w-4 h-4" />
                    Ingest Gateway Data
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Filter & Navigation Bar ──────────────────────────────── */}
          <div className="glass rounded-[2.5rem] p-3 flex flex-wrap items-center gap-4 shadow-xl border-white">
            <div className="flex items-center gap-2 pl-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Matrix Context</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group">
                <select
                  value={selectedFiscalYearId}
                  onChange={(e) => handleFiscalYearChange(e.target.value)}
                  className="appearance-none bg-white border-2 border-brand-200 rounded-2xl pl-6 pr-10 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-400 transition-all cursor-pointer min-w-[160px]"
                >
                  {fiscalYears.map((fy) => (
                    <option key={fy.id} value={fy.id}>{fy.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none group-hover:text-brand-primary" />
              </div>

              <div className="relative group">
                <select
                  value={selectedPeriodId}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="appearance-none bg-white border-2 border-brand-200 rounded-2xl pl-6 pr-10 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-400 transition-all cursor-pointer min-w-[200px]"
                >
                  {filteredPeriods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name || "Select Period"}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none group-hover:text-brand-primary" />
              </div>
            </div>

            <div className="ml-auto pr-4">
              {importDetail && (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-900/20">
                  {summaryCount} Active Personnel
                </span>
              )}
            </div>
          </div>

          {/* ── Attendance Stats Bento Row ── */}
          {attendanceStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {attendanceStats.map((stat, i) => (
                <motion.div 
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-[2rem] p-8 shadow-xl border-white group hover:-translate-y-1 transition-all duration-300 flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between">
                    <div className={cn("w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center ring-1 ring-slate-100 group-hover:scale-110 transition-transform", stat.iconBg.includes('text-emerald') ? 'text-brand-primary' : stat.iconBg.includes('text-amber') ? 'text-amber-500' : 'text-rose-500')}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">{stat.value}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Main Data Matrix ── */}
          <div className="glass rounded-[3rem] shadow-2xl border-white overflow-hidden bg-white/30 backdrop-blur-md">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 px-8 py-4 border-b border-slate-100 bg-white/40">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isTabActive = activeTab === tab.id;
                const tabCount = tab.id === 'applications' ? null : summaryCount;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchParams({ tab: tab.id }, { replace: true });
                    }}
                    className={cn(
                      "inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95",
                      isTabActive 
                        ? "bg-brand-primary text-white shadow-lg shadow-brand-900/20" 
                        : "text-slate-500 hover:bg-white/60 hover:text-slate-800"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tabCount != null && tabCount > 0 && (
                      <span className={cn(
                        "ml-2 px-2 py-0.5 rounded-lg text-[9px] font-black shadow-sm",
                        isTabActive ? "bg-white/20 text-white" : "bg-brand-50 text-brand-primary"
                      )}>
                        {tabCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Canvas */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-8"
            >
              {renderTabContent()}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};
