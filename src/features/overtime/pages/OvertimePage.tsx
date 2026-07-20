import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  TrendingUp,
  Database,
  Pencil,
  Check,
  X,
  RefreshCw,
  Fingerprint
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { attendanceApi } from '../../attendance/api/attendanceApi';
import { overtimeRuleApi, workdaysApi, payrollPeriodApi, fiscalYearApi } from '../../configuration/api/configurationApi';
import type { AttendanceImport, AttendanceMonthlySummary, ImportDetail, OtCalculationResult } from '../../attendance/types/attendance.types';
import type { OvertimeRule, WorkdaysConfig, PayrollPeriod, FiscalYear } from '../../configuration/types/configuration.types';

import { Skeleton, GlassCard, Button } from '../../../components/ui';

const BASE_OT_RATE = 350; // ETB per hour base rate

const otRates = [
  { label: 'Weekday OT', multiplier: '1.5x', color: 'bg-brand-50 text-emerald-700' },
  { label: 'Night OT', multiplier: '1.75x', color: 'bg-purple-50 text-purple-700' },
  { label: 'Weekend OT', multiplier: '2x', color: 'bg-blue-50 text-blue-700' },
  { label: 'Holiday OT', multiplier: '2.5x', color: 'bg-amber-50 text-amber-700' },
];

/** Map an OT category string to its pay multiplier using fetched rules. */
function getCategoryMultiplier(category: string, rules: OvertimeRule[]): number {
  const norm = category.toUpperCase().replace(/\s/g, '_');
  const rule = rules.find(r => r.category === norm);
  if (rule) return safeNum(rule.rate) || 1.5;

  // Fallback defaults if rule not found
  const lower = category.toLowerCase();
  if (lower.includes('normal') || lower.includes('weekday') || lower.includes('regular')) return 1.5;
  if (lower.includes('night')) return 1.75;
  if (lower.includes('weekend')) return 2;
  if (lower.includes('holiday')) return 2.5;
  return 1.5;
}

/** Pick a chart bar colour based on the OT category name. */
function getBarColor(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('normal') || lower.includes('weekday') || lower.includes('regular')) return '#059669';
  if (lower.includes('night')) return '#7c3aed';
  if (lower.includes('weekend')) return '#3b82f6';
  if (lower.includes('holiday')) return '#f59e0b';
  return '#059669';
}

/** Default monthly work hours when config is not yet loaded. 30 days × 8 hours = 240. */
const DEFAULT_MONTHLY_WORK_HOURS = 240;

/** Safe number coercion — returns 0 for NaN, undefined, null, or empty string. */
const safeNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Compute pre-overtime gross salary matching payroll processing logic.
 * This ensures OT hourly rate uses the same base as payroll:
 *   proratedBasic + proratedAllowances
 * where prorationFactor = actualDays / defaultMonthlyWorkdays.
 */
function computePreOvertimeGross(
  s: AttendanceMonthlySummary,
  periodSummaries: { employeeId: string; actualDays?: number | null }[],
  defaultMonthlyWorkdays: number,
): number {
  const basicSalary = safeNum(s.employee?.compensation?.basicSalary);
  const allowances = s.employee?.allowances || [];
  const totalAllowances = allowances.reduce((sum, a) => sum + safeNum(a.amount), 0);

  // Look up actualDays from period summary
  const ps = periodSummaries.find(p => p.employeeId === s.employeeId);
  const actualDays = safeNum(ps?.actualDays);

  // Compute proration factor (same logic as payroll processing)
  let prorationFactor = 1;
  if (actualDays > 0 && defaultMonthlyWorkdays > 0) {
    prorationFactor = actualDays / defaultMonthlyWorkdays;
  }

  const proratedBasic = basicSalary * prorationFactor;
  const proratedAllowances = totalAllowances * prorationFactor;
  return proratedBasic + proratedAllowances;
}

/** Get the hourly rate for an employee given a rule's calculation base.
 *  Hourly rate = salaryBase / monthlyWorkHours
 *  For GROSS rules: uses prorated pre-overtime gross (matching payroll processing).
 *  For BASIC rules: uses contracted basic salary.
 *  monthlyWorkHours comes from workdays config (defaultMonthlyWorkdays × dailyWorkingHours),
 *  falling back to DEFAULT_MONTHLY_WORK_HOURS.
 */
function getHourlyRate(
  s: AttendanceMonthlySummary,
  rule: OvertimeRule | undefined,
  monthlyWorkHours: number,
  preOvertimeGross?: number,
): number {
  if (monthlyWorkHours <= 0) return 0;
  if (!rule) {
    const salary = safeNum(s.employee?.compensation?.basicSalary);
    return salary / monthlyWorkHours;
  }
  if (rule.calculationBase === 'GROSS') {
    // Use prorated pre-overtime gross (matching payroll processing)
    const salaryBase = preOvertimeGross ?? safeNum(s.employee?.compensation?.grossSalary);
    return salaryBase / monthlyWorkHours;
  }
  return safeNum(s.employee?.compensation?.basicSalary) / monthlyWorkHours;
}

/** Compute total OT payment for one employee using actual salary and OT rule rates.
 *  Formula: hours × hourlyRate × categoryMultiplier
 *  Hourly rate respects the rule's calculationBase and workdays config.
 */
function computeEmployeePayment(
  s: AttendanceMonthlySummary,
  rules: OvertimeRule[],
  monthlyWorkHours: number = DEFAULT_MONTHLY_WORK_HOURS,
  preOvertimeGross?: number,
): number {
  const ruleWeekday = rules.find(r => r.category === 'WEEKDAY_DAY');
  const ruleNight = rules.find(r => r.category === 'WEEKDAY_NIGHT');
  const ruleWeekend = rules.find(r => r.category === 'WEEKEND');
  const ruleHoliday = rules.find(r => r.category === 'PUBLIC_HOLIDAY');

  const hrRateWeekday = getHourlyRate(s, ruleWeekday, monthlyWorkHours, preOvertimeGross);
  const hrRateNight = getHourlyRate(s, ruleNight, monthlyWorkHours, preOvertimeGross);
  const hrRateWeekend = getHourlyRate(s, ruleWeekend, monthlyWorkHours, preOvertimeGross);
  const hrRateHoliday = getHourlyRate(s, ruleHoliday, monthlyWorkHours, preOvertimeGross);

  const rWeekday = safeNum(ruleWeekday?.rate) || 1.5;
  const rNight = safeNum(ruleNight?.rate) || 1.75;
  const rWeekend = safeNum(ruleWeekend?.rate) || 2.0;
  const rHoliday = safeNum(ruleHoliday?.rate) || 2.5;

  return (
    safeNum(s.normalOtHours) * hrRateWeekday * rWeekday +
    safeNum(s.ot1Hours) * hrRateNight * rNight +
    safeNum(s.weekendOtHours) * hrRateWeekend * rWeekend +
    safeNum(s.holidayOtHours) * hrRateHoliday * rHoliday
  );
}

/** Sum all OT hours across the four OT fields of one employee summary. */
function sumEmployeeOtHours(s: AttendanceMonthlySummary): number {
  return safeNum(s.normalOtHours) + safeNum(s.weekendOtHours) + safeNum(s.holidayOtHours) + safeNum(s.ot1Hours);
}

/** Look up per-employee calculated OT from OvertimeRecords by summary ID. */
function getEmployeeCalculatedOt(
  summaryId: string,
  otResult: OtCalculationResult | null,
): { weekdayDay: number; weekdayNight: number; weekend: number; holiday: number; total: number } {
  const empty = { weekdayDay: 0, weekdayNight: 0, weekend: 0, holiday: 0, total: 0 };
  if (!otResult?.byEmployee) return empty;
  const empData = otResult.byEmployee.find(e => e.summaryId === summaryId);
  if (!empData) return empty;
  let weekdayDay = 0, weekdayNight = 0, weekend = 0, holiday = 0;
  for (const c of empData.categories) {
    const hours = safeNum(c.hours);
    switch (c.category) {
      case 'WEEKDAY_DAY': weekdayDay = hours; break;
      case 'WEEKDAY_NIGHT': weekdayNight = hours; break;
      case 'WEEKEND': weekend = hours; break;
      case 'PUBLIC_HOLIDAY': holiday = hours; break;
    }
  }
  return { weekdayDay, weekdayNight, weekend, holiday, total: weekdayDay + weekdayNight + weekend + holiday };
}

/** Build a full name string for an employee from summary data. */
function buildEmployeeName(s: AttendanceMonthlySummary): string {
  if (s.employee?.firstName || s.employee?.lastName) {
    return [s.employee.firstName, s.employee.lastName].filter(Boolean).join(' ');
  }
  return s.employeeName || `Employee #${s.employeeId}`;
}

export const OvertimePage: React.FC = () => {
  const navigate = useNavigate();
  const [imports, setImports] = useState<AttendanceImport[]>([]);
  const [selectedImport, setSelectedImport] = useState<AttendanceImport | null>(null);
  const [importDetail, setImportDetail] = useState<ImportDetail | null>(null);
  const [otResult, setOtResult] = useState<OtCalculationResult | null>(null);
  const [otRules, setOtRules] = useState<OvertimeRule[]>([]);
  const [workdaysConfig, setWorkdaysConfig] = useState<WorkdaysConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ rate: number; calculationBase: 'BASIC' | 'GROSS'; isTaxable: boolean }>({ rate: 1.5, calculationBase: 'BASIC', isTaxable: true });
  const [savingRule, setSavingRule] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const editInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const loadCounterRef = useRef(0); // prevents stale async updates

  // ─── Derived filter data ────────────────────────────────────
  /** Filter periods by selected fiscal year */
  const filteredPeriods = useMemo(() => {
    if (!selectedFiscalYearId) return periods;
    return periods.filter(p => p.fiscalYearId === selectedFiscalYearId);
  }, [periods, selectedFiscalYearId]);

  /** Get imports for the selected period */
  const selectedPeriodImports = useMemo(() => {
    if (!selectedPeriodId) return [];
    return imports.filter(i => i.payrollPeriodId === selectedPeriodId);
  }, [imports, selectedPeriodId]);

  /** Load detail + OT data for a specific import (used by filter handlers). */
  const loadImportData = useCallback(async (importId: string) => {
    const id = ++loadCounterRef.current;
    try {
      const [detail, ot] = await Promise.all([
        attendanceApi.getImportById(importId),
        attendanceApi.getOvertimeResults(importId).catch(() => null),
      ]);
      if (id !== loadCounterRef.current) return;
      setImportDetail(detail);
      setOtResult(ot);
    } catch (err) {
      console.error('Failed to load import data:', err);
    }
  }, []);

  // ─── Filter handlers ────────────────────────────────────────
  /** Switch to a different payroll period and load its active import data. */
  const handlePeriodChange = (periodId: string) => {
    setSelectedPeriodId(periodId);
    const period = periods.find(p => p.id === periodId);
    if (period?.fiscalYearId) setSelectedFiscalYearId(period.fiscalYearId);
    const periodImps = imports.filter(i => i.payrollPeriodId === periodId);
    const activeImp = periodImps.find(i => i.isActive) ?? periodImps[0];
    if (activeImp) {
      setSelectedImport(activeImp);
      loadImportData(activeImp.id);
    } else {
      setSelectedImport(null);
      setImportDetail(null);
      setOtResult(null);
    }
  };

  /** Switch fiscal year and auto-select its first period. */
  const handleFiscalYearChange = (fyId: string) => {
    setSelectedFiscalYearId(fyId);
    const fyPeriods = periods.filter(p => p.fiscalYearId === fyId);
    if (fyPeriods.length > 0) {
      handlePeriodChange(fyPeriods[0].id!);
    }
  };

  /** Load fiscal years, payroll periods, attendance imports, and OT data on mount. */
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const [importsList, rulesRes, workdaysRes, periodsRes, fyRes] = await Promise.all([
          attendanceApi.listImports({ limit: 1000 }),
          overtimeRuleApi.getAll(),
          workdaysApi.get().catch(() => ({ data: null })),
          payrollPeriodApi.getAll(),
          fiscalYearApi.getAll(),
        ]);

        if (cancelled) return;
        const imps = importsList ?? [];
        setImports(imps);

        // Extract OT rules
        const rawRules = rulesRes.data?.data;
        let extractedRules: OvertimeRule[] = [];
        if (Array.isArray(rawRules)) extractedRules = rawRules;
        else if (Array.isArray(rulesRes.data?.overtimeRules)) extractedRules = rulesRes.data.overtimeRules;
        else if (Array.isArray(rulesRes.data)) extractedRules = rulesRes.data;
        setOtRules(extractedRules);

        // Extract workdays config
        const workdaysData = workdaysRes?.data?.data ?? workdaysRes?.data ?? null;
        if (workdaysData && typeof workdaysData === 'object') {
          workdaysData.defaultMonthlyWorkdays = safeNum(workdaysData.defaultMonthlyWorkdays) || 26;
          workdaysData.dailyWorkingHours = safeNum(workdaysData.dailyWorkingHours) || 8;
        }
        setWorkdaysConfig(workdaysData);

        // Set fiscal years
        const fyList = (fyRes.data?.data && Array.isArray(fyRes.data.data)) ? fyRes.data.data : [];
        setFiscalYears(fyList);

        // Set periods
        const periodList = (periodsRes.data?.data && Array.isArray(periodsRes.data.data)) ? periodsRes.data.data : [];
        setPeriods(periodList);

        // Auto-select first period and fiscal year from the active import, or fallback to first period
        if (imps.length > 0) {
          const activeImport = imps.find(i => i.isActive) ?? imps[0];
          setSelectedImport(activeImport);

          // Find the period that matches this import's payrollPeriodId
          const matchingPeriod = periodList.find((p: PayrollPeriod) => p.id === activeImport.payrollPeriodId);
          if (matchingPeriod) {
            setSelectedPeriodId(matchingPeriod.id!);
            if (matchingPeriod.fiscalYearId) {
              setSelectedFiscalYearId(matchingPeriod.fiscalYearId);
            }
          } else if (periodList.length > 0) {
            // Fallback to first period
            setSelectedPeriodId(periodList[0].id!);
            if (periodList[0].fiscalYearId) {
              setSelectedFiscalYearId(periodList[0].fiscalYearId);
            }
          }

          // Load import detail and OT
          const detail = await attendanceApi.getImportById(activeImport.id);
          if (cancelled) return;
          setImportDetail(detail);

          try {
            const ot = await attendanceApi.getOvertimeResults(activeImport.id);
            if (!cancelled) setOtResult(ot);
          } catch {
            // No OT calculation yet
          }
        } else if (periodList.length > 0) {
          // No imports but have periods — select first period
          setSelectedPeriodId(periodList[0].id!);
          if (periodList[0].fiscalYearId) {
            setSelectedFiscalYearId(periodList[0].fiscalYearId);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load overtime data:', error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  /** Trigger (or re-trigger) OT calculation for the current import. */
  const handleCalculateOt = async () => {
    if (!selectedImport) return;
    // Warn if calculating OT for a non-active import
    if (!selectedImport.isActive) {
      const confirmed = window.confirm(
        'This import is not active. OT calculations for inactive imports won\'t be used in payroll processing. Continue anyway?'
      );
      if (!confirmed) return;
    }
    setCalculating(true);
    try {
      const ot = await attendanceApi.calculateOvertime(selectedImport.id);
      setOtResult(ot);
    } catch (error) {
      console.error('Failed to calculate OT:', error);
    } finally {
      setCalculating(false);
    }
  };

  // ---- derived stats (using calculated OvertimeRecord data) ----
  const totalOtHours = otResult
    ? otResult.byCategory.reduce((sum, cat) => sum + safeNum(cat.totalHours), 0)
    : 0;

  // Monthly work hours from config (defaultMonthlyWorkdays × dailyWorkingHours)
  const monthlyWorkHours = workdaysConfig
    ? (safeNum(workdaysConfig.defaultMonthlyWorkdays) || 26) * (safeNum(workdaysConfig.dailyWorkingHours) || 8)
    : DEFAULT_MONTHLY_WORK_HOURS;

  // Compute total OT cost from calculated OvertimeRecords per employee
  const totalOtCost = importDetail && otResult
    ? importDetail.monthlySummaries
        .reduce((sum, s) => {
          const calcOt = getEmployeeCalculatedOt(s.id, otResult);
          if (calcOt.total <= 0) return sum;
          // Use calculated hours (not raw) for payment
          const tempSummary = { ...s, normalOtHours: calcOt.weekdayDay, ot1Hours: calcOt.weekdayNight, weekendOtHours: calcOt.weekend, holidayOtHours: calcOt.holiday };
          const preOtg = computePreOvertimeGross(s, importDetail.attendancePeriodSummaries || [], workdaysConfig?.defaultMonthlyWorkdays || 30);
          const payment = computeEmployeePayment(tempSummary, otRules, monthlyWorkHours, preOtg);
          return sum + (Number.isFinite(payment) ? payment : 0);
        }, 0)
    : 0;

  const employeesWithOT = otResult?.totalEmployees ?? 0;

  const avgOtPerEmployee = employeesWithOT > 0 ? totalOtHours / employeesWithOT : 0;

  console.log('[OT Page] Stats:', {
    totalOtHours,
    totalOtCost,
    employeesWithOT,
    avgOtPerEmployee,
    monthlyWorkHours,
    otRulesCount: otRules.length,
    byEmployeeCount: otResult?.byEmployee?.length ?? 0,
    byCategoryCount: otResult?.byCategory?.length ?? 0,
  });

  // Pagination for employee summary table
  const summaries = importDetail?.monthlySummaries || [];
  // Filter out employees with zero OT across all 4 categories when OT results are available
  const visibleSummaries = otResult
    ? summaries.filter(s => {
        const calcOt = getEmployeeCalculatedOt(s.id, otResult);
        return calcOt.total > 0;
      })
    : summaries;
  const totalPages = Math.ceil(visibleSummaries.length / pageSize);
  const paginatedSummaries = visibleSummaries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset pagination when selection changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedImport?.id]);

  // ---- loading state ----
  if (loading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-32 rounded-2xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[400px] rounded-2xl" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      </div>
    );
  }

  // ---- empty state (no imports yet) ----
  if (!imports || imports.length === 0) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Overtime Management</h1>
            <p className="text-slate-500 text-sm">Track and calculate overtime hours and payments</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Attendance Imports Found</h3>
          <p className="text-slate-500 text-sm max-w-md">
            Import attendance data from Data Management to see overtime calculations and summaries.
          </p>
          <button
            onClick={() => navigate('/data')}
            className="mt-6 px-5 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-brand-700 transition-colors flex items-center gap-2 shadow-lg shadow-brand-900/10"
          >
            <Database className="w-4 h-4" /> Go to Data Management
          </button>
        </div>
      </div>
    );
  }

  // ---- main content ----
  return (
    <div className="space-y-10 pb-12">
      {/* ─── Ledger Header ──────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="ledger-header">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overtime Management</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl font-medium">
            Audit and authorize overtime hours. Monitor cost distribution and configure active rate rules for the current payroll cycle.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={handleCalculateOt}
            disabled={calculating || !selectedImport}
            className="btn-primary min-w-[180px]"
          >
            <RefreshCw className={cn("w-4 h-4", calculating && "animate-spin")} />
            {calculating ? 'Processing...' : 'Run OT Engine'}
          </Button>
        </div>
      </div>

      {/* ─── Context Selector ──────────────────────────────── */}
      <GlassCard className="flex flex-wrap items-center gap-x-10 gap-y-6 px-8 py-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Year</span>
          <div className="relative group">
            <select
              value={selectedFiscalYearId}
              onChange={(e) => handleFiscalYearChange(e.target.value)}
              className="appearance-none text-sm font-bold text-slate-700 bg-white border-2 border-brand-200 rounded-xl px-3 py-2 pr-8 cursor-pointer focus:border-brand-400 focus:ring-4 focus:ring-brand-primary/10 transition-all"
            >
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>{fy.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-brand-primary pointer-events-none transition-colors" />
          </div>
        </div>

        <div className="h-10 w-px bg-slate-200/60 hidden md:block" />

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payroll Cycle</span>
          <div className="relative group">
            <select
              value={selectedPeriodId}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="appearance-none text-sm font-bold text-slate-700 bg-white border-2 border-brand-200 rounded-xl px-3 py-2 pr-8 cursor-pointer focus:border-brand-400 focus:ring-4 focus:ring-brand-primary/10 transition-all"
            >
              {filteredPeriods.map((p) => (
                <option key={p.id} value={p.id}>{p.name || `${new Date(p.startDate).toLocaleDateString()} - ${new Date(p.endDate).toLocaleDateString()}`}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-brand-primary pointer-events-none transition-colors" />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {selectedImport && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/50 border border-emerald-100/50 text-[11px] font-black text-emerald-700 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              ACTIVE IMPORT: {selectedImport.periodLabel}
            </div>
          )}
        </div>
      </GlassCard>

      {/* ─── Executive Summary ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Total OT Hours', 
            value: (safeNum(totalOtHours) || 0).toFixed(1), 
            unit: 'HRS', 
            icon: Clock, 
            color: 'text-emerald-600',
            bg: 'bg-brand-50'
          },
          { 
            label: 'Budget Impact', 
            value: (safeNum(totalOtCost) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }), 
            unit: 'ETB', 
            icon: TrendingUp, 
            color: 'text-brand-accent',
            bg: 'bg-orange-50'
          },
          { 
            label: 'Eligible Staff', 
            value: safeNum(employeesWithOT), 
            unit: 'USERS', 
            icon: Users, 
            color: 'text-blue-600',
            bg: 'bg-blue-50'
          },
          { 
            label: 'Avg Intensity', 
            value: (safeNum(avgOtPerEmployee) || 0).toFixed(1), 
            unit: 'H/EMP', 
            icon: Clock, 
            color: 'text-purple-600',
            bg: 'bg-purple-50'
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <GlassCard className="p-6 ledger-border hover:shadow-ledger transition-all group overflow-hidden">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-5 relative z-10">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center transition-all group-hover:rotate-6", stat.bg, stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className="text-3xl font-black tracking-tighter text-slate-900 mono-value">
                  {stat.value}
                </span>
                <span className="text-[10px] font-black text-slate-400 tracking-widest">{stat.unit}</span>
              </div>
              <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-widest relative z-10">{stat.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ─── Distribution Analytics ──────────── */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100/60">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Cost Distribution Analytics</h3>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-primary shadow-sm" />
                  <span className="text-[10px] font-black text-slate-500 tracking-wider uppercase">STANDARD</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-accent shadow-sm" />
                  <span className="text-[10px] font-black text-slate-500 tracking-wider uppercase">PREMIUM</span>
                </div>
              </div>
            </div>
            <div className="p-10 flex-1">
              {otResult && otResult.byCategory.length > 0 ? (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={otResult.byCategory} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                      <XAxis
                        dataKey="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                        dy={15}
                        tickFormatter={(v) => v.replace(/_/g, ' ').split(' ')[0]}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(248, 250, 252, 0.8)' }}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(226, 232, 240, 0.6)',
                          borderRadius: '20px',
                          boxShadow: '0 15px 40px -10px rgba(0, 0, 0, 0.08)',
                          padding: '12px 16px'
                        }}
                        formatter={(value: any) => [`${value} hrs`, 'Volume']}
                        labelStyle={{ fontSize: '11px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}
                      />
                      <Bar dataKey="totalHours" radius={[8, 8, 2, 2]} barSize={56}>
                        {otResult.byCategory.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.category.includes('HOLIDAY') || entry.category.includes('NIGHT') ? '#b07d62' : 'var(--color-brand-700)'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-30 select-none">
                  <Database className="w-12 h-12 mb-3 text-slate-400" />
                  <p className="text-sm font-black tracking-tight uppercase">Awaiting Calculation Results</p>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter">Run the OT engine to generate distribution data</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* ─── Rate Rule Auditor ──────────────── */}
        <GlassCard className="flex flex-col min-h-[460px]">
          <div className="px-8 py-6 border-b border-slate-100/60">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Rate Rule Auditor</h3>
          </div>
          <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
            {otRules.length > 0 ? (
              otRules.map((rule) => {
                const label = rule.category.replace(/_/g, ' ');
                const isEditing = editingRuleId === rule.id;
                const isPremium = rule.category.includes('NIGHT') || rule.category.includes('HOLIDAY');
                
                return (
                  <div key={rule.id} className="relative group p-5 rounded-3xl border border-slate-100/80 bg-white/40 hover:bg-white transition-all hover:shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                      <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100">
                        <div className={cn("w-1.5 h-1.5 rounded-full", rule.isTaxable !== false ? "bg-emerald-500" : "bg-slate-300")} />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Taxable</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {isEditing ? (
                        <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-right-2 duration-200">
                          <input
                            ref={editInputRef}
                            type="number"
                            step="0.01"
                            value={editForm.rate}
                            onChange={(e) => setEditForm(f => ({ ...f, rate: parseFloat(e.target.value) }))}
                            className="w-20 px-3 py-1.5 text-lg font-black bg-slate-50 rounded-xl focus:ring-2 focus:ring-brand-accent/20 outline-none mono-value border border-brand-accent/20"
                          />
                          <div className="flex gap-2">
                            <button onClick={async () => {
                              if (!rule.id) return;
                              setSavingRule(rule.id);
                              try {
                                await overtimeRuleApi.update(rule.id, {
                                  rate: editForm.rate,
                                  calculationBase: editForm.calculationBase,
                                  isTaxable: editForm.isTaxable,
                                });
                                const res = await overtimeRuleApi.getAll();
                                const rawRules = res.data?.data;
                                let extracted: OvertimeRule[] = [];
                                if (Array.isArray(rawRules)) extracted = rawRules;
                                else if (Array.isArray(res.data?.overtimeRules)) extracted = res.data.overtimeRules;
                                else if (Array.isArray(res.data)) extracted = res.data;
                                setOtRules(extracted);
                                setEditingRuleId(null);
                              } catch (err) {
                                console.error('Failed to save overtime rule:', err);
                              } finally {
                                setSavingRule(null);
                              }
                            }} className="w-8 h-8 rounded-full bg-brand-50 text-emerald-600 flex items-center justify-center hover:bg-brand-100 transition-colors">
                              {savingRule === rule.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setEditingRuleId(null)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className={cn("text-3xl font-black mono-value tracking-tighter", isPremium ? "text-brand-accent" : "text-brand-primary")}>
                            {rule.rate}x
                          </span>
                          <button 
                            onClick={() => {
                              setEditForm({ rate: safeNum(rule.rate), calculationBase: rule.calculationBase || 'BASIC', isTaxable: rule.isTaxable !== false });
                              setEditingRuleId(rule.id!);
                            }}
                            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-brand-primary hover:border-brand-primary/20"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 flex flex-col items-center opacity-20">
                <Database className="w-8 h-8 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">No Active Rules</span>
              </div>
            )}
          </div>
          <div className="p-6 bg-slate-50/50 border-t border-slate-100/60 rounded-b-[1.5rem]">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculation Base</span>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Prorated Gross</span>
             </div>
          </div>
        </GlassCard>
      </div>

      {/* ─── Payroll Impact Audit Table ─────────── */}
      <GlassCard className="overflow-hidden border-none shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between px-8 py-6 border-b border-slate-100/60 gap-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Payroll Impact Audit</h3>
            <div className="h-4 w-px bg-slate-200" />
            <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-tighter shadow-inner">
              {visibleSummaries.length} VALID ENTRIES
            </span>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative group flex-1 md:flex-none">
              <input
                type="text"
                placeholder="Audit Search..."
                className="w-full md:w-72 pl-11 pr-4 py-2.5 text-xs font-bold bg-white border-2 border-brand-200 focus:border-brand-400 rounded-2xl focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all placeholder:text-slate-400"
              />
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200/60 text-slate-400 hover:text-brand-primary hover:border-brand-primary/20 transition-all shadow-sm">
              <Database className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/40">
                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Employee Registry</th>
                <th className="px-4 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Weekday (1.5x)</th>
                <th className="px-4 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Night (2x)</th>
                <th className="px-4 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Weekend (2x)</th>
                <th className="px-4 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Holiday (2.5x)</th>
                <th className="px-4 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Volume</th>
                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Net Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {paginatedSummaries.length > 0 ? (
                paginatedSummaries.map((row, i) => {
                  const calcOt = getEmployeeCalculatedOt(row.id, otResult);
                  const preOtg = computePreOvertimeGross(row, importDetail?.attendancePeriodSummaries || [], workdaysConfig?.defaultMonthlyWorkdays || 30);
                  const payment = computeEmployeePayment({ ...row, ...calcOt }, otRules, monthlyWorkHours, preOtg);
                  const name = buildEmployeeName(row);
                  
                  return (
                    <motion.tr 
                      key={row.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="group hover:bg-white transition-all zebra-row"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-brand-primary border-2 border-brand-200 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-brand-900/20 transition-all">
                            {name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 group-hover:text-brand-primary transition-colors">{name}</p>
                            <p className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">Employee #{row.employeeId.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-right mono-value text-slate-500 font-bold text-sm">{calcOt.weekdayDay || '—'}</td>
                      <td className="px-4 py-5 text-right mono-value text-slate-500 font-bold text-sm">{calcOt.weekdayNight || '—'}</td>
                      <td className="px-4 py-5 text-right mono-value text-slate-500 font-bold text-sm">{calcOt.weekend || '—'}</td>
                      <td className="px-4 py-5 text-right mono-value text-slate-500 font-bold text-sm">{calcOt.holiday || '—'}</td>
                      <td className="px-4 py-5 text-right mono-value text-slate-900 font-black text-sm">{calcOt.total.toFixed(1)}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="inline-flex items-baseline gap-1.5 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-brand-primary group-hover:bg-brand-50 group-hover:border-brand-200 transition-all">
                          <span className="text-xs font-black opacity-40">ETB</span>
                          <span className="text-sm font-black mono-value tracking-tighter">
                            {payment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center opacity-25">
                      <Clock className="w-12 h-12 mb-3 text-slate-400" />
                      <p className="text-sm font-black uppercase tracking-widest">No Records Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 bg-slate-50/30 border-t border-slate-100/60 gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Audit Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200/60 text-slate-400 hover:text-brand-primary disabled:opacity-20 transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                  const p = start + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={cn(
                        "w-10 h-10 rounded-2xl text-[10px] font-black transition-all shadow-sm",
                        currentPage === p
                          ? "bg-brand-primary text-white scale-110"
                          : "bg-white text-slate-400 border border-slate-200/60 hover:text-brand-primary"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200/60 text-slate-400 hover:text-brand-primary disabled:opacity-20 transition-all shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
      
      {/* Contextual Info */}
      <div className="bg-white/40 border border-slate-200/60 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-brand-50 flex items-center justify-center text-brand-primary shrink-0 shadow-inner">
          <Fingerprint className="w-8 h-8" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Ledger Integrity Notice</h4>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed font-bold">
            Overtime calculations are derived directly from biometric authentication logs. Any deviations must be authorized by department heads and recorded in the audit trail.
          </p>
        </div>
        <div className="flex gap-4">
           <Button className="btn-secondary text-[10px] font-black px-8">Audit Logs</Button>
        </div>
      </div>
    </div>
  );
};


