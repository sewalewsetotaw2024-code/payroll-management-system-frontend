import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Wallet,
  Receipt,
  Percent,
  X,
  Filter,
  ChevronDown,
  Eye,
  UserCheck,
  Building2,
  BadgeInfo,
  Banknote,
  Tag,
} from 'lucide-react';
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

  // ─── Card accent map (white bg, subtle border tint per type) ──
  const cardAccents: Record<string, string> = {
    LOAN_REPAYMENT: 'border-violet-200 hover:border-violet-300',
    COST_SHARING: 'border-blue-200 hover:border-blue-300',
    ADVANCE_RECOVERY: 'border-amber-200 hover:border-amber-300',
    COURT_ORDER: 'border-rose-200 hover:border-rose-300',
    UNION_DUES: 'border-cyan-200 hover:border-cyan-300',
    PENSION_EMPLOYEE: 'border-emerald-200 hover:border-emerald-300',
    EMPLOYMENT_INCOME_TAX: 'border-red-200 hover:border-red-300',
    UNPAID_LEAVE: 'border-slate-200 hover:border-slate-300',
    LATENESS: 'border-yellow-200 hover:border-yellow-300',
    OTHER: 'border-slate-200 hover:border-slate-300',
  };

  const getCardAccent = (type: string) => cardAccents[type] || cardAccents.OTHER;

  return (
    <div className="space-y-8">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Employee Deductions
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-xl">
            Manage deduction assignments across your organization. 
            Click any card to view and manage employees assigned to that deduction type.
          </p>
        </div>
      </div>

      {/* ─── Stats Bar ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{deductionTemplates.length}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Deduction Types</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalActiveDeductions}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Active Assignments</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {totalMonthlyAll >= 1000
              ? `${(totalMonthlyAll / 1000).toFixed(1)}K`
              : totalMonthlyAll.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">Est. Monthly Total</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{employees.length}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Employees</p>
        </div>
      </div>

      {/* ─── Deduction Template Cards ───────────────────────── */}
      <div>
        {/* Search & filter bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search deduction types..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
          </div>
          {filteredConfigs.length > 0 && (
            <span className="text-xs text-slate-400 font-medium">
              {filteredConfigs.length} of {deductionTemplates.length}
            </span>
          )}
        </div>

        <DataRenderer
          state={{
            data: filteredConfigs,
            loading: templatesLoading,
            error: null,
            isRefreshing: false,
          }}
          onRetry={loadDeductionTemplates}
          renderEmpty={
            <ConfigEmptyState
              icon={<Percent className="w-10 h-10" />}
              title={templateSearch ? 'No matching deduction types' : 'No deduction templates configured'}
              message={
                templateSearch
                  ? 'Try a different search term.'
                  : 'Go to Configuration → Deduction Types to create templates first.'
              }
            />
          }
          renderSuccess={() => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredConfigs.map((config) => {
                const meta = DEDUCTION_TYPE_META[config.deductionType] || DEDUCTION_TYPE_META.OTHER;
                const hasFixedValue = config.amount != null || config.percent != null;
                const accent = getCardAccent(config.deductionType);
                const empCount = (config as any).employeeCount || 0;
                const activeCount = (config as any).activeCount || 0;
                const totalMonthly = (config as any).totalMonthly || 0;

                return (
                  <div
                    key={config.id}
                    className={`group bg-white ${accent} rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4`}
                    onClick={() => navigate(`/employee-deductions/${config.id}`)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${
                          hasFixedValue
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                            : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                        }`}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-sm leading-tight truncate">
                            {config.label}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-wider truncate">
                            {config.deductionType.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                          hasFixedValue
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {hasFixedValue ? '⚡ Fixed Value' : '👤 Per Employee'}
                        </span>
                        {config.id && (
                          <span className="text-[9px] text-slate-400 font-mono">ID: {config.id.slice(0, 7)}</span>
                        )}
                      </div>
                    </div>

                    {/* Stat boxes */}
                    <div className="flex gap-2 mb-4">
                      <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] text-slate-500 font-medium mb-0.5">Employees</p>
                        <p className="text-lg font-black text-slate-900 leading-none">{empCount}</p>
                      </div>
                      <div className="flex-1 bg-emerald-50 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] text-emerald-600 font-medium mb-0.5">Active</p>
                        <p className="text-lg font-black text-emerald-700 leading-none">{activeCount}</p>
                      </div>
                      <div className="flex-1 bg-rose-50 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] text-rose-500 font-medium mb-0.5">Monthly</p>
                        <p className="text-lg font-black text-rose-600 leading-none">
                          {totalMonthly >= 1000
                            ? `${(totalMonthly / 1000).toFixed(1)}K`
                            : totalMonthly.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Calculation type & value */}
                    <div className="flex items-center gap-2 mb-3">
                      {config.calculationType ? (
                        <>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                            {CALCULATION_TYPE_OPTIONS.find(o => o.value === config.calculationType)?.label || config.calculationType}
                          </span>
                          {hasFixedValue && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              config.amount != null
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-violet-50 text-violet-700'
                            }`}>
                              {config.amount != null
                                ? `ETB ${config.amount.toLocaleString()}`
                                : `${config.percent}%`}
                            </span>
                          )}
                          {!hasFixedValue && (
                            <span className="text-[10px] text-amber-600 font-medium italic">Per-employee value</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No calc type set</span>
                      )}
                    </div>

                    {/* Action buttons (always visible, subtle) */}
                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); openBulkAssign(config); }}
                        className="flex-1 py-2 px-3 bg-white hover:bg-emerald-50 text-emerald-700 font-semibold text-[11px] rounded-xl transition-all border border-slate-200 hover:border-emerald-300 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Assign
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/employee-deductions/${config.id}`); }}
                        className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-[11px] rounded-xl transition-all border border-slate-200 hover:border-slate-300 flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        />
      </div>



      {/* ─── Add/Edit Deduction Modal ───────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editDeduction ? 'Edit Employee Deduction' : 'Add Employee Deduction'}
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
        <div className="space-y-5">
          {/* Employee info (add mode) */}
          {!editDeduction && !activeCardEmployee && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Employee</label>
              <Select
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                options={[
                  { value: '', label: 'Select an employee...' },
                  ...employees.map((e) => ({
                    value: e.id,
                    label: `${e.firstName} ${e.lastName}`,
                  })),
                ]}
              />
            </div>
          )}
          {!editDeduction && activeCardEmployee && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {activeCardEmployee.firstName[0]}{activeCardEmployee.lastName[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{activeCardEmployee.firstName} {activeCardEmployee.lastName}</p>
                  <p className="text-xs text-slate-500">{activeCardEmployee.jobPosition || 'No position'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Deduction Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Deduction Type</label>
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
                { value: 'OTHER', label: 'Custom / Other' },
              ]}
            />
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Label / Description <span className="text-rose-500">*</span>
            </label>
            <Input
              value={form.label}
              onChange={(e) => { setForm({ ...form, label: e.target.value }); setFormError(''); }}
              placeholder="e.g. Staff Loan - 2024 Q1"
              error={formError}
              required
            />
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Reference Number (Optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">#</span>
              <Input
                value={form.refNo}
                onChange={(e) => setForm({ ...form, refNo: e.target.value })}
                placeholder="e.g. LOAN-2024-001"
                className="pl-8"
              />
            </div>
          </div>

          {/* Calculation Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Calculation Type <span className="text-rose-500">*</span></label>
            <Select
              value={form.calculationType}
              onChange={(e) => setForm({ ...form, calculationType: e.target.value as DeductionCalculationType })}
              options={CALCULATION_TYPE_OPTIONS}
            />
          </div>

          {/* Amount field (FIXED_AMOUNT) */}
          {form.calculationType === 'FIXED_AMOUNT' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Amount <span className="text-rose-500">*</span></label>
                <div className="flex items-center border border-slate-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all overflow-hidden">
                  <span className="pl-3.5 pr-2 text-slate-500 font-medium text-sm border-r border-slate-200 py-2.5 bg-slate-50">ETB</span>
                  <input
                    type="number"
                    value={form.amount ?? ''}
                    onChange={(e) => setForm({ ...form, amount: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0.00"
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Percent field (PERCENTAGE_OF_*) */}
          {(form.calculationType === 'PERCENTAGE_OF_BASIC' || form.calculationType === 'PERCENTAGE_OF_GROSS') && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Percentage (0-100) <span className="text-rose-500">*</span></label>
              <div className="flex items-center border border-slate-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all overflow-hidden">
                <input
                  type="number"
                  value={form.percent ?? ''}
                  onChange={(e) => setForm({ ...form, percent: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0"
                  className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
                />
                <span className="px-3.5 text-slate-500 font-medium text-sm border-l border-slate-200 py-2.5 bg-slate-50">%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                {form.calculationType === 'PERCENTAGE_OF_BASIC'
                  ? "Calculated as a percentage of the employee's basic salary each period."
                  : "Calculated as a percentage of the employee's gross salary each period."}
              </p>
            </div>
          )}

          {/* Remaining Balance / Loan fields */}
          {form.calculationType === 'REMAINING_BALANCE' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Total Loan Amount <span className="text-rose-500">*</span></label>
                  <div className="flex items-center border border-slate-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all overflow-hidden">
                    <span className="pl-3.5 pr-2 text-slate-500 font-medium text-sm border-r border-slate-200 py-2.5 bg-slate-50">ETB</span>
                    <input
                      type="number"
                      value={form.totalAmount ?? ''}
                      onChange={(e) => setForm({ ...form, totalAmount: e.target.value ? Number(e.target.value) : null })}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Installments</label>
                  <Input
                    type="number"
                    value={form.numInstallments ?? ''}
                    onChange={(e) => setForm({ ...form, numInstallments: e.target.value ? Number(e.target.value) : null })}
                    placeholder="e.g. 24"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
                  <Input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value ? Number(e.target.value) : 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
              {form.totalAmount && form.numInstallments && form.numInstallments > 0 && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl">
                  <p className="text-sm text-emerald-800 font-semibold flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Estimated per period: {formatCurrency(form.totalAmount / form.numInstallments)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Status toggle (edit mode only) */}
          {editDeduction && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Status</label>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                {(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as EmployeeDeductionStatus[]).map((status) => {
                  const isActive = (editDeduction.status || 'ACTIVE') === status;
                  const statusColors: Record<string, string> = {
                    ACTIVE: 'bg-emerald-500 shadow-sm shadow-emerald-200 text-white',
                    PAUSED: 'bg-amber-500 shadow-sm shadow-amber-200 text-white',
                    COMPLETED: 'bg-blue-500 shadow-sm shadow-blue-200 text-white',
                    CANCELLED: 'bg-slate-400 shadow-sm shadow-slate-200 text-white',
                  };
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        employeeDeductionApi.update(editDeduction.id!, {
                          status: status as EmployeeDeductionStatus,
                        }).then(() => {
                          toast.success('Deduction status updated');
                          loadAllDeductions();
                        }).catch(() => toast.error('Failed to update status'));
                      }}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        isActive
                          ? statusColors[status]
                          : 'text-slate-600 hover:bg-slate-200/50'
                      }`}
                    >
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Notes / Description (Optional)</label>
            <div className="relative">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Additional notes about this deduction..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none bg-white placeholder:text-slate-400"
                rows={3}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ─── Bulk Assign Modal ──────────────────────────────── */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={`Assign "${bulkConfig?.label || ''}"`}
        size="lg"
        footer={
          <ConfigModalFooter
            onCancel={() => setBulkModalOpen(false)}
            onSave={handleBulkAssign}
            isEdit={false}
            saving={bulkSaving}
            saveLabel="Assign to Selected"
          />
        }
      >
        {bulkConfig && (
          <div className="space-y-4">
            {/* Config info card */}
            <div className={`p-4 rounded-xl border ${
              bulkConfig.amount || bulkConfig.percent
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${
                  bulkConfig.amount || bulkConfig.percent
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                }`}>
                  {DEDUCTION_TYPE_META[bulkConfig.deductionType]?.icon || <Tag className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{bulkConfig.label}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {bulkConfig.calculationType ? (
                      <>
                        {CALCULATION_TYPE_OPTIONS.find(o => o.value === bulkConfig.calculationType)?.label}
                        {bulkConfig.amount != null && <span className="ml-1.5 font-semibold text-blue-600">ETB {bulkConfig.amount.toLocaleString()}</span>}
                        {bulkConfig.percent != null && <span className="ml-1.5 font-semibold text-violet-600">{bulkConfig.percent}%</span>}
                        {!bulkConfig.amount && !bulkConfig.percent && <span className="ml-1.5 text-amber-600 font-medium italic">per-employee value</span>}
                      </>
                    ) : 'Legacy template'}
                  </p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                  bulkConfig.amount || bulkConfig.percent
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}>
                  {bulkConfig.amount || bulkConfig.percent ? '⚡ Fixed' : '👤 Per-Emp'}
                </span>
              </div>
            </div>

            {/* Per-employee value hint (Type B) */}
            {!bulkConfig.amount && !bulkConfig.percent && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 text-sm mt-0.5">👤</span>
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Per-Employee Value Required</p>
                    <p className="text-[11px] text-amber-700/80 mt-0.5">
                      {bulkConfig.calculationType === 'FIXED_AMOUNT'
                        ? 'Enter an amount for each selected employee below.'
                        : 'Enter a percentage for each selected employee below.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search employees by name..."
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Select All + count */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                  filteredBulkEmployees.length > 0 && selectedBulkIds.size === filteredBulkEmployees.length
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'border-slate-300 hover:border-emerald-400'
                }`}>
                  {filteredBulkEmployees.length > 0 && selectedBulkIds.size === filteredBulkEmployees.length && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={filteredBulkEmployees.length > 0 && selectedBulkIds.size === filteredBulkEmployees.length}
                  onChange={handleBulkSelectAll}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-slate-700">Select All</span>
                <span className="text-[11px] text-slate-400">({filteredBulkEmployees.length})</span>
              </label>
              {selectedBulkIds.size > 0 && (
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {selectedBulkIds.size} selected
                </span>
              )}
            </div>

            {/* Employee list */}
            <div className="max-h-72 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-1.5 bg-white">
              {bulkEmployeesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-7 w-7 border-2 border-emerald-500 border-t-transparent" />
                </div>
              ) : filteredBulkEmployees.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No employees found</div>
              ) : (
                filteredBulkEmployees.map((emp) => {
                  const isSelected = selectedBulkIds.has(emp.id);
                  const initials = `${emp.firstName[0] || ''}${emp.lastName[0] || ''}`;
                  const avatarColors = [
                    'from-blue-400 to-blue-600', 'from-emerald-400 to-emerald-600',
                    'from-violet-400 to-violet-600', 'from-rose-400 to-rose-600',
                    'from-amber-400 to-amber-600', 'from-cyan-400 to-cyan-600',
                    'from-pink-400 to-pink-600', 'from-indigo-400 to-indigo-600',
                  ];
                  const avatarColor = avatarColors[emp.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length];

                  return (
                    <div
                      key={emp.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50/80 shadow-sm'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => handleBulkSelectOne(emp.id)}
                    >
                      {/* Custom checkbox */}
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'border-slate-300 group-hover:border-emerald-400'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                        {initials}
                      </div>

                      {/* Employee info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate leading-tight">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                          {emp.jobPosition || 'No position'}
                          {emp.departmentName && <span className="text-slate-300 mx-1">•</span>}
                          {emp.departmentName}
                        </p>
                      </div>

                      {/* Per-employee value input (Type B) */}
                      {!bulkConfig.amount && !bulkConfig.percent && isSelected && (
                        <div className="w-28 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all overflow-hidden">
                            <input
                              type="number"
                              value={isSelected ? (bulkConfig.calculationType === 'FIXED_AMOUNT'
                                ? (bulkEmployeeValues[emp.id]?.amount ?? '')
                                : (bulkEmployeeValues[emp.id]?.percent ?? '')) : ''}
                              onChange={(e) => handleBulkEmployeeValueChange(
                                emp.id,
                                bulkConfig.calculationType === 'FIXED_AMOUNT' ? 'amount' : 'percent',
                                e.target.value ? Number(e.target.value) : null
                              )}
                              placeholder={bulkConfig.calculationType === 'FIXED_AMOUNT' ? 'Amt' : '%'}
                              className="w-full px-2.5 py-1.5 text-xs outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
                            />
                            <span className="px-2 text-[10px] text-slate-500 font-medium border-l border-slate-200 py-1.5 bg-slate-50">
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
