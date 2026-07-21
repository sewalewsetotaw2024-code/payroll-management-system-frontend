import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../../../lib/utils';
import {
  X,
  Loader2,
  AlertTriangle,
  User,
  Briefcase,
  Hash,
  Calendar,
  DollarSign,
  Percent,
} from 'lucide-react';
import { payrollRunApi } from '../api/payrollProcessingApi';
import type { PayrollRunItemDetail } from '../api/payrollProcessingApi';
/** Props for the EmployeePayrollBreakdown modal component. */
interface EmployeePayrollBreakdownProps {
  runId: string;
  itemId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * EmployeePayrollBreakdown component that displays a detailed modal breakdown
 * of a single employee's payroll calculation, including earnings, overtime,
 * deductions, pension, and net pay.
 */
export const EmployeePayrollBreakdown: React.FC<EmployeePayrollBreakdownProps> = ({
  runId,
  itemId,
  isOpen,
  onClose,
}) => {
  const [item, setItem] = useState<PayrollRunItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Fetches the full payroll breakdown for the selected employee when the modal opens. */
  useEffect(() => {
    if (!isOpen || !runId || !itemId) return;

    setLoading(true);
    setError(null);

    payrollRunApi
      .getRunItem(runId, itemId)
      .then((res) => {
        setItem(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load employee breakdown');
        setLoading(false);
      });
  }, [runId, itemId, isOpen]);

  /** Closes the modal when the Escape key is pressed. */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /**
   * Formats a numeric value as a currency string.
   * @param value - The numeric value to format.
   * @param currency - Optional currency code. Defaults to 'ETB'.
   * @returns The formatted currency string (e.g., "ETB 1,000.00") or '—' for null/undefined.
   */
  const fmt = (value: number | string | undefined | null, currency = 'ETB') => {
    if (value == null) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return formatCurrency(num, currency);
  };

  /** Formats a numeric value as a plain locale string without currency prefix. */
  const fmtNum = (value: number | string | undefined | null) => {
    if (value == null) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="glass rounded-[3rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 border-white"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="sticky top-0 glass-dark border-b border-white/10 px-8 py-6 flex items-center justify-between z-10 backdrop-blur-3xl">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Employee Breakdown</h2>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Detailed calculation view</p>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white/50 hover:text-white"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="px-8 py-8 space-y-10 bg-white/40 backdrop-blur-xl">
              {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-6">
                  <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Loading Breakdown...</p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <AlertTriangle className="w-10 h-10 text-rose-400" />
                  <p className="text-sm text-rose-600 font-medium text-center">{error}</p>
                  <button
                    onClick={() => {
                      setLoading(true);
                      setError(null);
                      payrollRunApi
                        .getRunItem(runId, itemId)
                        .then((res) => {
                          setItem(res.data.data);
                          setLoading(false);
                        })
                        .catch((err) => {
                          setError(err?.response?.data?.message || 'Failed to load');
                          setLoading(false);
                        });
                    }}
                    className="px-4 py-2 text-xs font-bold text-emerald-700 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loading && !error && item && (
                <>
                  {/* Employee Info */}
                  <div className="glass bg-white rounded-3xl p-6 border-white shadow-xl flex items-start justify-between group">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-brand-primary flex items-center justify-center text-white text-xl font-black shadow-lg shadow-brand-900/20 group-hover:scale-110 transition-transform">
                        {(item.employee?.firstName?.[0] ?? "") + (item.employee?.lastName?.[0] ?? "")}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-black text-slate-900 tracking-tight">
                          {item.employee?.firstName} {item.employee?.lastName}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.employee?.departmentName || 'Core Operations'}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">TIN: {item.employee?.tinNumber || '—'}</span>
                        </div>
                      </div>
                    </div>
                    {item.deductionCapBreached && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-2xl shadow-sm">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-[0.1em]">
                          Cap Breached
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Proration — Attendance-Based (full-period employees) */}
                  {!item.isMidMonthHire && item.proratedSalary < (item.employee?.compensation?.basicSalary ?? item.proratedSalary) && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        <h3 className="text-xs font-black text-amber-800 uppercase tracking-wider">
                          Attendance-Based Proration
                        </h3>
                      </div>
                      {(() => {
                        const contracted = item.employee?.compensation?.basicSalary ?? 0;
                        const factor = contracted > 0 ? (item.proratedSalary / contracted) : 1;
                        return (
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-[10px] font-medium text-amber-600 uppercase">Contracted Basic</p>
                              <p className="font-bold text-amber-900">{fmt(contracted)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-amber-600 uppercase">Attendance Factor</p>
                              <p className="font-bold text-amber-900">{factor.toFixed(6)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-amber-600 uppercase">Prorated Basic</p>
                              <p className="font-bold text-amber-900">{fmt(item.proratedSalary)}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Proration — Mid-Month Hire */}
                  {item.isMidMonthHire && item.payrollProration && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        <h3 className="text-xs font-black text-amber-800 uppercase tracking-wider">
                          Mid-Month Hire Proration
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] font-medium text-amber-600 uppercase">Hire Date</p>
                          <p className="font-bold text-amber-900">
                            {new Date(item.payrollProration.hireDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-amber-600 uppercase">Period</p>
                          <p className="font-bold text-amber-900">
                            {new Date(item.payrollProration.periodStart).toLocaleDateString()} -{' '}
                            {new Date(item.payrollProration.periodEnd).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-amber-600 uppercase">Days</p>
                          <p className="font-bold text-amber-900">
                            {item.payrollProration.workedDays} / {item.payrollProration.totalDays}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-amber-600 uppercase">Factor</p>
                          <p className="font-bold text-amber-900">
                            {Number(item.payrollProration.proratedFactor).toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Acting Allowance (separate section with tier breakdown) */}
                  {(() => {
                    const actingEarnings = item.payrollEarnings.filter(
                      (e) => e.earningType === 'ACTING_ALLOWANCE',
                    );
                    if (actingEarnings.length === 0) return null;
                    const breakdown = item.actingAllowanceBreakdown;
                    return (
                      <div>
                        <h3 className="text-xs font-black text-purple-800 uppercase tracking-wider mb-3">
                          Acting Allowance
                        </h3>
                        <div className="space-y-2">
                          {actingEarnings.map((earning) => (
                            <div
                              key={earning.id}
                              className="flex justify-between items-center py-2 px-3 bg-purple-50 border border-purple-100 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                                <span className="text-sm font-medium text-purple-800">
                                  {earning.label}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                                  Taxable
                                </span>
                              </div>
                              <span className="text-sm font-bold text-purple-900 font-mono">
                                {fmt(earning.amount)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Tier breakdown table */}
                        {breakdown && breakdown.tierBreakdown.length > 0 && (
                          <div className="mt-3 bg-white border border-purple-100 rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-purple-50 border-b border-purple-100">
                              <div className="flex justify-between text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                                <span>Month</span>
                                <span>Salary Diff: {fmt(breakdown.salaryDiff)}</span>
                              </div>
                            </div>
                            <div className="divide-y divide-purple-50">
                              {breakdown.tierBreakdown.map((row) => (
                                <div key={row.month} className={`flex justify-between items-center px-3 py-1.5 text-xs ${row.month === breakdown.currentMonth ? 'bg-purple-50 font-bold' : ''}`}>
                                  <span className="text-slate-600">
                                    Month {row.month}
                                    {row.month === breakdown.currentMonth && (
                                      <span className="ml-1.5 text-[9px] px-1 py-0.5 bg-purple-200 text-purple-800 rounded">CURRENT</span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-slate-400 font-mono">{row.percent}%</span>
                                    <span className="font-mono text-purple-900 w-24 text-right">{fmt(row.amount)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Earnings — with calculation formulas */}
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">
                      Earnings
                    </h3>
                    <div className="space-y-2">
                      {(() => {
                        // Compute proration factor once (shared by basic salary + all allowances)
                        const contractedBasic = item.employee?.compensation?.basicSalary ?? 0;
                        const isProrated = contractedBasic > 0 && item.proratedSalary < contractedBasic;
                        const prorationFactor = isProrated ? (item.proratedSalary / contractedBasic) : null;

                        return item.payrollEarnings
                          .filter((e) => e.earningType !== 'ACTING_ALLOWANCE' && e.earningType !== 'OVERTIME')
                          .map((earning) => {
                            const isBasic = earning.earningType === 'BASIC_SALARY';
                            const showFormula = prorationFactor !== null && prorationFactor > 0 && prorationFactor < 1;

                            // For non-basic earnings, reverse-compute the original amount
                            const originalAmount = showFormula && !isBasic
                              ? Number(earning.amount) / prorationFactor
                              : null;

                            return (
                              <div
                                key={earning.id}
                                className="py-2 px-3 bg-white border border-slate-100 rounded-lg"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-sm font-medium text-slate-700">
                                      {earning.label}
                                    </span>
                                    {!earning.isTaxable && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
                                        Non-Taxable
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-sm font-bold text-slate-900 font-mono">
                                    {fmt(earning.amount)}
                                  </span>
                                </div>
                                {/* Calculation formula */}
                                {showFormula && isBasic && (
                                  <p className="text-[11px] text-amber-600 mt-1 ml-6 font-mono">
                                    {fmt(contractedBasic)} × {prorationFactor!.toFixed(6)} = {fmt(earning.amount)}
                                  </p>
                                )}
                                {showFormula && !isBasic && originalAmount && (
                                  <p className="text-[11px] text-amber-600 mt-1 ml-6 font-mono">
                                    {fmt(originalAmount)} × {prorationFactor!.toFixed(6)} = {fmt(earning.amount)}
                                  </p>
                                )}
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </div>

                  {/* Overtime — 4 category rows + total */}
                  {item.payrollOvertime.length > 0 && (() => {
                    const categoryLabels: Record<string, string> = {
                      WEEKDAY_DAY: 'Weekday Day OT',
                      WEEKDAY_NIGHT: 'Night OT',
                      WEEKEND: 'Weekend OT',
                      PUBLIC_HOLIDAY: 'Holiday OT',
                    };
                    const categoryColors: Record<string, string> = {
                      WEEKDAY_DAY: 'text-emerald-700',
                      WEEKDAY_NIGHT: 'text-purple-700',
                      WEEKEND: 'text-blue-700',
                      PUBLIC_HOLIDAY: 'text-amber-700',
                    };
                    const categoryBg: Record<string, string> = {
                      WEEKDAY_DAY: 'bg-brand-50 border-emerald-100',
                      WEEKDAY_NIGHT: 'bg-purple-50 border-purple-100',
                      WEEKEND: 'bg-blue-50 border-blue-100',
                      PUBLIC_HOLIDAY: 'bg-amber-50 border-amber-100',
                    };
                    const totalHours = item.payrollOvertime.reduce((s, o) => s + Number(o.hours), 0);
                    const totalAmount = item.payrollOvertime.reduce((s, o) => s + Number(o.amount), 0);
                    return (
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">
                          Overtime
                        </h3>
                        <div className="space-y-2">
                          {item.payrollOvertime.map((ot) => (
                            <div
                              key={ot.id}
                              className={`py-2 px-3 border rounded-lg ${categoryBg[ot.category] ?? 'bg-slate-50 border-slate-100'}`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold ${categoryColors[ot.category] ?? 'text-slate-700'}`}>
                                    {categoryLabels[ot.category] ?? ot.category.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">{Number(ot.hours).toFixed(1)}h</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900 font-mono">{fmt(ot.amount)}</span>
                              </div>
                              <p className="text-[11px] text-amber-600 mt-1 ml-6 font-mono">
                                {fmt(ot.hourlyRate)} × {Number(ot.hours).toFixed(1)}h × {Number(ot.rate).toFixed(2)}x = {fmt(ot.amount)}
                              </p>
                            </div>
                          ))}
                          {/* Total Overtime */}
                          <div className="flex justify-between items-center py-2 px-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-indigo-900">Total Overtime</span>
                              <span className="text-[10px] text-indigo-500">{totalHours.toFixed(1)}h</span>
                            </div>
                            <span className="text-sm font-black text-slate-900 font-mono">{fmt(totalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Deductions Breakdown */}
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">
                      Deductions
                    </h3>
                    <div className="space-y-2">
                      {item.payrollDeductions.map((deduction) => {
                        const tax = deduction.deductionType === 'TAX' ? item.payrollTax : null;
                        const pension = deduction.deductionType === 'PENSION_EMPLOYEE' ? item.payrollPension : null;
                        return (
                          <div
                            key={deduction.id}
                            className="py-2 px-3 bg-white border border-slate-100 rounded-lg"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Percent className="w-3.5 h-3.5 text-rose-400" />
                                <span className="text-sm font-medium text-slate-700">
                                  {deduction.label}
                                </span>
                                {tax && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded font-medium">
                                    Rate: {(Number(tax.appliedRate) * 100).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-bold text-slate-900 font-mono">
                                {fmt(deduction.amount)}
                              </span>
                            </div>
                            {/* Tax calculation formula */}
                            {tax && (
                              <p className="text-[11px] text-rose-500 mt-1 ml-6 font-mono">
                                {fmt(tax.grossTaxableIncome)} × {(Number(tax.appliedRate) * 100).toFixed(1)}% − {fmt(tax.appliedDeduction)} = {fmt(tax.taxAmount)}
                              </p>
                            )}
                            {/* Pension calculation formula */}
                            {pension && Number(pension.baseSalary) > 0 && (
                              <p className="text-[11px] text-amber-600 mt-1 ml-6 font-mono">
                                {fmt(pension.baseSalary)} × {(Number(pension.employeeContribution) / Number(pension.baseSalary) * 100).toFixed(1)}% = {fmt(pension.employeeContribution)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pension Detail */}
                    {item.payrollPension && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex justify-between items-center py-2 px-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                          <span className="text-sm font-medium text-slate-700">
                            Pension (Employee)
                          </span>
                          <span className="text-sm font-bold text-slate-900 font-mono">
                            {fmt(item.payrollPension.employeeContribution)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                          <span className="text-sm font-medium text-slate-700">
                            Pension (Employer)
                          </span>
                          <span className="text-sm font-bold text-slate-900 font-mono">
                            {fmt(item.payrollPension.employerContribution)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Net Pay Hero */}
                  <div className="glass bg-brand-primary rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
                    <div className="relative z-10 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em] mb-2">Final Net Payable</p>
                        <p className="text-5xl font-black font-mono tracking-tighter">
                          {fmt(item.netSalary)}
                        </p>
                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-emerald-300 uppercase tracking-widest">Gross</span>
                            <span className="text-xs font-bold font-mono">{fmt(item.grossSalary)}</span>
                          </div>
                          <div className="w-px h-6 bg-white/20" />
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-rose-300 uppercase tracking-widest">Total Deductions</span>
                            <span className="text-xs font-bold font-mono">{fmt(item.totalDeductions)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
                        <DollarSign className="w-8 h-8" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
