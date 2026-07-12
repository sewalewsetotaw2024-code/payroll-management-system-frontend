import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Receipt,
  X,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Modal, Input, Select, Button } from "../../../components/ui";
import { ConfigModalFooter } from "./shared";
import { toast } from "../../../components/ui/Toast";
import { cn } from "../../../lib/utils";
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
  const { configId } = useParams<{ configId: string }>();
  const navigate = useNavigate();

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
    if (!configId) return;
    setConfigLoading(true);
    deductionApi
      .getById(configId)
      .then((response) => {
        const body = response.data as any;
        setConfig(body?.data || body || null);
      })
      .catch(() => toast.error("Failed to load deduction config"))
      .finally(() => setConfigLoading(false));
  }, [configId]);

  // ─── Load Assigned Employees (server-side search/status/pagination) ──
  useEffect(() => {
    if (!configId) return;
    setAssignedLoading(true);
    employeeDeductionApi
      .getAll({
        page,
        limit: pageSize,
        deductionItemId: configId,
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
  }, [configId, page, pageSize, debouncedSearch, statusFilter, refetchKey]);

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
    return { total, active, completed, paused };
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
        deductionItemId: configId,
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
        deductionItemId: configId,
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

  return (
    <div className="space-y-8 pb-12">
      {/* ─── Back Button ──────────────────────────────────── */}
      <button
        onClick={() => navigate("/employee-deductions")}
        className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-all"
      >
        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-all shadow-sm">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span>Back to Employee Deductions</span>
      </button>

      {/* ─── Hero ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 rounded-[2.5rem] p-8 shadow-xl shadow-emerald-200/40">
        {/* Decorative background elements */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-start gap-5">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg ring-1 ring-white/20">
              {heroSkeleton ? (
                <div className="w-8 h-8 bg-white/20 rounded-lg animate-pulse" />
              ) : meta ? (
                <span className="text-3xl text-white">{meta.icon}</span>
              ) : (
                <Receipt className="w-8 h-8 text-white" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {heroSkeleton ? (
                  <>
                    <div className="h-8 w-56 bg-white/20 rounded-lg animate-pulse" />
                    <div className="h-5 w-28 bg-white/20 rounded-lg animate-pulse" />
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {config!.label}
                    </h1>
                    <span
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        hasFixedValue
                          ? "bg-emerald-400/30 text-emerald-100 ring-1 ring-emerald-300/30"
                          : "bg-blue-400/30 text-blue-100 ring-1 ring-blue-300/30"
                      }`}
                    >
                      {hasFixedValue ? "TYPE A — FIXED" : "TYPE B — PER-EMP"}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {heroSkeleton ? (
                  <div className="h-4 w-72 bg-white/20 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-sm text-emerald-100 font-medium">
                      {config!.deductionType.replace(/_/g, " ")}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-emerald-400/50" />
                    <span className="text-sm text-emerald-100 font-medium">
                      {getCalculationLabel(config!.calculationType)}
                    </span>
                    {config!.amount != null && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-emerald-400/50" />
                        <span className="text-sm text-white font-bold">
                          ETB {config!.amount.toLocaleString()}
                        </span>
                      </>
                    )}
                    {config!.percent != null && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-emerald-400/50" />
                        <span className="text-sm text-white font-bold">
                          {config!.percent}%
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Add Employees Button */}
          <Button
            onClick={openBulkAssign}
            disabled={heroSkeleton}
            className="bg-white/20 hover:bg-white/30 text-white border-0 shadow-lg backdrop-blur-sm ring-1 ring-white/20 hover:ring-white/30 transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            size="lg"
          >
            <Plus className="w-5 h-5" /> Add Employees
          </Button>
        </div>
      </div>

      {/* ─── Stats Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Assigned",
            value: stats.total,
            icon: <Users className="w-5 h-5" />,
            gradient: "from-slate-50 to-white",
            border: "border-slate-200",
            text: "text-slate-900",
            accent: "text-slate-400",
          },
          {
            label: "Active",
            value: stats.active,
            icon: <CheckCircle className="w-5 h-5" />,
            gradient: "from-emerald-50 to-white",
            border: "border-emerald-200",
            text: "text-emerald-700",
            accent: "text-emerald-500",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: <Clock className="w-5 h-5" />,
            gradient: "from-blue-50 to-white",
            border: "border-blue-200",
            text: "text-blue-700",
            accent: "text-blue-500",
          },
          {
            label: "Paused",
            value: stats.paused,
            icon: <AlertCircle className="w-5 h-5" />,
            gradient: "from-amber-50 to-white",
            border: "border-amber-200",
            text: "text-amber-700",
            accent: "text-amber-500",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden bg-gradient-to-br ${stat.gradient} border ${stat.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={stat.accent}>{stat.icon}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {stat.label}
              </span>
            </div>
            <p className={`text-3xl font-black ${stat.text}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Employee List ───────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Assigned Employees
                <span className="ml-2 text-sm font-medium text-slate-400">
                  ({totalItems})
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Employees with this deduction type assigned
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-56 pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Status Filter */}
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "All Status" },
                  ...STATUS_OPTIONS,
                ]}
                className="min-w-[130px]"
              />
            </div>
          </div>
        </div>

        {/* Table / List */}
        <div className="overflow-x-auto">
          {/* Loading state */}
          {assignedLoading && (
            <div className="p-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
                <p className="text-slate-500 font-medium">
                  Loading assigned employees...
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!assignedLoading && assignedDeductions.length === 0 && (
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                No employees assigned yet
              </h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                Click the "Add Employees" button above to assign{" "}
                <span className="font-semibold text-slate-700">
                  {config?.label || "..."}
                </span>{" "}
                to employees.
              </p>
              <Button onClick={openBulkAssign} variant="primary">
                <Plus className="w-4 h-4" /> Add Employees
              </Button>
            </div>
          )}

          {/* Data table */}
          {!assignedLoading && assignedDeductions.length > 0 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Employee
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Amount
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {assignedDeductions.map((ded) => {
                  const badge =
                    STATUS_BADGE[ded.status as EmployeeDeductionStatus] ||
                    STATUS_BADGE.ACTIVE;
                  const initials = ded.employee
                    ? `${ded.employee.firstName?.[0] || ""}${ded.employee.lastName?.[0] || ""}`
                    : "??";
                  const fullName = ded.employee
                    ? `${ded.employee.firstName || ""} ${ded.employee.lastName || ""}`
                    : "Unknown Employee";
                  const dept = ded.employee?.departmentName;
                  const position = ded.employee?.jobPosition;

                  return (
                    <tr
                      key={ded.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                            {initials || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">
                              {fullName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {position && (
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {position}
                                </span>
                              )}
                              {dept && (
                                <>
                                  {position && (
                                    <span className="text-slate-200">|</span>
                                  )}
                                  <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                                    {dept}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-emerald-600">
                            {ded.calculationType === "FIXED_AMOUNT"
                              ? formatCurrency(ded.amount)
                              : ded.calculationType?.startsWith("PERCENTAGE")
                                ? formatPercent(ded.percent)
                                : ded.calculationType === "REMAINING_BALANCE"
                                  ? formatCurrency(ded.paymentPlan?.totalAmount)
                                  : "-"}
                          </span>
                          {ded.refNo && (
                            <span className="text-[10px] text-blue-500 font-mono font-medium mt-0.5">
                              Ref: {ded.refNo}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold uppercase border",
                            badge.bg,
                            badge.text,
                            badge.border,
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              badge.dot,
                            )}
                          />
                          {STATUS_OPTIONS.find((o) => o.value === ded.status)
                            ?.label || ded.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(ded)}
                            className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer active:scale-90"
                            title="Edit deduction"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {ded.id &&
                            ded.status !== "COMPLETED" &&
                            ded.status !== "CANCELLED" && (
                              <button
                                onClick={() => setDeleteConfirm(ded.id!)}
                                className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer active:scale-90"
                                title="Cancel deduction"
                              >
                                <X className="w-4 h-4" />
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
                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
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
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
          <Modal
            isOpen={bulkModalOpen}
            onClose={() => setBulkModalOpen(false)}
            title={`Assign "${config.label}" to Employees`}
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
            <div className="space-y-4">
              {/* Config Info Banner */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-3">
                  {meta && <span className={meta.accent}>{meta.icon}</span>}
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{config.label}</p>
                    <p className="text-xs text-slate-500">
                      {getCalculationLabel(config.calculationType)}
                      {config.amount != null &&
                        ` — ETB ${config.amount.toLocaleString()}`}
                      {config.percent != null && ` — ${config.percent}%`}
                      {!config.amount &&
                        !config.percent &&
                        " (enter per employee)"}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                      hasFixedValue
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {hasFixedValue ? "FIXED" : "PER-EMP"}
                  </span>
                </div>
              </div>

              {/* Per-Employee Value Notice (Type B) */}
              {!config.amount &&
                !config.percent &&
                config.calculationType === "FIXED_AMOUNT" && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 font-medium">
                      This template requires an amount for each employee. Enter
                      it below.
                    </p>
                  </div>
                )}
              {!config.amount &&
                !config.percent &&
                (config.calculationType === "PERCENTAGE_OF_BASIC" ||
                  config.calculationType === "PERCENTAGE_OF_GROSS") && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 font-medium">
                      This template requires a percentage for each employee.
                      Enter it below.
                    </p>
                  </div>
                )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search employees..."
                  value={bulkSearch}
                  onChange={(e) => setBulkSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      filteredBulkEmployees.length > 0 &&
                      selectedBulkIds.size === filteredBulkEmployees.length
                    }
                    onChange={handleBulkSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Select All ({filteredBulkEmployees.length})
                  </span>
                </label>
                <span className="text-xs text-slate-500">
                  {selectedBulkIds.size} selected
                </span>
              </div>

              {/* Employee List */}
              <div className="max-h-80 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2">
                {bulkEmployeesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                  </div>
                ) : filteredBulkEmployees.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No employees found
                  </div>
                ) : (
                  filteredBulkEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        selectedBulkIds.has(emp.id)
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedBulkIds.has(emp.id)}
                        onChange={() => handleBulkSelectOne(emp.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0"
                      />
                      <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {emp.firstName[0]}
                        {emp.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {emp.jobPosition || "No position"}
                          {emp.departmentName && ` • ${emp.departmentName}`}
                        </p>
                      </div>
                      {/* Per-employee value input (Type B only) */}
                      {!config.amount &&
                        !config.percent &&
                        selectedBulkIds.has(emp.id) && (
                          <div className="w-28 flex-shrink-0">
                            {config.calculationType === "FIXED_AMOUNT" && (
                              <Input
                                type="number"
                                value={bulkEmployeeValues[emp.id]?.amount ?? ""}
                                onChange={(e) =>
                                  handleBulkEmployeeValueChange(
                                    emp.id,
                                    "amount",
                                    e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  )
                                }
                                placeholder="Amount"
                                className="text-sm"
                              />
                            )}
                            {(config.calculationType ===
                              "PERCENTAGE_OF_BASIC" ||
                              config.calculationType ===
                                "PERCENTAGE_OF_GROSS") && (
                              <Input
                                type="number"
                                value={
                                  bulkEmployeeValues[emp.id]?.percent ?? ""
                                }
                                onChange={(e) =>
                                  handleBulkEmployeeValueChange(
                                    emp.id,
                                    "percent",
                                    e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  )
                                }
                                placeholder="%"
                                className="text-sm"
                              />
                            )}
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Modal>

          {/* ─── Edit Deduction Modal ───────────────────────────── */}
          <Modal
            isOpen={!!editDeduction}
            onClose={() => setEditDeduction(null)}
            title={`Edit: ${editForm.label || "Deduction"}`}
            size="md"
            footer={
              <ConfigModalFooter
                onCancel={() => setEditDeduction(null)}
                onSave={handleEditSave}
                isEdit={true}
                saving={editSaving}
                saveLabel="Save Changes"
              />
            }
          >
            <div className="space-y-5">
              {/* Label */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Label
                </label>
                <Input
                  value={editForm.label}
                  onChange={(e) =>
                    setEditForm({ ...editForm, label: e.target.value })
                  }
                  placeholder="Deduction label"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Status
                </label>
                <Select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  options={STATUS_OPTIONS}
                />
              </div>

              {/* Amount / Percent (depending on calculation type) */}
              {editDeduction &&
                editDeduction.calculationType === "FIXED_AMOUNT" && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Amount
                    </label>
                    <Input
                      type="number"
                      value={editForm.amount ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          amount: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      placeholder="Enter amount"
                    />
                  </div>
                )}
              {editDeduction &&
                editDeduction.calculationType?.startsWith("PERCENTAGE") && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Percent (%)
                    </label>
                    <Input
                      type="number"
                      value={editForm.percent ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          percent: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      placeholder="0-100"
                      min={0}
                      max={100}
                    />
                  </div>
                )}

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  placeholder="Additional notes..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
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
