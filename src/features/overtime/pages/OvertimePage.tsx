import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Settings,
  Users,
  TrendingUp,
  Calendar,
  Loader2,
  Database,
  ArrowRight,
  Eye,
  Pencil,
  Check,
  X,
  RefreshCw
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
import { overtimeRuleApi, workdaysApi } from '../../configuration/api/configurationApi';
import { AttendanceHeatmap } from '../components/AttendanceHeatmap';
import type { AttendanceImport, AttendanceMonthlySummary, ImportDetail, OtCalculationResult } from '../../attendance/types/attendance.types';
import type { OvertimeRule, WorkdaysConfig } from '../../configuration/types/configuration.types';
import { StatCardProps } from '../../../types/ui.types';
import { Skeleton } from '../../../components/ui';
import { ImportTable } from '../../attendance/components/ImportTable';

const BASE_OT_RATE = 350; // ETB per hour base rate

const otRates = [
  { label: 'Weekday OT', multiplier: '1.5x', color: 'bg-emerald-50 text-emerald-700' },
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
  const [allImports, setAllImports] = useState<AttendanceImport[]>([]);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [importsSectionOpen, setImportsSectionOpen] = useState(true);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ rate: number; calculationBase: 'BASIC' | 'GROSS'; isTaxable: boolean }>({ rate: 1.5, calculationBase: 'BASIC', isTaxable: true });
  const [savingRule, setSavingRule] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const editInputRef = useRef<HTMLInputElement>(null);
  const activeLoadRef = useRef(0);

  /** Load the latest attendance import and its OT data on mount. */
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const [importsList, rulesRes, workdaysRes] = await Promise.all([
          attendanceApi.listImports({ limit: 1000 }),
          overtimeRuleApi.getAll(),
          workdaysApi.get().catch(() => ({ data: null })),
        ]);

        if (cancelled) return;
        const imps = importsList ?? [];
        setImports(imps);
        setAllImports(imps);
        
        // Extract array from standard response format { success: true, data: [...] }
        // or fallback to the response body if it's already an array
        const rawRules = rulesRes.data?.data;
        let extractedRules: OvertimeRule[] = [];
        if (Array.isArray(rawRules)) {
          extractedRules = rawRules;
        } else if (Array.isArray(rulesRes.data?.overtimeRules)) {
          extractedRules = rulesRes.data.overtimeRules;
        } else if (Array.isArray(rulesRes.data)) {
          extractedRules = rulesRes.data;
        } else {
          console.warn('[OT Page] Could not extract OT rules from response:', {
            'rulesRes.data?.data': typeof rawRules,
            'rulesRes.data?.overtimeRules': typeof rulesRes.data?.overtimeRules,
            'rulesRes.data': typeof rulesRes.data,
          });
        }
        console.log('[OT Page] OT rules extracted:', extractedRules.length, 'rules');
        setOtRules(extractedRules);

        // Extract workdays configuration (wrapped in standard response)
        const workdaysData = workdaysRes?.data?.data ?? workdaysRes?.data ?? null;
        // Ensure numeric fields are proper numbers
        if (workdaysData && typeof workdaysData === 'object') {
          workdaysData.defaultMonthlyWorkdays = safeNum(workdaysData.defaultMonthlyWorkdays) || 26;
          workdaysData.dailyWorkingHours = safeNum(workdaysData.dailyWorkingHours) || 8;
        }
        console.log('[OT Page] Workdays config:', workdaysData);
        setWorkdaysConfig(workdaysData);

        if (imps.length > 0) {
          // Prefer the active import, otherwise fall back to the latest
          const activeImport = imps.find(i => i.isActive) ?? imps[0];
          setSelectedImport(activeImport);
          setActiveImportId(activeImport.id);

          // Load detail first, then OT separately (OT may 404 if not calculated yet)
          const detail = await attendanceApi.getImportById(activeImport.id);
          if (cancelled) return;
          setImportDetail(detail);

          try {
            const ot = await attendanceApi.getOvertimeResults(activeImport.id);
            if (!cancelled) setOtResult(ot);
          } catch {
            // No OT calculation yet — that's fine, leave otResult as null
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
  const totalPages = Math.ceil(summaries.length / pageSize);
  const paginatedSummaries = summaries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset pagination when selection changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeImportId, selectedImport]);

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
            className="mt-6 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/10"
          >
            <Database className="w-4 h-4" /> Go to Data Management
          </button>
        </div>
      </div>
    );
  }

  // ---- main content ----
  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overtime Management</h1>
          <p className="text-slate-500 text-sm">Track and calculate overtime hours and payments</p>
          {selectedImport && (
            <p className="text-xs text-slate-400 mt-1">
              Payroll period: {selectedImport.payrollPeriod?.name ?? selectedImport.periodLabel}
            </p>
          )}
        </motion.div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/data')}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2"
          >
            <Database className="w-4 h-4" /> Data Management
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCalculateOt}
            disabled={calculating}
            className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {calculating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
            {calculating ? 'Calculating…' : 'Calculate OT'}
          </motion.button>
        </div>
      </div>

      {/* Attendance Imports Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setImportsSectionOpen(!importsSectionOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Attendance Imports ({allImports.length})
          </h3>
          <div className="flex items-center gap-2">
            {activeImportId && (
              <span
                onClick={(e) => { e.stopPropagation(); setActiveImportId(null); setImportDetail(null); setOtResult(null); }}
                className="text-[11px] text-emerald-600 font-semibold hover:text-emerald-800 cursor-pointer"
              >
                Clear filter
              </span>
            )}
            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", importsSectionOpen && "rotate-180")} />
          </div>
        </button>
        {importsSectionOpen && (
          <div className="px-4 pb-4">
            <ImportTable
              imports={allImports}
              selectedImportId={activeImportId}
              onSelectImport={(imp) => {
                const id = imp.id;
                setActiveImportId(id === activeImportId ? null : id);
                setSelectedImport(imp);
                const loadId = ++activeLoadRef.current;
                attendanceApi.getImportById(id).then((detail) => {
                  if (loadId === activeLoadRef.current) {
                    setImportDetail(detail);
                  }
                  return attendanceApi.getOvertimeResults(id);
                }).then((ot) => {
                  if (loadId === activeLoadRef.current) {
                    setOtResult(ot);
                  }
                }).catch((err) => {
                  console.error('Failed to load OT data for import', id, err);
                });
              }}
              onToggleActive={(imp) => {
                attendanceApi.toggleImportActive(imp.id).then(() => {
                  attendanceApi.listImports({ limit: 1000 }).then((list) => {
                    const imps = list ?? [];
                    setImports(imps);
                    setAllImports(imps);
                    const updated = imps.find(i => i.id === imp.id);
                    if (updated) setSelectedImport(updated);
                    if (activeImportId === imp.id && updated && !updated.isActive) {
                      const nextActive = imps.find(i => i.isActive) ?? null;
                      setActiveImportId(nextActive?.id ?? null);
                      if (nextActive) {
                        setSelectedImport(nextActive);
                        attendanceApi.getImportById(nextActive.id).then(d => setImportDetail(d));
                        attendanceApi.getOvertimeResults(nextActive.id).then(ot => setOtResult(ot)).catch(() => setOtResult(null));
                      } else {
                        setImportDetail(null);
                        setOtResult(null);
                      }
                    }
                  });
                }).catch(() => {});
              }}
            />
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total OT Hours"
          value={(safeNum(totalOtHours) || 0).toFixed(1)}
          icon={Clock}
          iconColor="text-emerald-500"
        />
        <StatCard
          label="OT Cost "
          value={(safeNum(totalOtCost) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          icon={TrendingUp}
          iconColor="text-emerald-500"
          subLabel=""
        />
        <StatCard
          label="Employees with OT"
          value={safeNum(employeesWithOT)}
          icon={Users}
          iconColor="text-purple-500"
          subLabel={importDetail ? `of ${importDetail.monthlySummaries.length}` : ''}
        />
        <StatCard
          label="Avg OT/Employee"
          value={`${(safeNum(avgOtPerEmployee) || 0).toFixed(1)} hrs`}
          icon={Clock}
          iconColor="text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-8 uppercase tracking-wider">OT Hours by Category</h3>
          {otResult && otResult.byCategory.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={otResult.byCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${value} hrs`, 'Hours']}
                    labelFormatter={(label: any) => {
                      const lower = String(label).toLowerCase();
                      if (lower.includes('normal') || lower.includes('weekday')) return 'Weekday OT';
                      if (lower.includes('night')) return 'Night OT';
                      if (lower.includes('weekend')) return 'Weekend OT';
                      if (lower.includes('holiday')) return 'Holiday OT';
                      return String(label);
                    }}
                  />
                  <Bar dataKey="totalHours" name="hours" radius={[4, 4, 0, 0]} barSize={80}>
                    {otResult.byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.category)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
              No OT data available. Click "Calculate OT" to generate.
            </div>
          )}
        </div>

        {/* Configuration Column */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">OT Rate Configuration</h3>
          <div className="space-y-4">
            {otRules.length > 0 ? (
              otRules.map((rule) => {
                const label = rule.category.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                let color = 'bg-emerald-50 text-emerald-700';
                if (rule.category.includes('NIGHT')) color = 'bg-purple-50 text-purple-700';
                if (rule.category.includes('WEEKEND')) color = 'bg-blue-50 text-blue-700';
                if (rule.category.includes('HOLIDAY')) color = 'bg-amber-50 text-amber-700';

                const isEditing = editingRuleId === rule.id;
                const isSaving = savingRule === rule.id;

                const startEditing = () => {
                  if (!rule.id) return;
                  setEditForm({
                    rate: safeNum(rule.rate) || 1.5,
                    calculationBase: rule.calculationBase || 'BASIC',
                    isTaxable: rule.isTaxable !== false,
                  });
                  setEditingRuleId(rule.id);
                  setTimeout(() => editInputRef.current?.focus(), 50);
                };

                const cancelEditing = () => {
                  setEditingRuleId(null);
                };

                const saveRule = async () => {
                  if (!rule.id) return;
                  setSavingRule(rule.id);
                  try {
                    await overtimeRuleApi.update(rule.id, {
                      rate: editForm.rate,
                      calculationBase: editForm.calculationBase,
                      isTaxable: editForm.isTaxable,
                    });
                    // Refresh rules
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
                };

                const handleKeyDown = (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') saveRule();
                  if (e.key === 'Escape') cancelEditing();
                };

                return (
                  <div key={rule.id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors group">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{label}</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            ref={editInputRef}
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            value={editForm.rate}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) setEditForm(f => ({ ...f, rate: val }));
                            }}
                            onKeyDown={handleKeyDown}
                            className="w-20 px-2 py-1 text-[11px] font-black tracking-tight text-center border border-emerald-300 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <span className="text-[11px] font-black text-slate-400">x</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={cn("px-3 py-1 rounded-full text-[11px] font-black tracking-tight", color)}>
                            {safeNum(rule.rate) || 1.5}x
                          </span>
                          <button
                            onClick={startEditing}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            title="Edit rule"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => setEditForm(f => ({ ...f, calculationBase: f.calculationBase === 'GROSS' ? 'BASIC' : 'GROSS' }))}
                            className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer",
                              editForm.calculationBase === 'GROSS'
                                ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
                                : 'bg-slate-200 text-slate-600 ring-1 ring-slate-300',
                            )}
                          >
                            {editForm.calculationBase === 'GROSS' ? 'Gross' : 'Basic'}
                          </button>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.isTaxable}
                              onChange={(e) => setEditForm(f => ({ ...f, isTaxable: e.target.checked }))}
                              className="w-3 h-3 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-[10px] text-slate-500 font-medium">Taxable</span>
                          </label>
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              onClick={saveRule}
                              disabled={isSaving}
                              className="p-1 rounded-md bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                              title="Save"
                            >
                              {isSaving ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="p-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded",
                            rule.calculationBase === 'GROSS'
                              ? 'bg-violet-50 text-violet-600'
                              : 'bg-slate-100 text-slate-500',
                          )}>
                            {rule.calculationBase === 'GROSS' ? 'Gross' : 'Basic'}
                          </span>
                          {rule.isTaxable !== false && (
                            <span className="text-[10px] text-slate-400">Taxable</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-slate-400 text-sm italic">
                Loading configuration...
              </div>
            )}
          </div>
          {otRules.length > 0 && (
            <p className="mt-4 text-[10px] text-slate-400 text-center italic">
              Hover a rule card and click the pencil icon to edit inline
            </p>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Employee Overtime Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-nowrap">Employee</th>
                <th className="px-4 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Weekday</th>
                <th className="px-4 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Night</th>
                <th className="px-4 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Weekend</th>
                <th className="px-4 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Holiday</th>
                <th className="px-4 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Total Hours</th>
                <th className="px-8 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">OT Payment </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {importDetail && paginatedSummaries.length > 0 ? (
                paginatedSummaries.map((row, i) => {
                  const calcOt = getEmployeeCalculatedOt(row.id, otResult);
                  const total = calcOt.total;
                  // Compute payment using calculated OT hours
                  const tempSummary = { ...row, normalOtHours: calcOt.weekdayDay, ot1Hours: calcOt.weekdayNight, weekendOtHours: calcOt.weekend, holidayOtHours: calcOt.holiday };
                  const preOtg = computePreOvertimeGross(row, importDetail.attendancePeriodSummaries || [], workdaysConfig?.defaultMonthlyWorkdays || 30);
                  const payment = computeEmployeePayment(tempSummary, otRules, monthlyWorkHours, preOtg);
                  return (
                    <motion.tr
                      key={row.id ?? i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.8)' }}
                      className="transition-colors cursor-pointer group"
                      onClick={() => selectedImport && navigate(`/overtime/${row.employeeId}?importId=${selectedImport.id}`)}
                    >
                      <td className="px-8 py-4 font-bold text-slate-800 text-sm min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">
                            {buildEmployeeName(row)}
                          </span>
                          <Eye className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-600 text-sm">{safeNum(calcOt.weekdayDay) || 0}</td>
                      <td className="px-4 py-4 text-center text-slate-600 text-sm">{safeNum(calcOt.weekdayNight) || 0}</td>
                      <td className="px-4 py-4 text-center text-slate-600 text-sm">{safeNum(calcOt.weekend) || 0}</td>
                      <td className="px-4 py-4 text-center text-slate-600 text-sm">{safeNum(calcOt.holiday) || 0}</td>
                      <td className="px-4 py-4 text-center font-bold text-emerald-600 text-sm">{(safeNum(total) || 0).toFixed(1)}</td>
                      <td className="px-8 py-4 text-right font-bold text-emerald-700 text-sm">{(safeNum(payment) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-8 py-12 text-center text-slate-400 text-sm">
                    {importDetail ? 'No employee summaries available for this import.' : 'Load an import to see employee summaries.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Showing {Math.min(summaries.length, (currentPage - 1) * pageSize + 1)} - {Math.min(summaries.length, currentPage * pageSize)} of {summaries.length} employees
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <motion.button
                    key={page}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      currentPage === page
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/10"
                        : "text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    {page}
                  </motion.button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Alert */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm flex-shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-emerald-900 text-sm">Biometric Integration</h4>
          <p className="text-emerald-700 text-sm mt-1 leading-relaxed opacity-80">
            OT hours are automatically calculated from biometric attendance system. Manual adjustments can be made for special cases from the Employee portal.
          </p>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, iconColor, subLabel }) => (
  <motion.div
    whileHover={{ translateY: -4 }}
    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm group hover:shadow-md transition-all"
  >
    <div className="flex items-start justify-between mb-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      {subLabel && <span className="text-xs font-bold text-slate-400">{subLabel}</span>}
    </div>
  </motion.div>
);
