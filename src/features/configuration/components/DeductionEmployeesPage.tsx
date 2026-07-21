import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  Users,
  AlertCircle,
  CheckCircle,
  X,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Modal, Input, Select, Button } from "../../../components/ui";
import { ConfigModalFooter } from "./shared";
import { toast } from "../../../components/ui/Toast";
import { cn, slugify } from "../../../lib/utils";
import {
  CALCULATION_TYPE_OPTIONS,
  STATUS_OPTIONS,
  STATUS_BADGE,
  DEDUCTION_TYPE_META,
} from "../constants";
import type {
  EmployeeDeduction,
  DeductionConfig,
  DeductionCalculationType,
  EmployeeDeductionStatus,
} from "../types/configuration.types";
import {
  employeeApi,
  employeeDeductionApi,
  deductionApi,
} from "../api/configurationApi";

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

/**
 * DeductionEmployeesPage component for managing employees assigned to a specific deduction type.
 * Supports bulk assignment, individual editing, and cancellation of per-employee deductions.
 */
export const DeductionEmployeesPage: React.FC = () => {
  const { configSlug } = useParams<{ configSlug: string }>();
  const navigate = useNavigate();

  const [resolvedConfigId, setResolvedConfigId] = useState<string | null>(null);

  // ─── Resolve configSlug → configId ───────────────────────────────────────
  useEffect(() => {
    if (!configSlug) return;
    let cancelled = false;

    deductionApi.getAll({ page: 1, limit: 1000 }).then((res) => {
      if (cancelled) return;
      const allConfigs = res.data?.data ?? [];
      const matched = allConfigs.find((c: any) => c.label && slugify(c.label) === configSlug);
      if (matched?.id) {
        setResolvedConfigId(matched.id);
      } else {
        setConfigLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setConfigLoading(false);
    });

    return () => { cancelled = true; };
  }, [configSlug]);

  // ─── Deduction Config ────────────────────────────────────────
  const [config, setConfig] = useState<DeductionConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // ─── Assigned Employees ──────────────────────────────────────
  const [assignedDeductions, setAssignedDeductions] = useState<
    EmployeeDeduction[]
  >([]);
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // ─── Bulk-Assign Modal ───────────────────────────────────────
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkEmployees, setBulkEmployees] = useState<Employee[]>([]);
  const [bulkEmployeesLoading, setBulkEmployeesLoading] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkEmployeeValues, setBulkEmployeeValues] = useState<
    Record<string, { amount?: number | null; percent?: number | null }>
  >({});
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  // ─── Delete Confirmation ─────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ─── Edit Deduction Modal ────────────────────────────────────
  const [editDeduction, setEditDeduction] = useState<EmployeeDeduction | null>(
    null,
  );
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<{
    status: string;
    label: string;
    amount: number | null;
    percent: number | null;
    description: string;
  }>({
    status: "ACTIVE",
    label: "",
    amount: null,
    percent: null,
    description: "",
  });

  // ─── Debounced search ────────────────────────────────────────
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search]);

  // ─── Manual retry counter (incremented to force re-fetch) ────
  const [refetchKey, setRefetchKey] = useState(0);

  // ─── Load Config ─────────────────────────────────────────────
  useEffect(() => {
    if (!resolvedConfigId) return;
    setConfigLoading(true);
    deductionApi
      .getById(resolvedConfigId)
      .then((response) => {
        const body = response.data as any;
        setConfig(body?.data || body || null);
      })
      .catch(() => toast.error("Failed to load deduction config"))
      .finally(() => setConfigLoading(false));
  }, [resolvedConfigId]);

  // ─── Load Assigned Employees (server-side search/status/pagination) ──
  useEffect(() => {
    if (!resolvedConfigId) return;
    setAssignedLoading(true);
    employeeDeductionApi
      .getAll({
        page,
        limit: pageSize,
        deductionItemId: resolvedConfigId ?? undefined,
        ...(debouncedSearch.trim() && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
      })
      .then((response) => {
        const body = response.data as any;
        const data = body?.data || [];
        setAssignedDeductions(Array.isArray(data) ? data : []);
        const pagination = body?.pagination;
        if (pagination) {
          setTotalPages(pagination.totalPages || 1);
          setTotalItems(pagination.totalItems || 0);
        }
      })
      .catch((error) => {
        console.error("Failed to load assigned deductions:", error);
        setAssignedDeductions([]);
      })
      .finally(() => setAssignedLoading(false));
  }, [resolvedConfigId, page, pageSize, debouncedSearch, statusFilter, refetchKey]);

  // ─── Refetch helper (used by callbacks that need to reload) ──
  const refetch = () => {
    setRefetchKey((k) => k + 1);
  };

  // ─── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = assignedDeductions.length;
    const active = assignedDeductions.filter(
      (d) => d.status === "ACTIVE",
    ).length;
    const completed = assignedDeductions.filter(
      (d) => d.status === "COMPLETED",
    ).length;
    const paused = assignedDeductions.filter(
      (d) => d.status === "PAUSED",
    ).length;
    const cancelled = assignedDeductions.filter(
      (d) => d.status === "CANCELLED",
    ).length;
    return { total, active, completed, paused, cancelled };
  }, [assignedDeductions]);

  // ─── Helpers ─────────────────────────────────────────────────
  /**
   * Formats a numeric amount with an optional currency prefix.
   *
   * @param amount - The numeric amount to format.
   * @param currency - The currency code (defaults to "ETB").
   * @returns A formatted currency string or "-" if amount is null/undefined.
   */
  const formatCurrency = (amount?: number | null, currency?: string) => {
    if (amount == null) return "-";
    const curr = currency || "ETB";
    return `${curr} ${amount.toLocaleString()}`;
  };

  /**
   * Formats a numeric percentage value.
   *
   * @param percent - The percentage value to format.
   * @returns A formatted percentage string or "-" if null/undefined.
   */
  const formatPercent = (percent?: number | null) => {
    if (percent == null) return "-";
    return `${percent}%`;
  };

  /**
   * Looks up the human-readable label for a deduction calculation type.
   *
   * @param type - The calculation type key.
   * @returns The display label or the raw type string if not found.
   */
  const getCalculationLabel = (type?: DeductionCalculationType | null) => {
    if (!type) return "—";
    return (
      CALCULATION_TYPE_OPTIONS.find((o) => o.value === type)?.label || type
    );
  };

  const meta = config
    ? DEDUCTION_TYPE_META[config.deductionType] || DEDUCTION_TYPE_META.OTHER
    : null;
  const hasFixedValue = config?.amount != null || config?.percent != null;

  // ─── Bulk-Assign Handlers ────────────────────────────────────
  const openBulkAssign = async () => {
    setSelectedBulkIds(new Set());
    setBulkEmployeeValues({});
    setBulkSearch("");
    setBulkEmployeesLoading(true);
    try {
      const response = await employeeApi.getAll({
        status: "ACTIVE",
        page: 1,
        limit: 1000,
      });
      const body = response.data as any;
      const data = body?.data || [];
      setBulkEmployees(Array.isArray(data) ? data : []);
    } catch {
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
      setSelectedBulkIds(new Set(filteredBulkEmployees.map((e) => e.id)));
    }
  };

  const handleBulkSelectOne = (id: string) => {
    const next = new Set(selectedBulkIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedBulkIds(next);
  };

  const handleBulkEmployeeValueChange = (
    employeeId: string,
    field: "amount" | "percent",
    value: number | null,
  ) => {
    setBulkEmployeeValues((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], [field]: value },
    }));
  };

  const handleBulkAssign = async () => {
    if (!config?.id) return;
    if (selectedBulkIds.size === 0) {
      toast.warning("Select at least one employee");
      return;
    }

    // Validate Type B values
    if (config.calculationType === "FIXED_AMOUNT" && !config.amount) {
      for (const id of selectedBulkIds) {
        if (
          bulkEmployeeValues[id]?.amount == null ||
          bulkEmployeeValues[id].amount! < 0
        ) {
          toast.error("Amount is required for all selected employees");
          return;
        }
      }
    }
    if (
      (config.calculationType === "PERCENTAGE_OF_BASIC" ||
        config.calculationType === "PERCENTAGE_OF_GROSS") &&
      !config.percent
    ) {
      for (const id of selectedBulkIds) {
        if (
          bulkEmployeeValues[id]?.percent == null ||
          bulkEmployeeValues[id].percent! > 100
        ) {
          toast.error("Percent (0-100) is required for all selected employees");
          return;
        }
      }
    }

    setBulkSaving(true);
    try {
      const assignments = Array.from(selectedBulkIds).map((id) => ({
        employeeId: id,
        amount: config.amount ?? bulkEmployeeValues[id]?.amount ?? null,
        percent: config.percent ?? bulkEmployeeValues[id]?.percent ?? null,
      }));

      await employeeDeductionApi.bulkAssign({
        deductionConfigId: config.id,
        assignments,
      });

      toast.success(
        `Assigned "${config.label}" to ${assignments.length} employee(s)`,
      );
      setBulkModalOpen(false);
      setPage(1);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to assign deductions";
      toast.error(msg);
    } finally {
      setBulkSaving(false);
    }
  };

  const filteredBulkEmployees = useMemo(() => {
    if (!bulkSearch.trim()) return bulkEmployees;
    const s = bulkSearch.toLowerCase();
    return bulkEmployees.filter(
      (e) =>
        e.firstName.toLowerCase().includes(s) ||
        e.lastName.toLowerCase().includes(s) ||
        (e.email && e.email.toLowerCase().includes(s)),
    );
  }, [bulkEmployees, bulkSearch]);

  // ─── Edit Handlers ───────────────────────────────────────────
  const openEdit = (ded: EmployeeDeduction) => {
    setEditDeduction(ded);
    setEditForm({
      status: ded.status || "ACTIVE",
      label: ded.label || "",
      amount: ded.amount ?? null,
      percent: ded.percent ?? null,
      description: ded.description || "",
    });
  };

  const handleEditSave = async () => {
    if (!editDeduction?.id) return;
    setEditSaving(true);
    try {
      await employeeDeductionApi.update(editDeduction.id, {
        deductionItemId: resolvedConfigId ?? undefined,
        status: editForm.status as EmployeeDeductionStatus,
        label: editForm.label,
        amount: editForm.amount,
        percent: editForm.percent,
        description: editForm.description,
      });
      toast.success("Deduction updated");
      setEditDeduction(null);
      refetch();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "Failed to update deduction";
      toast.error(msg);
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Delete Handler ─────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await employeeDeductionApi.delete(deleteConfirm, {
        deductionItemId: resolvedConfigId ?? undefined,
      });
      toast.success("Deduction cancelled successfully");
      setDeleteConfirm(null);
      setPage(1);
      refetch();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "Failed to cancel deduction";
      toast.error(msg);
      setDeleteConfirm(null);
    }
  };

  // ─── Not Found State (only after both config + data fail) ────
  if (
    !config &&
    !configLoading &&
    !assignedLoading &&
    assignedDeductions.length === 0
  ) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Deduction Not Found
          </h2>
          <p className="text-slate-500 mb-6">
            The deduction type you're looking for doesn't exist or has been
            removed.
          </p>
          <Button
            onClick={() => navigate("/employee-deductions")}
            variant="secondary"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Employee Deductions
          </Button>
        </div>
      </div>
    );
  }

  // ─── Skeleton helper for hero section ───────────────────────
  const heroSkeleton = !config;

  const AVATAR_COLORS = [
    'bg-brand-primary text-white',
    'bg-blue-100 text-blue-700',
    'bg-amber-100 text-amber-700',
    'bg-purple-100 text-purple-700',
    'bg-rose-100 text-rose-700',
  ];

  return (
    <div className="space-y-10 pb-20 px-4 md:px-8">
      {/* ─── Navigation & Context ────────────────────────── */}
      <button
        onClick={() => navigate("/employee-deductions")}
        className="group inline-flex items-center gap-2.5 text-slate-400 hover:text-slate-900 text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        Return to Registry
      </button>

      {/* ─── Component Blueprint Header ───────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-8 border-b border-slate-200">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 flex-wrap mb-4">
            {heroSkeleton ? (
              <div className="h-10 w-64 bg-slate-100 animate-pulse rounded-xl" />
            ) : (
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{config!.label}</h1>
            )}
            {!heroSkeleton && (
              <span className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm",
                hasFixedValue ? 'bg-brand-50 border-emerald-100 text-emerald-700' : 'bg-blue-50 border-blue-100 text-blue-700'
              )}>
                {hasFixedValue ? 'Corporate (Type B)' : 'Voluntary (Type C)'}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-6">
            {!heroSkeleton && (
              <>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">System Type</span>
                  <span className="text-sm font-bold text-slate-700 font-mono bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 w-fit">{config!.deductionType}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">Registry Code</span>
                  <span className="text-sm font-bold text-slate-900 truncate tracking-tight">{resolvedConfigId?.slice(0, 12)}...</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">Calculation Model</span>
                  <span className="text-sm font-black text-slate-900">
                    {getCalculationLabel(config!.calculationType)}
                    {config!.amount != null && <span className="text-emerald-600 ml-2">ETB {config!.amount.toLocaleString()}</span>}
                    {config!.percent != null && <span className="text-blue-600 ml-2">{config!.percent}%</span>}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Primary Actions - Expert Style */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={openBulkAssign}
            disabled={heroSkeleton}
            className="flex items-center gap-2.5 px-6 py-3 text-xs font-black uppercase tracking-widest text-white bg-primary border-2 border-brand-800/30 rounded-xl hover:bg-brand-800 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            Add Personnel
          </button>
          <button
            disabled={heroSkeleton}
            className="flex items-center gap-2.5 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            Edit Blueprint
          </button>
        </div>
      </div>

      {/* ─── Filter & Status Dashboard ─────────────────── */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          {[
            { key: '', label: 'Full Register', count: stats.total, color: 'slate' },
            { key: 'ACTIVE', label: 'Active', count: stats.active, color: 'emerald' },
            { key: 'COMPLETED', label: 'Fulfilled', count: stats.completed, color: 'blue' },
            { key: 'PAUSED', label: 'On Hold', count: stats.paused, color: 'amber' },
            { key: 'CANCELLED', label: 'Void', count: stats.cancelled, color: 'rose' },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                className={cn(
                  "inline-flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all cursor-pointer",
                  isActive 
                    ? `border-${tab.color}-500 bg-${tab.color}-50 text-${tab.color}-700 shadow-sm`
                    : "border-slate-100 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <span className={cn(
                  "text-base font-black tabular-nums",
                  isActive ? `text-${tab.color}-900` : "text-slate-900"
                )}>
                  {tab.count}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── Employee Register Table ─────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
          {/* Table Control Bar */}
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between gap-6 bg-slate-50/30">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Find personnel by name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-10 py-2.5 text-sm border-2 border-brand-200 focus:border-brand-400 rounded-xl focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-medium"
              />
              {search && (
                <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Displaying {assignedDeductions.length} Records</div>
              <div className="w-px h-6 bg-slate-200 mx-2" />
              <button className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {assignedLoading && (
              <div className="py-24 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto" />
                <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">Accessing Registry...</p>
              </div>
            )}

            {!assignedLoading && assignedDeductions.length === 0 && (
              <div className="py-24 text-center">
                <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-6 border border-slate-100">
                  <Users className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Register is Empty</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">No employees are currently assigned to this component within the selected filter.</p>
                <button onClick={openBulkAssign} className="mt-8 px-8 py-3 text-xs font-black uppercase tracking-widest text-white bg-slate-900 rounded-2xl hover:bg-slate-800 transition-all cursor-pointer">
                  Assign Personnel
                </button>
              </div>
            )}

            {!assignedLoading && assignedDeductions.length > 0 && (
              <table className="w-full text-left border-collapse border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Personnel Identity</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Organization Unit</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-right">Payroll Impact</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Compliance Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignedDeductions.map((ded, idx) => {
                    const badge = STATUS_BADGE[ded.status as EmployeeDeductionStatus] || STATUS_BADGE.ACTIVE;
                    const initials = ded.employee ? `${ded.employee.firstName?.[0] || ""}${ded.employee.lastName?.[0] || ""}` : "??";
                    const fullName = ded.employee ? `${ded.employee.firstName || ""} ${ded.employee.lastName || ""}` : "Unknown";
                    const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                    return (
                      <tr key={ded.id} className="group hover:bg-slate-50/80 transition-all cursor-pointer">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={cn("w-11 h-11 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-lg shadow-brand-900/20 border-2 border-brand-200 transition-transform group-hover:scale-110", avatarColor)}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-base tracking-tight truncate leading-none">{fullName}</p>
                              <p className="text-[11px] text-slate-400 font-bold font-mono mt-1.5 uppercase tracking-wider opacity-60">REF: {ded.refNo || 'NO-REF'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-bold text-slate-700">{ded.employee?.departmentName || '\u2014'}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-60">Verified Dept</p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <p className="text-base font-black text-rose-600 tabular-nums tracking-tight">
                            {ded.calculationType === "FIXED_AMOUNT"
                              ? `-ETB ${Number(ded.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                              : ded.calculationType?.startsWith("PERCENTAGE")
                                ? `${ded.percent ?? 0}%`
                                : ded.calculationType === "REMAINING_BALANCE"
                                  ? `-ETB ${Number(ded.paymentPlan?.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                  : "\u2014"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-60">Monthly Deduction</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                            badge.bg, badge.text, "border-current/10"
                          )}>
                            <span className={cn("w-2 h-2 rounded-full", badge.dot)} />
                            {STATUS_OPTIONS.find((o) => o.value === ded.status)?.label || ded.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            <button
                              onClick={() => openEdit(ded)}
                              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer shadow-sm active:scale-90"
                              title="Update Allocation"
                            >
                              <Pencil className="w-4.5 h-4.5" />
                            </button>
                            {ded.id && ded.status !== "COMPLETED" && ded.status !== "CANCELLED" && (
                              <button
                                onClick={() => setDeleteConfirm(ded.id!)}
                                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition-all cursor-pointer shadow-sm active:scale-90"
                                title="Void Record"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && !assignedLoading && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="font-medium">
                  {totalItems} item{totalItems !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-1.5">
                  <span>per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="border-2 border-brand-200 focus:border-brand-400 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    {[5, 10, 20, 50].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 3, totalPages - 6));
                  return start + i;
                }).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      p === page
                        ? "bg-brand-50 text-emerald-700 border border-brand-200"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals (only render when config is loaded) ──────── */}
      {config && (
        <>
          {/* ─── Bulk Assign Modal ──────────────────────────────── */}
          <Modal
            isOpen={bulkModalOpen}
            onClose={() => setBulkModalOpen(false)}
            title={`Mass Assignment: ${config.label}`}
            size="lg"
            footer={
              <ConfigModalFooter
                onCancel={() => setBulkModalOpen(false)}
                onSave={handleBulkAssign}
                isEdit={false}
                saving={bulkSaving}
                saveLabel="Initialize Mass Allocation"
              />
            }
          >
            <div className="space-y-6 px-2 py-4">
              {/* Blueprint Indicator */}
              <div className={cn(
                "p-6 rounded-[2.5rem] border shadow-inner transition-colors",
                hasFixedValue ? 'bg-brand-50 border-emerald-100' : 'bg-blue-50 border-blue-100'
              )}>
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white shrink-0",
                    hasFixedValue ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                  )}>
                    {meta?.icon || <Users className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Active Blueprint</p>
                    <p className="font-black text-slate-900 text-lg tracking-tight leading-none truncate">{config.label}</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1.5 opacity-80">
                      {getCalculationLabel(config.calculationType)}
                      {config.amount != null && <span className="ml-1.5 font-black text-emerald-600">ETB {config.amount.toLocaleString()}</span>}
                      {config.percent != null && <span className="ml-1.5 font-black text-blue-600">{config.percent}%</span>}
                      {!hasFixedValue && <span className="ml-1.5 text-amber-600 font-bold uppercase tracking-wider italic">Variable rate protocol</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Registry Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter personnel registry..."
                  value={bulkSearch}
                  onChange={(e) => setBulkSearch(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 py-3 text-sm bg-white border-2 border-brand-200 focus:border-brand-400 rounded-2xl outline-none transition-all font-medium shadow-sm"
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
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Select Results ({filteredBulkEmployees.length})</span>
                </label>
                {selectedBulkIds.size > 0 && (
                  <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10">
                    {selectedBulkIds.size} Target Profiles
                  </div>
                )}
              </div>

              {/* High-Density Grid */}
              <div className="max-h-80 overflow-y-auto rounded-[2.5rem] border border-slate-200 bg-slate-50/40 p-2 space-y-1.5 custom-scrollbar">
                {bulkEmployeesLoading ? (
                  <div className="py-20 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mx-auto" />
                  </div>
                ) : filteredBulkEmployees.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs font-black uppercase tracking-widest">No matching records</div>
                ) : (
                  filteredBulkEmployees.map((emp) => {
                    const isSelected = selectedBulkIds.has(emp.id);
                    return (
                      <div
                        key={emp.id}
                        className={cn(
                          "flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all cursor-pointer",
                          isSelected
                            ? 'bg-white border-slate-900 shadow-md translate-x-1'
                            : 'bg-transparent border-transparent hover:bg-white/80 hover:border-slate-200'
                        )}
                        onClick={() => handleBulkSelectOne(emp.id)}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                          isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-200 bg-white'
                        )}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-brand-primary border-2 border-brand-200 shadow-lg shadow-brand-900/20 flex items-center justify-center text-[10px] font-black text-white shrink-0 uppercase tracking-widest">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm tracking-tight truncate leading-none">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate mt-1">{emp.departmentName || 'General Register'}</p>
                        </div>
                        {/* Per-profile value input (Type B only) */}
                        {!hasFixedValue && isSelected && (
                          <div className="w-32 shrink-0 animate-in slide-in-from-right-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center bg-white border-2 border-brand-200 rounded-xl overflow-hidden focus-within:border-brand-400 transition-colors shadow-sm">
                              <input
                                type="number"
                                value={bulkEmployeeValues[emp.id]?.[config.calculationType === 'FIXED_AMOUNT' ? 'amount' : 'percent'] ?? ''}
                                onChange={(e) => handleBulkEmployeeValueChange(
                                  emp.id,
                                  config.calculationType === 'FIXED_AMOUNT' ? 'amount' : 'percent',
                                  e.target.value ? Number(e.target.value) : null
                                )}
                                placeholder={config.calculationType === 'FIXED_AMOUNT' ? '0.00' : '0'}
                                className="w-full px-3 py-2 text-sm font-bold text-slate-900 outline-none tabular-nums"
                              />
                              <span className="px-3 py-2 text-[10px] font-black text-slate-300 border-l border-slate-100 bg-slate-50">
                                {config.calculationType === 'FIXED_AMOUNT' ? 'ETB' : '%'}
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
          </Modal>

          {/* ─── Individual Record Edit Modal ───────────────────── */}
          <Modal
            isOpen={!!editDeduction}
            onClose={() => setEditDeduction(null)}
            title={`Audit Record: ${editForm.label}`}
            size="md"
            footer={
              <ConfigModalFooter
                onCancel={() => setEditDeduction(null)}
                onSave={handleEditSave}
                isEdit={true}
                saving={editSaving}
                saveLabel="Synchronize Changes"
              />
            }
          >
            <div className="space-y-6 px-2 py-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Protocol Identifier</label>
                <Input
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  placeholder="Record label"
                  className="h-12 border-brand-200 rounded-2xl focus:border-brand-400 border-2 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Lifecycle Status</label>
                  <Select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    options={STATUS_OPTIONS}
                    className="h-12 border-brand-200 rounded-2xl border-2"
                  />
                </div>
                {editDeduction?.calculationType === "FIXED_AMOUNT" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Verified Amount (ETB)</label>
                    <Input
                      type="number"
                      value={editForm.amount ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value ? Number(e.target.value) : null })}
                      className="h-12 border-brand-200 rounded-2xl focus:border-brand-400 border-2 font-bold tabular-nums"
                    />
                  </div>
                )}
                {editDeduction?.calculationType?.startsWith("PERCENTAGE") && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Impact Factor (%)</label>
                    <Input
                      type="number"
                      value={editForm.percent ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, percent: e.target.value ? Number(e.target.value) : null })}
                      className="h-12 border-brand-200 rounded-2xl focus:border-brand-400 border-2 font-bold tabular-nums"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">System Audit Notes</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Add record context..."
                  className="w-full px-5 py-4 rounded-2xl border-2 border-brand-200 focus:border-brand-400 text-sm font-medium transition-all resize-none bg-slate-50/50"
                  rows={3}
                />
              </div>
            </div>
          </Modal>

          {/* ─── Delete Confirmation Modal ──────────────────────── */}
          <Modal
            isOpen={!!deleteConfirm}
            onClose={() => setDeleteConfirm(null)}
            title="Cancel Deduction"
            size="sm"
            footer={
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirm(null)}
                >
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
              <p className="text-slate-700 font-medium">
                Are you sure you want to cancel this deduction?
              </p>
              <p className="text-sm text-slate-500 mt-2">
                This action will mark the deduction as cancelled and stop future
                deductions.
              </p>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};
