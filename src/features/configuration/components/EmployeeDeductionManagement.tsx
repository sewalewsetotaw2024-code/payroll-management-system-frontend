import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Wallet,
  Receipt,
  Percent,
  RefreshCw,
  ChevronDown,
  Eye,
  Banknote,
  Tag,
  Settings,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Modal, Input, Select, Button, Pagination } from '../../../components/ui';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection, ConfigEmptyState, ConfigModalFooter } from './shared';
import { toast } from '../../../components/ui/Toast';
import {
  CALCULATION_TYPE_OPTIONS,
  STATUS_OPTIONS,
  STATUS_BADGE,
  DEDUCTION_TYPE_META,
  emptyDeductionForm,
} from '../constants';
import type {
  EmployeeDeduction,
  DeductionConfig,
  DeductionCalculationType,
  EmployeeDeductionStatus,
} from '../types/configuration.types';
import { employeeApi, employeeDeductionApi, deductionApi } from '../api/configurationApi';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  jobPosition?: string;
  departmentName?: string;
  basicSalary?: number;
  currency?: string;
}

interface EmployeeDetail extends Employee {
  deduction?: EmployeeDeduction;
}

/**
 * EmployeeDeductionManagement component for managing per-employee deduction assignments.
 * Supports viewing deduction type cards with employee counts, bulk assigning deductions,
 * and individual add/edit/cancel operations on employee deductions.
 */
export const EmployeeDeductionManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── Data State ──────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [deductionTemplates, setDeductionTemplates] = useState<DeductionConfig[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // All employee deductions keyed by deductionItemId
  const [allDeductions, setAllDeductions] = useState<EmployeeDeduction[]>([]);
  const [allDeductionsLoading, setAllDeductionsLoading] = useState(false);

  // ─── Card detail page navigation ────────────────────────

  // ─── Modal State ─────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editDeduction, setEditDeduction] = useState<EmployeeDeduction | null>(null);
  const [activeCardEmployee, setActiveCardEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyDeductionForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Bulk-assign modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkConfig, setBulkConfig] = useState<DeductionConfig | null>(null);
  const [bulkEmployees, setBulkEmployees] = useState<Employee[]>([]);
  const [bulkEmployeesLoading, setBulkEmployeesLoading] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(new Set());
  const [bulkEmployeeValues, setBulkEmployeeValues] = useState<Record<string, { amount?: number | null; percent?: number | null }>>({});
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Template search
  const [templateSearch, setTemplateSearch] = useState('');

  // ─── Load data ───────────────────────────────────────────
  useEffect(() => {
    loadEmployees();
    loadDeductionTemplates();
    loadAllDeductions();
  }, []);

  const loadEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const response = await employeeApi.getAll({ status: 'ACTIVE', page: 1, limit: 1000 });
      const body = response.data as any;
      const data = body?.data || [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const loadDeductionTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await deductionApi.getAll({ page: 1, limit: 100 });
      const data = (response.data as any)?.data || response.data || [];
      setDeductionTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load deduction templates:', error);
      setDeductionTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadAllDeductions = async () => {
    setAllDeductionsLoading(true);
    try {
      const response = await employeeDeductionApi.getAll({ page: 1, limit: 1000 });
      const body = response.data as any;
      const data = body?.data || [];
      setAllDeductions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load deductions:', error);
      setAllDeductions([]);
    } finally {
      setAllDeductionsLoading(false);
    }
  };

  // ─── Derived data ────────────────────────────────────────

  // Compute card metadata: count and total monthly amount per config
  const cardMeta = useMemo(() => {
    const map = new Map<string, { count: number; totalMonthly: number; activeCount: number }>();
    for (const ded of allDeductions) {
      const key = ded.deductionItemId || ded.deductionType;
      if (!key) continue;
      const existing = map.get(key) || { count: 0, totalMonthly: 0, activeCount: 0 };
      existing.count++;
      if (ded.status === 'ACTIVE') {
        existing.activeCount++;
        // Estimate monthly amount (Prisma Decimal arrives as string → parse with Number)
        let monthly = 0;
        if (ded.calculationType === 'FIXED_AMOUNT') {
          monthly = Number(ded.amount || 0);
        } else if (ded.calculationType === 'REMAINING_BALANCE' && ded.paymentPlan?.totalAmount && ded.paymentPlan?.numInstallments) {
          monthly = Number(ded.paymentPlan.totalAmount) / ded.paymentPlan.numInstallments;
        } else if (ded.calculationType === 'PERCENTAGE_OF_BASIC' && ded.employee?.basicSalary && ded.percent) {
          monthly = (Number(ded.employee.basicSalary) * Number(ded.percent)) / 100;
        } else if (ded.calculationType === 'PERCENTAGE_OF_GROSS' && ded.employee?.grossSalary && ded.percent) {
          monthly = (Number(ded.employee.grossSalary) * Number(ded.percent)) / 100;
        }
        existing.totalMonthly += monthly;
      }
      map.set(key, existing);
    }
    return map;
  }, [allDeductions]);

  const totalActiveDeductions = useMemo(
    () => allDeductions.filter((d) => d.status === 'ACTIVE').length,
    [allDeductions],
  );

  const totalMonthlyAll = useMemo(
    () => allDeductions
      .filter((d) => d.status === 'ACTIVE')
      .reduce((sum, d) => {
        let m = 0;
        if (d.calculationType === 'FIXED_AMOUNT') {
          m = Number(d.amount || 0);
        } else if (d.calculationType === 'REMAINING_BALANCE' && d.paymentPlan?.totalAmount && d.paymentPlan?.numInstallments) {
          m = Number(d.paymentPlan.totalAmount) / d.paymentPlan.numInstallments;
        } else if (d.calculationType === 'PERCENTAGE_OF_BASIC' && d.employee?.basicSalary && d.percent) {
          m = (Number(d.employee.basicSalary) * Number(d.percent)) / 100;
        } else if (d.calculationType === 'PERCENTAGE_OF_GROSS' && d.employee?.grossSalary && d.percent) {
          m = (Number(d.employee.grossSalary) * Number(d.percent)) / 100;
        }
        return sum + m;
      }, 0),
    [allDeductions],
  );

  // Active configs with employee counts
  const configsWithCount = useMemo(
    () => deductionTemplates.map((cfg) => {
      const key = cfg.id || cfg.deductionType;
      const meta = cardMeta.get(key!) || { count: 0, totalMonthly: 0, activeCount: 0 };
      return { ...cfg, employeeCount: meta.count, activeCount: meta.activeCount, totalMonthly: meta.totalMonthly };
    }),
    [deductionTemplates, cardMeta],
  );

  // Search filter for templates
  const filteredConfigs = useMemo(() => {
    if (!templateSearch.trim()) return configsWithCount;
    const s = templateSearch.toLowerCase();
    return configsWithCount.filter(
      (c) =>
        c.label.toLowerCase().includes(s) ||
        c.deductionType.toLowerCase().includes(s),
    );
  }, [configsWithCount, templateSearch]);

  // ─── Handlers ────────────────────────────────────────────

  const getEmployeeName = (employeeId: string, emp?: any) => {
    if (emp?.firstName) return `${emp.firstName} ${emp.lastName}`;
    const found = employees.find((e) => e.id === employeeId);
    return found ? `${found.firstName} ${found.lastName}` : employeeId.slice(0, 8);
  };

  const openAddDeduction = (config: DeductionConfig, employee?: Employee) => {
    setEditDeduction(null);
    setActiveCardEmployee(employee || null);
    setForm({
      ...emptyDeductionForm,
      employeeId: employee?.id || '',
      deductionType: config.deductionType,
      label: config.label || '',
      calculationType: config.calculationType || 'FIXED_AMOUNT',
      amount: config.amount ?? null,
      percent: config.percent ?? null,
      deductionItemId: config.id,
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditDeduction = (deduction: EmployeeDeduction) => {
    setEditDeduction(deduction);
    setActiveCardEmployee(null);
    setForm({
      employeeId: deduction.employeeId,
      deductionType: deduction.deductionType,
      label: deduction.label,
      calculationType: deduction.calculationType,
      deductionItemId: deduction.deductionItemId,
      amount: deduction.amount ?? null,
      percent: deduction.percent ?? null,
      totalAmount: deduction.paymentPlan?.totalAmount ?? null,
      numInstallments: deduction.paymentPlan?.numInstallments ?? null,
      refNo: deduction.refNo || '',
      description: deduction.description || '',
      priority: deduction.priority || 0,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveDeduction = async () => {
    if (!form.label.trim()) {
      setFormError('Label is required');
      return;
    }
    if (form.calculationType === 'FIXED_AMOUNT' && (form.amount == null || form.amount < 0)) {
      setFormError('Amount must be >= 0 for Fixed Amount calculation');
      return;
    }
    if (
      (form.calculationType === 'PERCENTAGE_OF_BASIC' || form.calculationType === 'PERCENTAGE_OF_GROSS') &&
      (form.percent == null || form.percent < 0 || form.percent > 100)
    ) {
      setFormError('Percent must be 0-100 for percentage calculations');
      return;
    }

    setFormError('');
    setSaving(true);

    try {
      const payload = {
        employeeId: form.employeeId,
        deductionType: form.deductionType,
        label: form.label.trim(),
        calculationType: form.calculationType,
        deductionItemId: form.deductionItemId,
        amount: form.amount ?? undefined,
        percent: form.percent ?? undefined,
        totalAmount: form.totalAmount ?? undefined,
        numInstallments: form.numInstallments ?? undefined,
        refNo: form.refNo || undefined,
        description: form.description || undefined,
        priority: form.priority,
      };

      if (editDeduction) {
        await employeeDeductionApi.update(editDeduction.id!, payload);
        toast.success(`"${form.label.trim()}" updated successfully`);
      } else {
        await employeeDeductionApi.create(payload as any);
        toast.success(`Deduction "${form.label.trim()}" created successfully`);
      }

      setModalOpen(false);
      loadAllDeductions();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to save deduction';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeduction = (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await employeeDeductionApi.delete(deleteConfirm);
      toast.success('Deduction cancelled successfully');
      setDeleteConfirm(null);
      loadAllDeductions();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to cancel deduction';
      toast.error(msg);
      setDeleteConfirm(null);
    }
  };

  // ─── Bulk assign handlers ────────────────────────────────

  const openBulkAssign = async (config: DeductionConfig) => {
    setBulkConfig(config);
    setSelectedBulkIds(new Set());
    setBulkEmployeeValues({});
    setBulkSearch('');

    setBulkEmployeesLoading(true);
    try {
      const response = await employeeApi.getAll({ status: 'ACTIVE', page: 1, limit: 1000 });
      const body = response.data as any;
      const data = body?.data || [];
      setBulkEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setBulkEmployees([]);
    } finally {
      setBulkEmployeesLoading(false);
    }

    setBulkModalOpen(true);
  };

  const handleBulkSelectAll = () => {
    if (selectedBulkIds.size === filteredBulkEmployees.length) {
      setSelectedBulkIds(new Set());
    } else {
      setSelectedBulkIds(new Set(filteredBulkEmployees.map(e => e.id)));
    }
  };

  const handleBulkSelectOne = (id: string) => {
    const next = new Set(selectedBulkIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedBulkIds(next);
  };

  const handleBulkEmployeeValueChange = (employeeId: string, field: 'amount' | 'percent', value: number | null) => {
    setBulkEmployeeValues(prev => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], [field]: value },
    }));
  };

  const handleBulkAssign = async () => {
    if (!bulkConfig?.id) {
      toast.error('No deduction config selected');
      return;
    }
    if (selectedBulkIds.size === 0) {
      toast.warning('Select at least one employee');
      return;
    }

    // Parse config amount/percent to numbers (Prisma Decimals arrive as strings)
    const configAmount = bulkConfig.amount != null ? Number(bulkConfig.amount) : null;
    const configPercent = bulkConfig.percent != null ? Number(bulkConfig.percent) : null;

    if (bulkConfig.calculationType === 'FIXED_AMOUNT' && configAmount == null) {
      for (const id of selectedBulkIds) {
        if (bulkEmployeeValues[id]?.amount == null || bulkEmployeeValues[id]!.amount! < 0) {
          toast.error('Amount is required for all selected employees');
          return;
        }
      }
    }
    if ((bulkConfig.calculationType === 'PERCENTAGE_OF_BASIC' || bulkConfig.calculationType === 'PERCENTAGE_OF_GROSS') && configPercent == null) {
      for (const id of selectedBulkIds) {
        const val = bulkEmployeeValues[id]?.percent;
        if (val == null || val < 0 || val > 100) {
          toast.error('Percent (0-100) is required for all selected employees');
          return;
        }
      }
    }

    setBulkSaving(true);
    try {
      const assignments = Array.from(selectedBulkIds).map(id => ({
        employeeId: id,
        amount: configAmount ?? bulkEmployeeValues[id]?.amount ?? null,
        percent: configPercent ?? bulkEmployeeValues[id]?.percent ?? null,
      }));

      await employeeDeductionApi.bulkAssign({
        deductionConfigId: bulkConfig.id,
        assignments,
      });

      toast.success(`Assigned "${bulkConfig.label}" to ${assignments.length} employee(s)`);
      setBulkModalOpen(false);
      loadAllDeductions();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to assign deductions';
      toast.error(msg);
    } finally {
      setBulkSaving(false);
    }
  };

  // ─── Utils ───────────────────────────────────────────────
  /**
   * Formats a numeric amount with an optional currency prefix.
   *
   * @param amount - The numeric amount to format.
   * @param currency - The currency code (defaults to "ETB").
   * @returns A formatted currency string or "-" if amount is null/undefined.
   */
  const formatCurrency = (amount?: number | null, currency?: string) => {
    if (amount == null) return '-';
    const curr = currency || 'ETB';
    return `${curr} ${amount.toLocaleString()}`;
  };

  /**
   * Formats a numeric percentage value.
   *
   * @param percent - The percentage value to format.
   * @returns A formatted percentage string or "-" if null/undefined.
   */
  const formatPercent = (percent?: number | null) => {
    if (percent == null) return '-';
    return `${percent}%`;
  };

  /**
   * Looks up the human-readable label for a deduction calculation type.
   *
   * @param type - The calculation type key.
   * @returns The display label or the raw type string if not found.
   */
  const getCalculationLabel = (type: DeductionCalculationType) => {
    return CALCULATION_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;
  };

  /**
   * Retrieves the icon and accent color metadata for a deduction type.
   *
   * @param type - The deduction type key.
   * @returns The metadata object with accent color and icon, falling back to OTHER.
   */
  const getTypeMeta = (type: string) => {
    return DEDUCTION_TYPE_META[type] || DEDUCTION_TYPE_META.OTHER;
  };

  // Bulk filtered employees
  const filteredBulkEmployees = useMemo(() => {
    if (!bulkSearch.trim()) return bulkEmployees;
    const s = bulkSearch.toLowerCase();
    return bulkEmployees.filter(e =>
      e.firstName.toLowerCase().includes(s) ||
      e.lastName.toLowerCase().includes(s) ||
      (e.email && e.email.toLowerCase().includes(s))
    );
  }, [bulkEmployees, bulkSearch]);

// ─── Deduction type card styling maps ──────────────────────
const iconBgMap: Record<string, string> = {
  EMPLOYMENT_INCOME_TAX: 'bg-red-50 text-red-600',
  PENSION_EMPLOYEE: 'bg-blue-50 text-blue-600',
  HEALTH_INSURANCE: 'bg-brand-50 text-emerald-600',
  LIFE_INSURANCE: 'bg-brand-50 text-emerald-600',
  LOAN_REPAYMENT: 'bg-amber-50 text-amber-600',
  ADVANCE_RECOVERY: 'bg-amber-50 text-amber-600',
  COST_SHARING: 'bg-blue-50 text-blue-600',
  COURT_ORDER: 'bg-rose-50 text-rose-600',
  UNION_DUES: 'bg-cyan-50 text-cyan-600',
  SAVINGS_AND_CREDIT: 'bg-teal-50 text-teal-600',
  UNPAID_LEAVE: 'bg-slate-50 text-slate-600',
  LATENESS: 'bg-yellow-50 text-yellow-600',
  FINE_PENALTY: 'bg-orange-50 text-orange-600',
  OVERPAYMENT_RECOVERY: 'bg-indigo-50 text-indigo-600',
  CHILD_SUPPORT: 'bg-purple-50 text-purple-700',
  GARNISHMENT: 'bg-slate-100 text-slate-700',
  OTHER: 'bg-purple-50 text-purple-600',
};

const typeBadgeMap: Record<string, string> = {
  EMPLOYMENT_INCOME_TAX: 'bg-blue-50 text-blue-700',
  PENSION_EMPLOYEE: 'bg-brand-50 text-emerald-700',
  HEALTH_INSURANCE: 'bg-blue-50 text-blue-700',
  LIFE_INSURANCE: 'bg-blue-50 text-blue-700',
  LOAN_REPAYMENT: 'bg-amber-50 text-amber-700',
  ADVANCE_RECOVERY: 'bg-amber-50 text-amber-700',
  COST_SHARING: 'bg-blue-50 text-blue-700',
  COURT_ORDER: 'bg-rose-50 text-rose-700',
  UNION_DUES: 'bg-cyan-50 text-cyan-700',
  SAVINGS_AND_CREDIT: 'bg-teal-50 text-teal-700',
  UNPAID_LEAVE: 'bg-slate-50 text-slate-600',
  LATENESS: 'bg-yellow-50 text-yellow-700',
  FINE_PENALTY: 'bg-orange-50 text-orange-700',
  OVERPAYMENT_RECOVERY: 'bg-indigo-50 text-indigo-700',
  CHILD_SUPPORT: 'bg-purple-50 text-purple-700',
  GARNISHMENT: 'bg-slate-100 text-slate-600',
  OTHER: 'bg-purple-50 text-purple-700',
};

const typeLabelMap: Record<string, string> = {
  EMPLOYMENT_INCOME_TAX: 'Type A — STAT',
  PENSION_EMPLOYEE: 'Type A — STAT',
  HEALTH_INSURANCE: 'Type B — PER',
  LIFE_INSURANCE: 'Type B — PER',
  LOAN_REPAYMENT: 'Type C — VOL',
  ADVANCE_RECOVERY: 'Type C — VOL',
  COST_SHARING: 'Type B — PER',
  COURT_ORDER: 'Type A — STAT',
  UNION_DUES: 'Type C — VOL',
  SAVINGS_AND_CREDIT: 'Type C — VOL',
  UNPAID_LEAVE: 'Type A — STAT',
  LATENESS: 'Type B — PER',
  FINE_PENALTY: 'Type C — VOL',
  OVERPAYMENT_RECOVERY: 'Type B — PER',
  CHILD_SUPPORT: 'Type A — STAT',
  GARNISHMENT: 'Type A — STAT',
  OTHER: 'Type C — VOL',
};

  return (
    <div className="space-y-10 pb-20 px-4 md:px-8">
      {/* ─── Professional Header ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            <span>Audit & Compliance</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Payroll Components</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Employee Deductions
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5 max-w-2xl leading-relaxed">
            Monitor and control deduction allocations across the workforce. Manage statutory compliance, loan recoveries, and voluntary employee contributions with precision.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2.5 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[0.98] cursor-pointer">
            <Settings className="w-4 h-4" />
            Control Center
          </button>
          <button className="flex items-center gap-2.5 px-6 py-3 text-xs font-black uppercase tracking-widest text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-[0.98] cursor-pointer">
            <Plus className="w-4 h-4" />
            New Component
          </button>
        </div>
      </div>

      {/* ─── Structured Stats - Data Precision ──────────────── */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-2 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Active Allocations - Focal Point */}
          <div className="p-8 group hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-emerald-100 flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-110">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Allocations</span>
            </div>
            <p className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
              {totalActiveDeductions}
            </p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em] mt-3">Verified payroll units</p>
          </div>

          {/* Monthly Volume */}
          <div className="p-8 group hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 transition-transform group-hover:scale-110">
                <Banknote className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Monthly Volume</span>
            </div>
            <p className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
              <span className="text-lg font-bold text-slate-400 mr-1.5 uppercase">ETB</span>
              {totalMonthlyAll >= 1000
                ? `${(totalMonthlyAll / 1000).toFixed(1)}K`
                : totalMonthlyAll.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em] mt-3">Est. disbursement</p>
          </div>

          {/* Component Types */}
          <div className="p-8 group hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 transition-transform group-hover:scale-110">
                <Receipt className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Defined Types</span>
            </div>
            <p className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
              {deductionTemplates.length}
            </p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em] mt-3">Active blueprints</p>
          </div>

          {/* Total Workforce */}
          <div className="p-8 group hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 transition-transform group-hover:scale-110">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Workforce</span>
            </div>
            <p className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
              {employees.length}
            </p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em] mt-3">Eligible personnel</p>
          </div>
        </div>
      </div>

      {/* ─── Search & Registry Controls ─────────────────── */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1 min-w-[320px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search payroll components by name or type..."
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <select className="appearance-none pl-4 pr-11 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:border-slate-900 outline-none cursor-pointer text-slate-700 font-bold min-w-[180px]">
              <option>All Compliance Tiers</option>
              <option>Statutory (Type A)</option>
              <option>Corporate (Type B)</option>
              <option>Voluntary (Type C)</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          
          <button 
            onClick={loadDeductionTemplates}
            className="p-3 text-slate-500 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Reload Component Registry"
          >
            <RefreshCw className={cn("w-4.5 h-4.5", templatesLoading && "animate-spin")} />
          </button>
        </div>

        {filteredConfigs.length > 0 && (
          <div className="ml-auto flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Registry</span>
              <span className="text-sm font-black text-slate-900 leading-tight">{filteredConfigs.length} Entries</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Component Registry - High Density ──────────── */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
        <DataRenderer
          state={{
            data: filteredConfigs,
            loading: templatesLoading,
            error: null,
            isRefreshing: false,
          }}
          onRetry={loadDeductionTemplates}
          renderEmpty={
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                <Percent className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Component Registry Empty</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                No payroll components matched your current filter. Adjust your search or define a new deduction blueprint.
              </p>
            </div>
          }
          renderSuccess={() => (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Component Blueprint</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Compliance Status</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-center">Current Load</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-right">Registry Volume</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-right w-[180px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredConfigs.map((config, idx) => {
                    const meta = getTypeMeta(config.deductionType);
                    const empCount = (config as any).employeeCount || 0;
                    const activeCount = (config as any).activeCount || 0;
                    const totalMonthly = (config as any).totalMonthly || 0;
                    const badgeLabel = typeLabelMap[config.deductionType] || "Type C — VOL";
                    const badgeBg = typeBadgeMap[config.deductionType] || "bg-slate-50 text-slate-600";

                    return (
                      <tr 
                        key={config.id} 
                        className="group hover:bg-slate-50/50 transition-all cursor-pointer"
                        onClick={() => navigate(`/employee-deductions/${config.id}`)}
                      >
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-5">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm transition-all group-hover:scale-105 group-hover:shadow-md",
                              iconBgMap[config.deductionType] || "bg-slate-50 text-slate-400 border-slate-200"
                            )}>
                              {React.cloneElement(meta.icon as React.ReactElement, { className: "w-5.5 h-5.5", strokeWidth: 2.5 })}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-base tracking-tight truncate leading-none">{config.label}</p>
                              <p className="text-[11px] text-slate-400 font-bold font-mono mt-1.5 uppercase tracking-wider opacity-60">{config.deductionType}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <span className={cn(
                            "inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm",
                            badgeBg.replace('bg-', 'bg-').replace('text-', 'text-'),
                            "border-current/10"
                          )}>
                            {badgeLabel}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <div className="inline-flex items-center gap-4 bg-white border border-slate-100 px-4 py-2 rounded-2xl shadow-sm group-hover:border-slate-200 transition-colors">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Global</span>
                              <span className="text-sm font-black text-slate-900 leading-tight mt-1">{empCount}</span>
                            </div>
                            <div className="w-px h-8 bg-slate-100" />
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest leading-none">Active</span>
                              <span className="text-sm font-black text-emerald-600 leading-tight mt-1">{activeCount}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <p className="text-base font-black text-slate-900 tabular-nums tracking-tight">
                            {totalMonthly > 0
                              ? `ETB ${totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                              : '\u2014'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-60">Est. Impact</p>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); openBulkAssign(config); }}
                              className="w-10 h-10 flex items-center justify-center text-emerald-600 hover:bg-brand-50 rounded-xl border border-transparent hover:border-emerald-100 transition-all cursor-pointer shadow-sm active:scale-90"
                              title="Assign Personnel"
                            >
                              <Plus className="w-5 h-5" strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/employee-deductions/${config.id}`); }}
                              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer shadow-sm active:scale-90"
                              title="Audit Register"
                            >
                              <Eye className="w-5 h-5" strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        />
      </div>



      {/* ─── Add/Edit Deduction Modal ───────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editDeduction ? 'Modify Allocation' : 'Establish New Allocation'}
        size="lg"
        footer={
          <ConfigModalFooter
            onCancel={() => setModalOpen(false)}
            onSave={handleSaveDeduction}
            isEdit={!!editDeduction}
            saving={saving}
          />
        }
      >
        <div className="space-y-8 px-2 py-4">
          {/* Identity Section */}
          {!editDeduction && !activeCardEmployee ? (
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Personnel Identity</label>
              <Select
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                options={[
                  { value: '', label: 'Select personnel from registry...' },
                  ...employees.map((e) => ({
                    value: e.id,
                    label: `${e.firstName} ${e.lastName}`,
                  })),
                ]}
                className="h-12 border-brand-200 rounded-2xl focus:border-brand-400 border-2 transition-all font-medium"
              />
            </div>
          ) : activeCardEmployee && !editDeduction ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] shadow-inner">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center text-white text-lg font-black shadow-lg border-4 border-white">
                  {activeCardEmployee.firstName[0]}{activeCardEmployee.lastName[0]}
                </div>
                <div>
                  <p className="font-black text-slate-900 text-lg tracking-tight leading-none">{activeCardEmployee.firstName} {activeCardEmployee.lastName}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1.5">{activeCardEmployee.jobPosition || 'Verified Personnel'}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Blueprint Type</label>
              <Select
                value={form.deductionType}
                onChange={(e) => {
                  const selected = deductionTemplates.find((t) => t.deductionType === e.target.value);
                  setForm({
                    ...form,
                    deductionType: e.target.value,
                    label: selected?.label || form.label,
                  });
                }}
                options={[
                  ...deductionTemplates.map((t) => ({
                    value: t.deductionType,
                    label: `${t.label} (${t.deductionType})`,
                  })),
                  { value: 'OTHER', label: 'Custom Protocol' },
                ]}
                className="h-12 border-brand-200 rounded-2xl focus:border-brand-400 border-2"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Allocation Identifier</label>
              <Input
                value={form.label}
                onChange={(e) => { setForm({ ...form, label: e.target.value }); setFormError(''); }}
                placeholder="e.g. Loan Recovery Protocol"
                error={formError}
                className="h-12 border-brand-200 rounded-2xl focus:border-brand-400 border-2 font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Reference & Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Reference Code</label>
              <div className="relative">
                <Input
                  value={form.refNo}
                  onChange={(e) => setForm({ ...form, refNo: e.target.value })}
                  placeholder="ADIU-REF-001"
                  className="h-12 border-slate-200 rounded-2xl focus:border-slate-900 font-mono text-sm tracking-widest pl-10"
                />
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Calculation Model</label>
              <Select
                value={form.calculationType}
                onChange={(e) => setForm({ ...form, calculationType: e.target.value as DeductionCalculationType })}
                options={CALCULATION_TYPE_OPTIONS}
                className="h-12 border-slate-200 rounded-2xl"
              />
            </div>
          </div>

          {/* Financial Impact - High Contrast */}
          <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
            
            {form.calculationType === 'FIXED_AMOUNT' && (
              <div className="space-y-4 relative z-10">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] block">Fixed Monthly Impact</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/30 transition-all shadow-inner">
                  <span className="px-5 py-4 text-xs font-black text-white/20 border-r border-white/10 uppercase tracking-widest bg-white/5">ETB</span>
                  <input
                    type="number"
                    value={form.amount ?? ''}
                    onChange={(e) => setForm({ ...form, amount: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0.00"
                    className="flex-1 px-6 py-4 text-2xl font-black bg-transparent outline-none placeholder:text-white/10 tabular-nums tracking-tighter"
                  />
                </div>
              </div>
            )}

            {(form.calculationType === 'PERCENTAGE_OF_BASIC' || form.calculationType === 'PERCENTAGE_OF_GROSS') && (
              <div className="space-y-4 relative z-10">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] block">Payroll Impact Factor</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/30 transition-all shadow-inner">
                  <input
                    type="number"
                    value={form.percent ?? ''}
                    onChange={(e) => setForm({ ...form, percent: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0"
                    className="flex-1 px-6 py-4 text-2xl font-black bg-transparent outline-none placeholder:text-white/10 tabular-nums tracking-tighter"
                  />
                  <span className="px-5 py-4 text-xs font-black text-white/20 border-l border-white/10 uppercase tracking-widest bg-white/5">%</span>
                </div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest ml-1 italic opacity-60">
                  Calculated against {form.calculationType === 'PERCENTAGE_OF_BASIC' ? 'Basic Salary' : 'Gross Salary'} registry
                </p>
              </div>
            )}

            {/* Remaining Balance / Loan fields - Expert Style */}
            {form.calculationType === 'REMAINING_BALANCE' && (
              <div className="space-y-6 relative z-10">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block">Principal Amount</label>
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <span className="px-3 py-2 text-[10px] font-black text-white/20 border-r border-white/10 uppercase tracking-widest bg-white/5">ETB</span>
                      <input
                        type="number"
                        value={form.totalAmount ?? ''}
                        onChange={(e) => setForm({ ...form, totalAmount: e.target.value ? Number(e.target.value) : null })}
                        placeholder="0.00"
                        className="flex-1 px-4 py-2 text-base font-bold bg-transparent outline-none placeholder:text-white/10 tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block">Term (Cycles)</label>
                    <input
                      type="number"
                      value={form.numInstallments ?? ''}
                      onChange={(e) => setForm({ ...form, numInstallments: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 12"
                      className="w-full px-4 py-2 text-base font-bold bg-white/5 border border-white/10 rounded-xl outline-none focus:border-white/30 tabular-nums"
                    />
                  </div>
                </div>
                {form.totalAmount && form.numInstallments && form.numInstallments > 0 && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Calculated installment</span>
                    </div>
                    <span className="text-sm font-black text-emerald-400 tabular-nums">ETB {(form.totalAmount / form.numInstallments).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Execution Priority</label>
              <Input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value ? Number(e.target.value) : 0 })}
                placeholder="0"
                className="h-12 border-slate-200 rounded-2xl"
              />
            </div>
            
            {editDeduction && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Compliance Status</label>
                <div className="flex gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-2xl w-fit">
                  {(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as EmployeeDeductionStatus[]).map((status) => {
                    const isActive = (editDeduction.status || 'ACTIVE') === status;
                    const statusColors: Record<string, string> = {
                      ACTIVE: 'bg-emerald-600 shadow-md shadow-brand-200 text-white',
                      PAUSED: 'bg-amber-500 shadow-md shadow-amber-200 text-white',
                      COMPLETED: 'bg-blue-600 shadow-md shadow-blue-200 text-white',
                      CANCELLED: 'bg-slate-500 shadow-md shadow-slate-200 text-white',
                    };
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          employeeDeductionApi.update(editDeduction.id!, {
                            status: status as EmployeeDeductionStatus,
                          }).then(() => {
                            toast.success('System status updated');
                            loadAllDeductions();
                          }).catch(() => toast.error('Verification failed'));
                        }}
                        className={cn(
                          "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer",
                          isActive ? statusColors[status] : 'text-slate-400 hover:text-slate-600 hover:bg-white'
                        )}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Internal Registry Notes</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Record any additional context or compliance notes here..."
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-sm font-medium focus:border-slate-900 transition-all resize-none bg-slate-50/30"
              rows={3}
            />
          </div>
        </div>
      </Modal>

      {/* ─── Bulk Assign Modal ──────────────────────────────── */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={`Registry Assignment: ${bulkConfig?.label || ''}`}
        size="lg"
        footer={
          <ConfigModalFooter
            onCancel={() => setBulkModalOpen(false)}
            onSave={handleBulkAssign}
            isEdit={false}
            saving={bulkSaving}
            saveLabel="Finalize Assignments"
          />
        }
      >
        {bulkConfig && (
          <div className="space-y-6 px-2 py-4">
            {/* Blueprint Indicator */}
            <div className={cn(
              "p-6 rounded-[2rem] border shadow-inner",
              bulkConfig.amount || bulkConfig.percent
                ? 'bg-brand-50 border-emerald-100'
                : 'bg-blue-50 border-blue-100'
            )}>
              <div className="flex items-center gap-5">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white shrink-0",
                  bulkConfig.amount || bulkConfig.percent
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 text-white'
                )}>
                  {DEDUCTION_TYPE_META[bulkConfig.deductionType]?.icon || <Tag className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Blueprint Identification</p>
                  <p className="font-black text-slate-900 text-lg tracking-tight leading-none truncate">{bulkConfig.label}</p>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm shrink-0",
                  bulkConfig.amount || bulkConfig.percent
                    ? 'bg-white border-brand-200 text-emerald-700'
                    : 'bg-white border-blue-200 text-blue-700'
                )}>
                  {bulkConfig.amount || bulkConfig.percent ? 'STATIC RATE' : 'VARIABLE RATE'}
                </span>
              </div>
            </div>

            {/* Registry Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search personnel registry by name..."
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                className="w-full h-12 pl-11 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-2xl focus:border-slate-900 outline-none transition-all font-medium shadow-sm"
              />
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between px-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                  filteredBulkEmployees.length > 0 && selectedBulkIds.size === filteredBulkEmployees.length
                    ? 'bg-slate-900 border-slate-900 shadow-md'
                    : 'border-slate-200 group-hover:border-slate-400 bg-white'
                )}>
                  {filteredBulkEmployees.length > 0 && selectedBulkIds.size === filteredBulkEmployees.length && (
                    <CheckCircle className="w-4 h-4 text-white" strokeWidth={3} />
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={filteredBulkEmployees.length > 0 && selectedBulkIds.size === filteredBulkEmployees.length}
                  onChange={handleBulkSelectAll}
                  className="sr-only"
                />
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Select Entire View ({filteredBulkEmployees.length})</span>
              </label>
              {selectedBulkIds.size > 0 && (
                <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10">
                  {selectedBulkIds.size} Target Personnel
                </div>
              )}
            </div>

            {/* Personnel Listing - High Density */}
            <div className="max-h-80 overflow-y-auto rounded-[2rem] border border-slate-200 bg-slate-50/30 p-2 space-y-1 custom-scrollbar">
              {bulkEmployeesLoading ? (
                <div className="py-20 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto" />
                </div>
              ) : filteredBulkEmployees.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-xs font-black uppercase tracking-widest">No matching personnel</div>
              ) : (
                filteredBulkEmployees.map((emp) => {
                  const isSelected = selectedBulkIds.has(emp.id);
                  const initials = `${emp.firstName[0] || ''}${emp.lastName[0] || ''}`;

                  return (
                    <div
                      key={emp.id}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all cursor-pointer",
                        isSelected
                          ? 'bg-white border-slate-900 shadow-md'
                          : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                      )}
                      onClick={() => handleBulkSelectOne(emp.id)}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                        isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-200 bg-white'
                      )}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>

                      <div className="w-10 h-10 rounded-full bg-brand-primary border-2 border-brand-200 shadow-lg shadow-brand-900/20 flex items-center justify-center text-xs font-black text-white shrink-0 uppercase tracking-widest">
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm tracking-tight truncate">{emp.firstName} {emp.lastName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{emp.departmentName || 'General Registry'}</p>
                      </div>

                      {/* Per-employee value input (Type B) */}
                      {!bulkConfig.amount && !bulkConfig.percent && isSelected && (
                        <div className="w-32 shrink-0 animate-in slide-in-from-right-4 duration-300" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-slate-900 transition-colors shadow-sm">
                            <input
                              type="number"
                              value={bulkEmployeeValues[emp.id]?.[bulkConfig.calculationType === 'FIXED_AMOUNT' ? 'amount' : 'percent'] ?? ''}
                              onChange={(e) => handleBulkEmployeeValueChange(
                                emp.id,
                                bulkConfig.calculationType === 'FIXED_AMOUNT' ? 'amount' : 'percent',
                                e.target.value ? Number(e.target.value) : null
                              )}
                              placeholder={bulkConfig.calculationType === 'FIXED_AMOUNT' ? '0.00' : '0'}
                              className="w-full px-3 py-2 text-sm font-bold text-slate-900 outline-none tabular-nums"
                            />
                            <span className="px-3 py-2 text-[10px] font-black text-slate-300 border-l border-slate-100 uppercase tracking-widest bg-slate-50">
                              {bulkConfig.calculationType === 'FIXED_AMOUNT' ? 'ETB' : '%'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Delete Confirmation Modal ──────────────────────── */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Cancel Deduction"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              No, Keep It
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Yes, Cancel Deduction
            </Button>
          </div>
        }
      >
        <div className="text-center py-2">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <p className="text-slate-700 font-medium">Are you sure you want to cancel this deduction?</p>
          <p className="text-sm text-slate-500 mt-2">
            This action will mark the deduction as cancelled and stop future deductions.
          </p>
        </div>
      </Modal>
    </div>
  );
};
