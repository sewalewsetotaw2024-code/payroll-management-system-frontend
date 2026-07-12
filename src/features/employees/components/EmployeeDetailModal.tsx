import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Briefcase,
  Mail,
  Calendar,
  Building,
  IdCard,
  DollarSign,
  PiggyBank,
  Car,
  Phone,
  Home,
  Utensils,
  UserCog,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { actingAllowanceApi } from '../../actingAllowance/api/actingAllowanceApi';
import type { ActingAssignment } from '../../actingAllowance/types/actingAllowance.types';
import { leaveApi } from '../../leave/api/leaveApi';
import type { PayrollLeaveItem } from '../../leave/types/leave.types';
import { deductionApi, employeeDeductionApi } from '../../configuration/api/configurationApi';
import type { DeductionConfig } from '../../configuration/types/configuration.types';
import { Input, Select } from '../../../components/ui';
import { toast } from '../../../components/ui/Toast';

/**
 * Employee data shape used within the detail modal.
 */
interface ModalEmployee {
  id: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  gender?: string;
  tinNumber?: string;
  pensionNumber?: string;
  jobPosition?: string;
  departmentName?: string;
  employmentType?: string;
  managerName?: string;
  hireDate?: string;
  probationEndDate?: string;
  employmentEndDate?: string;
  placeOfWork?: string;
  contractReference?: string;
  status: string;
  currency?: string;
  basicSalary?: number;
  grossSalary?: number;
  taxableRemuneration?: number;
  transportationAllowance?: number;
  telephoneAllowance?: number;
  representationAllowance?: number;
  housingAllowance?: number;
  mealAllowance?: number;
  otherPayments?: number;
  costSharingBalance?: number;
  bankAccountNumber?: string;
  isPensionEligible?: boolean;
  isTaxExempt?: boolean;
  syncedAt?: string;
  employeeDeductions?: Array<{
    id: string;
    deductionType: string;
    label: string;
    calculationType: string;
    amount?: number | string;
    percent?: number | string;
    paymentPlan?: {
        totalAmount: number | string;
        paidAmount: number | string;
        remaining?: number | string;
        paidInstallments: number;
        numInstallments?: number;
    } | null;
  }>;
}

/**
 * Props for the EmployeeDetailModal component.
 */
interface EmployeeDetailModalProps {
  employee: ModalEmployee | null;
  loading?: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onEdit?: (employee: ModalEmployee) => void;
}

/**
 * EmployeeDetailModal component that displays a full-screen modal with detailed employee
 * information, including personal details, salary breakdown, allowances, tax and pension status.
 * Features an animated entrance/exit with backdrop blur.
 */
export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ employee, loading, onClose, onRefresh, onEdit }) => {
  if (!employee) return null;

  const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown';
  const initials = `${(employee.firstName || '')[0] || ''}${(employee.lastName || '')[0] || ''}` || '?';
  const currency = employee.currency || 'ETB';

  // ── Acting Allowances ──────────────────────────────────────
  /** Acting assignments fetched for the current employee. */
  const [actingAssignments, setActingAssignments] = useState<ActingAssignment[]>([]);
  /** Whether the acting assignments API call is in flight. */
  const [loadingActing, setLoadingActing] = useState(false);

  /** Fetch acting assignments for the employee on modal open. */
  useEffect(() => {
    if (!employee?.id) return;
    setLoadingActing(true);
    actingAllowanceApi
      .listAssignments({ employeeId: employee.id })
      .then((data) => setActingAssignments(data))
      .catch(() => setActingAssignments([]))
      .finally(() => setLoadingActing(false));
  }, [employee?.id]);

  // ── Leave Items ────────────────────────────────────────────
  /** PayrollLeaveItem records fetched for the current employee. */
  const [leaveItems, setLeaveItems] = useState<PayrollLeaveItem[]>([]);
  /** Whether the leave items API call is in flight. */
  const [loadingLeave, setLoadingLeave] = useState(false);

  /** Fetch leave items for the employee on modal open. */
  useEffect(() => {
    if (!employee?.id) return;
    setLoadingLeave(true);
    leaveApi
      .getEmployeeLeaveItems(employee.id)
      .then((data) => setLeaveItems(data))
      .catch(() => setLeaveItems([]))
      .finally(() => setLoadingLeave(false));
  }, [employee?.id]);

  /** Total deduction from unpaid leave items. */
  const totalLeaveDeduction = leaveItems.reduce(
    (sum, item) => sum + Number(item.deductionAmount),
    0,
  );

  /** Filter to only show ACTIVE assignments in the detail modal. */
  const activeActing = useMemo(
    () => actingAssignments.filter((a) => a.status === 'ACTIVE'),
    [actingAssignments]
  );

  // ── Add Deduction State ─────────────────────────────────────
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [configs, setConfigs] = useState<DeductionConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [deductionAmount, setDeductionAmount] = useState<number | ''>('');
  const [numInstallments, setNumInstallments] = useState<number | ''>('');
  const [isSavingDeduction, setIsSavingDeduction] = useState(false);

  useEffect(() => {
    if (showAddDeduction) {
      deductionApi.getAll({ page: 1, limit: 100 }).then(res => {
        const data = (res.data as any)?.data || res.data || [];
        setConfigs(Array.isArray(data) ? data : []);
      }).catch(() => setConfigs([]));
    }
  }, [showAddDeduction]);

  const handleAddDeduction = async () => {
    if (!employee?.id || !selectedConfigId) return;
    const config = configs.find(c => c.id === selectedConfigId);
    if (!config) return;

    setIsSavingDeduction(true);
    try {
      await employeeDeductionApi.create({
        employeeId: employee.id,
        deductionItemId: config.id,
        deductionType: config.deductionType,
        label: config.label,
        calculationType: config.calculationType || 'FIXED_AMOUNT',
        amount: deductionAmount || undefined,
        totalAmount: deductionAmount || undefined,
        numInstallments: numInstallments || undefined,
      });
      toast.success('Deduction added successfully');
      setShowAddDeduction(false);
      setSelectedConfigId('');
      setDeductionAmount('');
      setNumInstallments('');
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add deduction');
    } finally {
      setIsSavingDeduction(false);
    }
  };

  /** Safely coerce a value to number (handles Prisma Decimal strings). */
  const toNum = (v: any): number | null => (v == null || v === '' ? null : Number(v));
  /** Format a number with thousand separators and currency suffix. */
  const formatCurrency = (amount: any) => {
    const n = toNum(amount);
    if (n == null) return '-';
    return `${n.toLocaleString()} ${currency}`;
  };

  /** Coerce to number, defaulting to 0 for null/undefined/NaN. */
  const t = (v: any) => Number(v) || 0;

  // Collect all allowances (only those with non-zero amounts)
  const allowances: { name: string; amount: number; label: string }[] = [];
  const transAmt = t(employee.transportationAllowance);
  const housAmt = t(employee.housingAllowance);
  const mealAmt = t(employee.mealAllowance);
  const telAmt = t(employee.telephoneAllowance);
  const repAmt = t(employee.representationAllowance);
  const otherAmt = t(employee.otherPayments);
  if (transAmt > 0) allowances.push({ name: 'Transport', amount: transAmt, label: 'Transport Allowance' });
  if (housAmt > 0) allowances.push({ name: 'Housing', amount: housAmt, label: 'Housing Allowance' });
  if (mealAmt > 0) allowances.push({ name: 'Meal', amount: mealAmt, label: 'Meal Allowance' });
  if (telAmt > 0) allowances.push({ name: 'Telephone', amount: telAmt, label: 'Telephone Allowance' });
  if (repAmt > 0) allowances.push({ name: 'Representation', amount: repAmt, label: 'Representation Allowance' });
  if (otherAmt > 0) allowances.push({ name: 'Other', amount: otherAmt, label: 'Other Payments' });

  const allowanceMeta: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    Transport: { icon: <Car className="w-4 h-4" />, color: 'text-sky-600', bg: 'bg-sky-50' },
    Housing: { icon: <Home className="w-4 h-4" />, color: 'text-violet-600', bg: 'bg-violet-50' },
    Meal: { icon: <Utensils className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50' },
    Telephone: { icon: <Phone className="w-4 h-4" />, color: 'text-teal-600', bg: 'bg-teal-50' },
    Representation: { icon: <UserCog className="w-4 h-4" />, color: 'text-rose-600', bg: 'bg-rose-50' },
    Other: { icon: <Plus className="w-4 h-4" />, color: 'text-slate-600', bg: 'bg-slate-50' },
  };

  /** Sum of all regular allowances (transport, housing, meal, etc.) */
  const totalAllowances = allowances.reduce((acc, a) => acc + a.amount, 0);
  /** Sum of acting position salaries for all active assignments. */
  const totalActingSalary = activeActing.reduce((sum, a) => sum + Number(a.actingPositionSalary), 0);

  // ── Salary arithmetic with explicit Number() coercion ──────
  // Prisma Decimal fields are serialised as JSON strings by the API.
  // All arithmetic uses explicit Number() to avoid string concatenation.
  const empBasic = Number(employee.basicSalary) || 0;
  const empGross = Number(employee.grossSalary) || 0;
  const empTaxable = Number(employee.taxableRemuneration) || 0;

  /** Gross remuneration including acting allowance. Falls back to basic + allowances if gross is null. */
  const displayGross = employee.grossSalary != null
    ? empGross + totalActingSalary
    : employee.basicSalary != null
      ? empBasic + totalAllowances + totalActingSalary
      : null;

  /** Taxable remuneration including acting allowance. Null if taxableRemuneration is not set. */
  const displayTaxable = employee.taxableRemuneration != null
    ? empTaxable + totalActingSalary
    : null;

  return (
    <AnimatePresence>
      {employee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-700 to-emerald-900 text-white relative">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.04] blur-[80px] rounded-full"></div>
              <div className="flex items-center gap-4 z-10">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl font-black shadow-inner border border-white/5">
                  {initials}
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">{fullName}</h3>
                  <p className="text-emerald-100/80 font-medium text-[12px] tracking-wide uppercase mt-0.5">
                    {employee.externalId && `ID: ${employee.externalId}`}
                    {employee.externalId && employee.departmentName && <span className="mx-2 opacity-30">|</span>}
                    {employee.departmentName && employee.departmentName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90 z-10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                {/* Employee Info */}
                <div className="space-y-6">
                  {employee.jobPosition && (
                    <DetailItem icon={<Briefcase />} label="Position" value={employee.jobPosition} />
                  )}
                  {employee.departmentName && (
                    <DetailItem icon={<Building />} label="Department" value={employee.departmentName} />
                  )}
                  {employee.email && (
                    <DetailItem icon={<Mail />} label="Email Address" value={employee.email} />
                  )}
                  {employee.employmentType && (
                    <DetailItem icon={<Calendar />} label="Employment Type" value={employee.employmentType} />
                  )}
                  {employee.managerName && (
                    <DetailItem icon={<Briefcase />} label="Manager" value={employee.managerName} />
                  )}
                  {employee.gender && (
                    <DetailItem icon={<IdCard />} label="Gender" value={employee.gender} />
                  )}
                  {employee.placeOfWork && (
                    <DetailItem icon={<Building />} label="Place of Work" value={employee.placeOfWork} />
                  )}
                  {employee.hireDate && (
                    <DetailItem
                      icon={<Calendar />}
                      label="Start Date"
                      value={new Date(employee.hireDate).toLocaleDateString()}
                    />
                  )}
                  {employee.probationEndDate && (
                    <DetailItem
                      icon={<Calendar />}
                      label="Probation End"
                      value={new Date(employee.probationEndDate).toLocaleDateString()}
                    />
                  )}
                  {employee.employmentEndDate && (
                    <DetailItem
                      icon={<Calendar />}
                      label="End Date"
                      value={new Date(employee.employmentEndDate).toLocaleDateString()}
                    />
                  )}
                  {employee.contractReference && (
                    <DetailItem icon={<IdCard />} label="Contract Ref" value={employee.contractReference} />
                  )}
                  {employee.tinNumber && (
                    <DetailItem icon={<IdCard />} label="TIN Number" value={employee.tinNumber} />
                  )}
                  {employee.pensionNumber && (
                    <DetailItem icon={<IdCard />} label="Pension Number" value={employee.pensionNumber} />
                  )}
                  {employee.status && (
                    <DetailItem
                      icon={<IdCard />}
                      label="Status"
                      value={employee.status.charAt(0).toUpperCase() + employee.status.slice(1).toLowerCase()}
                    />
                  )}
                </div>

                {/* Salary & Allowances Breakdown */}
                <div className="space-y-5">
                  {/* Gross Total Hero */}
                  {displayGross != null && (
                    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
                      <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
                      <div className="p-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Remuneration</p>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(displayGross)}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                          {employee.basicSalary != null && (
                            <span>Basic: <span className="font-bold text-slate-700">{formatCurrency(employee.basicSalary)}</span></span>
                          )}
                          {totalAllowances > 0 && (
                            <span>Allowances: <span className="font-bold text-emerald-600">+{formatCurrency(totalAllowances)}</span></span>
                          )}
                          {totalActingSalary > 0 && (
                            <span>Acting: <span className="font-bold text-amber-600">+{formatCurrency(totalActingSalary)}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Basic Salary Card */}
                  {employee.basicSalary != null && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Basic Salary</p>
                            <p className="font-black text-lg text-slate-900">{formatCurrency(employee.basicSalary)}</p>
                          </div>
                        </div>
                        {displayTaxable != null && (
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxable</p>
                            <p className="font-black text-sm text-slate-700">{formatCurrency(displayTaxable)}</p>
                            {totalActingSalary > 0 && (
                              <p className="text-[9px] text-amber-500 font-bold uppercase mt-0.5">incl. acting</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Allowances Section */}
                  {allowances.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                        Allowances ({allowances.length})
                      </h4>
                      <div className="grid gap-2.5">
                        {allowances.map((a, i) => {
                          const meta = allowanceMeta[a.name] || allowanceMeta.Other;
                          return (
                            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center justify-between group hover:border-slate-200 transition-colors">
                              <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center`}>
                                    {React.cloneElement(meta.icon as any, { className: `w-4 h-4 ${meta.color}` })}
                                  </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{a.label}</p>
                                </div>
                              </div>
                              <p className={`font-black text-sm ${meta.color}`}>+{formatCurrency(a.amount)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cost Sharing */}
                  {employee.costSharingBalance != null && employee.costSharingBalance > 0 && (
                    <div className="bg-rose-50/50 rounded-2xl border border-rose-100 p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Cost Sharing Balance</p>
                          <p className="font-black text-sm text-rose-700">{formatCurrency(employee.costSharingBalance)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Acting Allowances */}
              {(loadingActing || activeActing.length > 0) && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Acting Allowances {!loadingActing && <span className="font-normal text-slate-300">({activeActing.length})</span>}
                  </h4>
                  {loadingActing ? (
                    <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                        <div className="h-4 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Position</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Salary</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">From</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">To</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {activeActing.map((a) => {
                            const statusColor: Record<string, string> = {
                              ACTIVE: 'bg-emerald-100 text-emerald-700',
                              COMPLETED: 'bg-blue-100 text-blue-700',
                              CANCELLED: 'bg-red-100 text-red-700',
                              EXPIRED: 'bg-amber-100 text-amber-700',
                            };
                            return (
                              <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3.5">
                                  <span className="text-sm font-bold text-slate-800">
                                    {a.actingPosition?.title ?? '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800 text-sm whitespace-nowrap">
                                  {formatCurrency(Number(a.actingPositionSalary))}
                                </td>
                                <td className="px-4 py-3.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">
                                  {a.startDate.split('T')[0]}
                                </td>
                                <td className="px-4 py-3.5 text-center text-xs text-slate-500 font-mono whitespace-nowrap">
                                  {a.expectedEndDate?.split('T')[0] ?? '—'}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor[a.status] || 'bg-slate-100 text-slate-600'}`}>
                                    {a.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {activeActing.length > 1 && (
                        <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">
                            Total:{' '}
                            <span className="font-black text-slate-800 font-mono">
                              {formatCurrency(activeActing.reduce((s, a) => s + Number(a.actingPositionSalary), 0))}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Leave Deductions */}
              {(loadingLeave || leaveItems.length > 0) && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Leave Deductions {!loadingLeave && <span className="font-normal text-slate-300">({leaveItems.length})</span>}
                  </h4>
                  {loadingLeave ? (
                    <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                        <div className="h-4 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Leave Type</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Days</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Deduction</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {leaveItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-3.5">
                                <span className="text-sm font-bold text-slate-800">{item.leaveType}</span>
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800 text-sm">
                                {item.leaveDaysInPeriod}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    item.isPaid
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}
                                >
                                  {item.isPaid ? 'Paid' : 'Unpaid'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono font-bold text-sm whitespace-nowrap">
                                {item.deductionAmount > 0 ? (
                                  <span className="text-rose-600">-{formatCurrency(item.deductionAmount)}</span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                                {item.payrollPeriod?.name ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {totalLeaveDeduction > 0 && (
                        <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">
                            Total Deduction:{' '}
                            <span className="font-black text-rose-600 font-mono">
                              {formatCurrency(totalLeaveDeduction)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Regular Deductions */}
              {(employee.employeeDeductions && employee.employeeDeductions.length > 0) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <PiggyBank className="w-4 h-4" />
                      Recurring Deductions <span className="font-normal text-slate-300">({employee.employeeDeductions.length})</span>
                    </h4>
                    <button
                      onClick={() => setShowAddDeduction(!showAddDeduction)}
                      className="p-1 px-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                      {showAddDeduction ? 'Cancel' : 'Add New'}
                    </button>
                  </div>

                  {showAddDeduction && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-[1.5rem] p-5 space-y-4 animate-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-4">
                        <Select
                          label="Deduction Type"
                          value={selectedConfigId}
                          onChange={(e) => setSelectedConfigId(e.target.value)}
                          options={[
                            { value: '', label: 'Select template...' },
                            ...configs.map(c => ({ value: c.id!, label: c.label }))
                          ]}
                          className="bg-white"
                        />
                        <Input
                          label="Total Amount"
                          type="number"
                          value={deductionAmount}
                          onChange={(e) => setDeductionAmount(e.target.value ? Number(e.target.value) : '')}
                          placeholder="0.00"
                          className="bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Installments"
                          type="number"
                          value={numInstallments}
                          onChange={(e) => setNumInstallments(e.target.value ? Number(e.target.value) : '')}
                          placeholder="1"
                          className="bg-white"
                          helperText="Use 1 for one-time recovery"
                        />
                        <div className="flex items-end">
                          <button
                            onClick={handleAddDeduction}
                            disabled={isSavingDeduction || !selectedConfigId}
                            className="w-full h-11 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-900/10 active:scale-95"
                          >
                            {isSavingDeduction ? 'Saving...' : 'Add Deduction'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="bg-white border border-slate-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Paid / Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {employee.employeeDeductions.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3.5">
                              <span className="text-sm font-bold text-slate-800">{d.label || d.deductionType}</span>
                            </td>
                            <td className="px-4 py-3.5 italic text-xs text-slate-500">
                              {d.calculationType === 'PERCENTAGE' ? `${d.percent}% of basis` : 'Fixed Amount'}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-600 text-sm">
                              -{formatCurrency(d.amount)}
                            </td>
                            <td className="px-4 py-3.5 text-right text-xs text-slate-500 font-mono">
                              {d.paymentPlan ? (
                                <span>
                                  {formatCurrency(d.paymentPlan.paidAmount)} / {formatCurrency(d.paymentPlan.totalAmount)}
                                  <div className="text-[10px] text-slate-400">Inst: {d.paymentPlan.paidInstallments}/{d.paymentPlan.numInstallments || '?'}</div>
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  {employee.bankAccountNumber && (
                    <div className="p-6 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Bank Account</p>
                      <p className="font-black text-slate-900 text-sm font-mono">{employee.bankAccountNumber}</p>
                    </div>
                  )}
                  {displayTaxable != null && (
                    <div className="p-6 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Taxable Remuneration</p>
                      <p className="font-black text-slate-900 text-sm">{formatCurrency(displayTaxable)}</p>
                      {totalActingSalary > 0 && (
                        <p className="text-[9px] text-amber-500 font-bold uppercase mt-0.5">incl. acting allowance</p>
                      )}
                    </div>
                  )}
                  {employee.otherPayments != null && employee.otherPayments > 0 && (
                    <div className="p-6 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Other Payments</p>
                      <p className="font-black text-slate-900 text-sm">{formatCurrency(employee.otherPayments)}</p>
                    </div>
                  )}
                  {employee.syncedAt && (
                    <div className="p-6 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Last Synced</p>
                      <p className="font-black text-slate-900 text-sm">{new Date(employee.syncedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tax & Pension */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tax & Pension Status</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="w-4 h-4 text-emerald-600" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pension Eligible</p>
                    </div>
                    <p
                      className={`font-black text-sm mt-2 ${
                        employee.isPensionEligible !== false ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {employee.isPensionEligible !== false ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div className="p-6 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-600" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Exempt</p>
                    </div>
                    <p
                      className={`font-black text-sm mt-2 ${
                        employee.isTaxExempt ? 'text-amber-600' : 'text-slate-400'
                      }`}
                    >
                      {employee.isTaxExempt ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button
                onClick={onClose}
                className="cursor-pointer px-6 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                Close View
              </button>
              {onEdit && (
                <button
                  onClick={() => onEdit(employee)}
                  className="cursor-pointer px-6 py-2.5 bg-[#047857] text-white font-bold rounded-xl hover:bg-[#036246] transition-all shadow-lg shadow-emerald-900/10 active:scale-95"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * DetailItem component that renders a single detail row with an icon, label, and value.
 *
 * @param icon - The icon element for the row.
 * @param label - The field label.
 * @param value - The field value to display.
 */
const DetailItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-4">
    <div className="w-10 h-10 rounded-2xl bg-slate-100/80 flex items-center justify-center text-slate-400 shrink-0 border border-slate-50">
      {React.cloneElement(icon as any, { className: 'w-5 h-5' })}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1.5">{label}</p>
      <p className="text-[15px] font-bold text-slate-800 truncate">{value}</p>
    </div>
  </div>
);
