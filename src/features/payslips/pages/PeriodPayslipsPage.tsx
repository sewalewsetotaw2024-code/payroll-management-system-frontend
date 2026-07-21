import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  FileText,
  Users,
  Calculator,
} from 'lucide-react';
import { formatCurrency, slugify } from '../../../lib/utils';
import { payrollRunApi, type PayrollRun, type PayrollRunItem } from '../../payrollProcessing/api/payrollProcessingApi';
import { payrollPeriodApi } from '../../configuration/api/configurationApi';
import type { PayrollPeriod } from '../../configuration/types/configuration.types';
import { ExpandablePayrollTable } from '../../payrollProcessing/components/ExpandablePayrollTable';

export const PeriodPayslipsPage: React.FC = () => {
  const { periodSlug } = useParams<{ periodSlug: string }>();
  const navigate = useNavigate();

  const [resolvedPeriodId, setResolvedPeriodId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [items, setItems] = useState<PayrollRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!periodSlug) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Resolve slug to period
        const allPeriodsRes = await payrollPeriodApi.getAll();
        const allPeriods = allPeriodsRes.data?.data ?? [];
        const matched = allPeriods.find((p: any) => p.name && slugify(p.name) === periodSlug);

        if (!matched?.id) {
          if (!cancelled) { setError("Period not found"); setLoading(false); }
          return;
        }

        const periodId = matched.id;
        setResolvedPeriodId(periodId);

        const [periodRes, runsRes] = await Promise.all([
          payrollPeriodApi.getById(periodId),
          payrollRunApi.getRuns({ payrollPeriodId: periodId, limit: 1, _t: Date.now() }),
        ]);
        if (cancelled) return;

        setPeriod(periodRes.data?.data ?? null);

        const runs: PayrollRun[] = runsRes.data?.data ?? [];
        const latestRun = runs[0] ?? null;
        setRun(latestRun);

        if (latestRun) {
          const itemsRes = await payrollRunApi.getRunItems(latestRun.id, { page: 1, limit: 1000 });
          if (!cancelled) {
            setItems(itemsRes.data?.data ?? []);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load payroll data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [periodSlug]);

  const handleSelectItem = useCallback(
    (runId: string, itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (item?.employee) {
        const empSlug = slugify(`${item.employee.firstName} ${item.employee.lastName}`);
        navigate(`/payslips/${periodSlug}/employees/${empSlug}?employeeId=${item.employee.id}`);
      }
    },
    [navigate, periodSlug, items],
  );

  // ── Compute summary stats ─────────────────────────────────
  const totalEmployees = items.length;
  const totalNetPay = items.reduce((s, i) => s + Number(i.netSalary ?? 0), 0);

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-6 pb-20 px-4 md:px-5">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-brand-800 rounded-2xl p-6 sm:p-8 text-white">
          <div className="absolute -top-1/2 -right-10 w-72 h-72 rounded-full bg-white/5" />
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-white/20 rounded-lg w-24" />
            <div className="h-7 bg-white/20 rounded-lg w-48" />
            <div className="h-4 bg-white/20 rounded-lg w-64" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 animate-pulse rounded w-1/4" />
                  <div className="h-3 bg-slate-100 animate-pulse rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-6 pb-20 px-4 md:px-5">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-brand-800 rounded-2xl p-6 sm:p-8 text-white">
          <button onClick={() => navigate('/payslips')} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white/80 border border-white/20 rounded-lg hover:bg-white/10 transition-colors cursor-pointer mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Periods
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Payslips</h1>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load payroll data</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-brand-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Empty (no run yet) ────────────────────────────────────
  if (!run) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-6 pb-20 px-4 md:px-5">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-brand-800 rounded-2xl p-6 sm:p-8 text-white">
          <button onClick={() => navigate('/payslips')} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white/80 border border-white/20 rounded-lg hover:bg-white/10 transition-colors cursor-pointer mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Periods
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Payslips</h1>
          <p className="text-sm text-emerald-100/80 mt-1">
            {period?.name ?? 'Payroll Period'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Payroll Not Yet Processed</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            This period has not been processed yet. Payslips will appear here once the payroll run is complete.
          </p>
        </div>
      </div>
    );
  }

  // ── Main content ──────────────────────────────────────────
  const periodName = period?.name ?? 'Payroll Period';
  const dateRange = period?.startDate && period?.endDate
    ? `${new Date(period.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${new Date(period.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20 px-4 md:px-5">
      {/* Green Gradient Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-brand-800 rounded-2xl p-6 sm:p-8 text-white">
        <div className="absolute -top-1/2 -right-10 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-1/2 right-20 w-48 h-48 rounded-full bg-white/3" />

        <div className="relative z-10">
          <button
            onClick={() => navigate('/payslips')}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white/80 border border-white/20 rounded-lg hover:bg-white/10 transition-colors cursor-pointer mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Periods
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">
                {periodName}
              </h1>
              <p className="text-sm text-emerald-100/80">
                {dateRange}
              </p>
            </div>

            {/* Summary stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                <Users className="w-4 h-4 text-emerald-200" />
                <span className="text-sm font-semibold">{totalEmployees} employee{totalEmployees !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                <Calculator className="w-4 h-4 text-emerald-200" />
                <span className="text-sm font-semibold">{formatCurrency(totalNetPay)} net pay</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee table */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No employees found</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            No payroll records were found for this period.
          </p>
        </div>
      ) : (
        <ExpandablePayrollTable
          items={items}
          runId={run.id}
          loading={false}
          onSelectItem={handleSelectItem}
        />
      )}
    </div>
  );
};
