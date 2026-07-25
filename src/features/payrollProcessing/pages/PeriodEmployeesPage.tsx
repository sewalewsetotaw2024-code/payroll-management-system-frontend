import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Play,
  Users,
  X,
  Search,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatCurrency, slugify } from "../../../lib/utils";
import { useAppSelector } from "../../../store/hooks";
import { useRolePermissions } from "../../../hooks/useRolePermissions";
import { useHrGeneralistFallback } from "../../attendance/hooks/useHrGeneralistFallback";
import {
  payrollRunApi,
  type PayrollRun,
  type PayrollRunItem,
} from "../api/payrollProcessingApi";
import { payrollPeriodApi } from "../../configuration/api/configurationApi";
import type { PayrollPeriod } from "../../configuration/types/configuration.types";
import {
  listBatchesByPeriod,
  listBatchEmployees,
} from "../../payrollBatch/api";
import type { PayrollBatch, PayrollBatchEmployeeItem } from "../../payrollBatch/types";
import { EmployeePayrollBreakdown } from "../components/EmployeePayrollBreakdown";
import { Pagination } from "../../../components/ui";
import { exportPayrollToExcel } from "../utils/exportPayrollExcel";
import { ExpandablePayrollTable } from "../components/ExpandablePayrollTable";
import { BatchGenerateButton } from "../../payrollRun/components/BatchGenerateButton";
import { attendanceApi } from "../../attendance/api/attendanceApi";
import { toast } from "../../../components/ui/Toast";

type ProcessingStatus = "idle" | "processing" | "success" | "error";

const fmt = (value: number | string | undefined | null, currency = "ETB") => {
  if (value == null) return `${currency} 0`;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return formatCurrency(num, currency);
};

export const PeriodEmployeesPage: React.FC = () => {
  const { periodSlug } = useParams<{ periodSlug: string }>();
  const navigate = useNavigate();

  // ── Data state ─────────────────────────────────────────
  const [resolvedPeriodId, setResolvedPeriodId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [batchEmployees, setBatchEmployees] = useState<PayrollBatchEmployeeItem[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [items, setItems] = useState<PayrollRunItem[]>([]);
  const [allItems, setAllItems] = useState<PayrollRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ────────────────────────────────────────────
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>("__ALL__");
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("idle");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState<{
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  } | null>(null);

  // Modal
  const [selectedItem, setSelectedItem] = useState<{
    runId: string;
    itemId: string;
  } | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Batch selection state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  // Attendance approval status
  const [attendanceApproved, setAttendanceApproved] = useState(false);

  // Payment approval status
  const [paymentApproved, setPaymentApproved] = useState(false);

  // Refetch counter
  const [itemsVersion, setItemsVersion] = useState(0);

  // ── Derived ─────────────────────────────────────────────

  const currentRun = useMemo(() => {
    if (!selectedBatchId || selectedBatchId === "__ALL__") {
      // When "All", prefer the run without a specific batch, or the latest
      return runs.find((r) => !r.payrollBatchId) ?? runs[0] ?? null;
    }
    return runs.find((r) => r.payrollBatchId === selectedBatchId) ?? null;
  }, [runs, selectedBatchId]);

  // ── Data fetching ───────────────────────────────────────

  useEffect(() => {
    if (!periodSlug) return;

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // First, resolve the slug to a period by fetching all periods
        const allPeriodsRes = await payrollPeriodApi.getAll();
        const allPeriods = allPeriodsRes.data?.data ?? [];
        const matchedPeriod = allPeriods.find((p: any) => p.name && slugify(p.name) === periodSlug);

        if (!matchedPeriod?.id) {
          if (!cancelled) {
            setError("Period not found");
            setLoading(false);
          }
          return;
        }

        const periodId = matchedPeriod.id;
        setResolvedPeriodId(periodId);

        const [periodRes, batchesRes, runsRes, imports] = await Promise.all([
          payrollPeriodApi.getById(periodId),
          listBatchesByPeriod({ payrollPeriodId: periodId, page: 1, limit: 100 }),
          payrollRunApi.getRuns({ payrollPeriodId: periodId, limit: 100, _t: Date.now() }),
          attendanceApi.getAttendanceByPeriod(periodId),
        ]);

        if (cancelled) return;

        setPeriod(periodRes.data?.data ?? null);
        setBatches(batchesRes.batches ?? []);
        setRuns(runsRes.data?.data ?? []);

        // Check if the active attendance import is approved
        const activeImport = (imports || []).find((imp) => imp.isActive);
        setAttendanceApproved(activeImport?.status === "APPROVED");

        // Check if payment is fully approved
        const fetchedRuns = runsRes.data?.data ?? [];
        setPaymentApproved(fetchedRuns.some((r: any) => r.status === "APPROVED" || r.status === "DONE"));

        // Default batch selection
        const batchList: PayrollBatch[] = batchesRes.batches ?? [];
        if (batchList.length > 0) {
          setSelectedBatchId("__ALL__");
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || err?.message || "Failed to load data",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [periodSlug]);

  // ── Batch employees / items fetching ────────────────────

  useEffect(() => {
    if (!selectedBatchId || selectedBatchId === "__ALL__") {
      // "All Employees": show all from attendance by clearing batch filter
      // But we still need to show something — show payroll items if a run exists
      setBatchEmployees([]);
      return;
    }

    let cancelled = false;

    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await listBatchEmployees({
          batchId: selectedBatchId,
          page: 1,
          limit: 500,
        });
        if (!cancelled) {
          setBatchEmployees(res.items ?? []);
        }
      } catch {
        if (!cancelled) setBatchEmployees([]);
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    };

    fetchEmployees();
    return () => { cancelled = true; };
  }, [selectedBatchId]);

  // Fetch payroll items when the current run changes
  useEffect(() => {
    if (!currentRun) {
      setItems([]);
      setAllItems([]);
      setPaginationMeta(null);
      return;
    }

    let cancelled = false;

    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const [itemsRes, allRes] = await Promise.all([
          payrollRunApi.getRunItems(currentRun.id, { page, limit: pageSize }),
          payrollRunApi.getRunItems(currentRun.id, { page: 1, limit: 1000 }),
        ]);
        if (!cancelled) {
          setItems(itemsRes.data.data);
          setPaginationMeta(itemsRes.data.pagination);
          setAllItems(allRes.data.data);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setAllItems([]);
          setPaginationMeta(null);
        }
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    };

    fetchItems();
    return () => { cancelled = true; };
  }, [currentRun?.id, page, pageSize, itemsVersion]);

  // ── Handlers ────────────────────────────────────────────

  const handleProcessPayroll = async () => {
    if (!resolvedPeriodId) return;

    const batchId =
      selectedBatchId === "__ALL__"
        ? undefined
        : (selectedBatchId ?? undefined);

    // Confirmation if reprocessing
    if (currentRun && items.length > 0) {
      const confirmed = window.confirm(
        `This period already has ${items.length} processed employee(s). Re-processing will replace the existing data. Continue?`,
      );
      if (!confirmed) return;
    }

    setProcessingStatus("processing");
    setProcessingError(null);

    try {
      await payrollRunApi.runPayroll({
        payrollPeriodId: resolvedPeriodId,
        batchId,
        page: 1,
        limit: 500,
      });

      setProcessingStatus("success");

      // Refresh runs and items
      const runsRes = await payrollRunApi.getRuns({
        payrollPeriodId: resolvedPeriodId,
        limit: 100,
        _t: Date.now(),
      });
      setRuns(runsRes.data?.data ?? []);
      setItemsVersion((v) => v + 1);

      setTimeout(() => setProcessingStatus("idle"), 3000);
    } catch (err: any) {
      setProcessingError(
        err?.response?.data?.message || err?.message || "Failed to process",
      );
      setProcessingStatus("error");
    }
  };

  const handleExportExcel = async () => {
    if (!currentRun || allItems.length === 0) return;
    const periodName = period?.name || "Payroll";
    setExporting(true);
    try {
      await exportPayrollToExcel(currentRun.id, allItems, currentRun, periodName);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to export payroll");
    } finally {
      setExporting(false);
    }
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllEmployees = () => {
    if (selectedEmployeeIds.size === filteredBatchEmployees.length) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(filteredBatchEmployees.map((be) => be.employee?.id).filter(Boolean) as string[]));
    }
  };

  const handleProcessSelected = async () => {
    const ids = Array.from(selectedEmployeeIds);
    if (ids.length === 0 || !resolvedPeriodId) return;

    setProcessingStatus("processing");
    setProcessingError(null);

    try {
      for (const employeeId of ids) {
        await payrollRunApi.runPayroll({
          payrollPeriodId: resolvedPeriodId,
          employeeId,
          page: 1,
          limit: 1,
        });
      }

      setProcessingStatus("success");

      // Refresh runs and items
      const runsRes = await payrollRunApi.getRuns({
        payrollPeriodId: resolvedPeriodId,
        limit: 100,
        _t: Date.now(),
      });
      setRuns(runsRes.data?.data ?? []);
      setSelectedEmployeeIds(new Set());
      setItemsVersion((v) => v + 1);

      setTimeout(() => setProcessingStatus("idle"), 3000);
    } catch (err: any) {
      setProcessingError(
        err?.response?.data?.message || err?.message || "Failed to process selected employees",
      );
      setProcessingStatus("error");
    }
  };

  const handlePageChange = (newPage: number) => setPage(newPage);
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const isPeriodClosed = period?.status === "CLOSED" || period?.status === "DONE";
  const isProcessing = processingStatus === "processing";

  // ── Role-based access ──────────────────────────────────
  const userRole = useAppSelector((state) => state.auth.user?.role?.name ?? null);
  const { hasPermission } = useRolePermissions();
  const { blockedByFallback: hrManagerBlocked } = useHrGeneralistFallback();
  const canRunPayroll = hasPermission('canRunPayroll') && !hrManagerBlocked;

  const selectedBatch = selectedBatchId && selectedBatchId !== "__ALL__"
    ? batches.find((b) => b.id === selectedBatchId)
    : null;
  const isBatchInactive = !!selectedBatch && selectedBatch.status !== "ACTIVE";

  const disableProcess = isPeriodClosed || isProcessing || !attendanceApproved || !canRunPayroll || isBatchInactive;

  // Determine which data to show in the table
  const showAttendanceEmployees = batchEmployees.length > 0 && (!currentRun || items.length === 0);
  const showPayrollItems = items.length > 0;
  const hasAnyData = showAttendanceEmployees || showPayrollItems || loadingEmployees || loadingItems;

  // ── Search filtering ───────────────────────────────────
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((item) => {
      const name = `${item.employee?.firstName ?? ""} ${item.employee?.lastName ?? ""}`.toLowerCase();
      const dept = (item.employee?.department?.name ?? "").toLowerCase();
      const pos = (item.employee?.jobTitle ?? item.employee?.jobPosition ?? "").toLowerCase();
      return name.includes(normalizedQuery) || dept.includes(normalizedQuery) || pos.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);

  const filteredBatchEmployees = useMemo(() => {
    if (!normalizedQuery) return batchEmployees;
    return batchEmployees.filter((be) => {
      const name = `${be.employee?.firstName ?? ""} ${be.employee?.lastName ?? ""}`.toLowerCase();
      const dept = (be.employee?.department?.name ?? "").toLowerCase();
      const pos = (be.employee?.position?.title ?? "").toLowerCase();
      return name.includes(normalizedQuery) || dept.includes(normalizedQuery) || pos.includes(normalizedQuery);
    });
  }, [batchEmployees, normalizedQuery]);

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-10 pb-12 relative">
      {/* Processing Toast - Modern Glassy */}
      <AnimatePresence>
        {processingStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-24 right-8 z-[100]"
          >
            <div
              className={cn(
                "px-8 py-5 rounded-[2.5rem] shadow-2xl border backdrop-blur-2xl flex items-center gap-5 transition-all duration-500",
                processingStatus === "processing" &&
                  "glass border-white text-slate-800",
                processingStatus === "success" &&
                  "bg-brand-primary border-brand-400 text-white",
                processingStatus === "error" &&
                  "bg-rose-600 border-rose-400 text-white",
              )}
            >
              {processingStatus === "processing" ? (
                <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                </div>
              ) : processingStatus === "success" ? (
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
                  <Check className="w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
                  <X className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <p className="font-black text-sm tracking-tight">
                  {processingStatus === "processing" && "Processing Payroll..."}
                  {processingStatus === "success" && "Payroll Calculated"}
                  {processingStatus === "error" && "Processing Failed"}
                </p>
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                    processingStatus === "processing" && "text-slate-500",
                    processingStatus === "success" && "text-emerald-100",
                    processingStatus === "error" && "text-rose-100",
                  )}
                >
                  {processingStatus === "success" &&
                    "All net pay amounts verified."}
                  {processingStatus === "error" &&
                    (processingError || "System Error")}
                </p>
              </div>
              {processingStatus !== "processing" && (
                <button
                  onClick={() => {
                    setProcessingStatus("idle");
                    setProcessingError(null);
                  }}
                  className="ml-4 p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 opacity-70" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employee Breakdown Modal */}
      <EmployeePayrollBreakdown
        runId={selectedItem?.runId ?? ""}
        itemId={selectedItem?.itemId ?? ""}
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
      />

      {/* ── Gradient Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 rounded-[3rem] p-10 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-400/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />

        <div className="relative z-10">
          {/* Back link */}
          <button
            onClick={() => navigate("/payroll")}
            className="group inline-flex items-center gap-2 text-white/60 hover:text-white text-xs font-black uppercase tracking-[0.2em] transition-all mb-6"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Cycles
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
            {/* Left: Title + Meta */}
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight leading-none">
                    {period?.name || "Loading..."}
                  </h1>
                  <p className="text-brand-100 font-bold text-xs uppercase tracking-widest mt-2">Payroll Processing &bull; Period Detail</p>
                </div>
              </div>

              {/* Meta pills */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
                  <span className="text-[9px] font-black text-emerald-200 uppercase tracking-widest">Pay Period</span>
                  <span className="text-sm font-bold text-white">
                    {period
                      ? `${new Date(period.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${new Date(period.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: 'numeric' })}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
                  <span className="text-[9px] font-black text-emerald-200 uppercase tracking-widest">Payment</span>
                  <span className="text-sm font-bold text-white">
                    {period?.dateOfPayment
                      ? new Date(period.dateOfPayment).toLocaleDateString("en-US", { month: "short", day: "numeric", year: 'numeric' })
                      : "Scheduled"}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
                  <span className="text-[9px] font-black text-emerald-200 uppercase tracking-widest">Cycle</span>
                  <span className="text-sm font-bold text-white">{period?.cycle ?? "Monthly"}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
                  <span className="text-[9px] font-black text-emerald-200 uppercase tracking-widest">Status</span>
                  {currentRun
                    ? <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-100 text-[10px] font-black uppercase tracking-widest border border-emerald-400/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Calculated
                      </span>
                    : <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-100 text-[10px] font-black uppercase tracking-widest border border-amber-400/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Awaiting
                      </span>
                  }
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 flex-wrap shrink-0">
              {batches.length > 0 && (
                <div className="relative group">
                  <select
                    value={selectedBatchId ?? ""}
                    onChange={(e) => setSelectedBatchId(e.target.value || null)}
                    className="appearance-none bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-3 pr-10 text-xs font-bold text-white focus:border-white/40 focus:ring-4 focus:ring-white/10 transition-all cursor-pointer min-w-[180px]"
                  >
                    <option value="__ALL__" className="text-slate-900">All Personnel</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id} className="text-slate-900">
                        {b.name}{b.status !== "ACTIVE" ? ` (${b.status.charAt(0)}${b.status.slice(1).toLowerCase()})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50 pointer-events-none transition-transform group-hover:translate-y-[-40%]" />
                </div>
              )}

              <button
                onClick={handleProcessPayroll}
                disabled={disableProcess}
                title={hrManagerBlocked ? "HR Generalist is responsible for this while active" : !canRunPayroll ? "You don't have permission to process payroll" :!attendanceApproved ? "Attendance must be fully approved before processing" : isPeriodClosed ? "This period is closed" : isProcessing ? "Processing in progress" : "Run payroll for this period"}
                className={cn(
                  "inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95",
                  disableProcess
                    ? "bg-white/10 text-white/40 cursor-not-allowed shadow-none border border-white/10"
                    : "bg-white text-brand-primary hover:bg-white/90 shadow-2xl",
                )}
              >
                {processingStatus === "processing" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                {processingStatus === "processing" ? "Processing..." : "Process Payroll"}
              </button>

              {currentRun && items.length > 0 && (
                <button
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all shadow-lg active:scale-95 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  {exporting ? "Exporting..." : "Export"}
                </button>
              )}

              {currentRun && items.length > 0 && ["PENDING_PAYMENT_APPROVAL", "APPROVED", "DONE"].includes(currentRun.status) && (
                <BatchGenerateButton
                  payrollRunId={currentRun.id}
                  onComplete={() => setItemsVersion((v) => v + 1)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Decorative swoosh */}
        <svg className="absolute bottom-0 right-0 w-48 h-48 text-white/5 -mb-12 -mr-12 pointer-events-none" viewBox="0 0 200 200" fill="none">
          <path d="M0 200C60 160 100 120 140 80C160 60 180 40 200 0V200H0Z" fill="currentColor" />
        </svg>
      </div>

      {/* Summary Bento Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Personnel', value: allItems.length || items.length, icon: Users, color: 'text-brand-primary', bg: 'bg-white/50' },
          { label: 'Total Gross', value: fmt(items.reduce((s, i) => s + Number(i.grossSalary), 0)), icon: FileSpreadsheet, color: 'text-blue-500', bg: 'bg-white/50' },
          { label: 'Deductions', value: fmt(items.reduce((s, i) => s + Number(i.totalDeductions), 0)), icon: X, color: 'text-rose-500', bg: 'bg-white/50' },
          { label: 'Net Payable', value: fmt(items.reduce((s, i) => s + Number(i.netSalary), 0)), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-white/50' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-[2rem] p-6 shadow-xl border-white flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300"
          >
            <div className={cn("w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center ring-1 ring-slate-100 group-hover:scale-110 transition-transform", stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
              <p className="text-xl font-black text-slate-900 tracking-tight font-mono mt-1 truncate">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-3" />
          <span className="text-slate-500">Loading payroll data...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertCircle className="w-12 h-12 text-rose-400" />
          <p className="text-sm text-rose-600 font-bold">{error}</p>
        </div>
      )}

      {/* Employee Table Section */}
      {!loading && !error && (
        <div className="glass rounded-[3rem] shadow-2xl border-white overflow-hidden">
          {/* Table Toolbar */}
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between gap-6 flex-wrap bg-white/40">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search by name, department, or position..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-72 pl-12 pr-6 py-3 bg-white border-2 border-brand-200 rounded-2xl text-sm focus:border-brand-400 focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedBatchId && selectedBatchId !== "__ALL__" && currentRun && (
                <span className="px-4 py-1.5 rounded-xl bg-brand-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  {batches.find((b) => b.id === selectedBatchId)?.name ?? "Batch"}
                </span>
              )}
              <span className="px-4 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                {normalizedQuery ? `${showPayrollItems ? filteredItems.length : filteredBatchEmployees.length} of ` : ""}
                {showPayrollItems
                  ? paginationMeta?.totalItems ?? items.length
                  : batchEmployees.length}{" "}
                Records
              </span>
              <button className="w-11 h-11 flex items-center justify-center rounded-2xl glass border-white text-slate-400 hover:text-brand-primary hover:bg-white transition-all shadow-sm active:scale-90" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Loading */}
          {(loadingItems || loadingEmployees) && !showPayrollItems && !showAttendanceEmployees && (
            <div className="p-8 text-center flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
              <p className="text-sm text-slate-500">Loading employees...</p>
            </div>
          )}

          {/* Payroll Items Table */}
          {showPayrollItems && (
            <>
              <ExpandablePayrollTable
                items={filteredItems}
                runId={currentRun?.id ?? ''}
                loading={loadingItems}
                onSelectItem={(runId, itemId) => setSelectedItem({ runId, itemId })}
              />

              {/* Pagination */}
              {paginationMeta && paginationMeta.totalPages > 0 && (
                <div className="border-t border-slate-100">
                  <Pagination
                    currentPage={page}
                    totalPages={paginationMeta.totalPages}
                    totalItems={paginationMeta.totalItems}
                    onPageChange={handlePageChange}
                    pageSize={pageSize}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </div>
              )}
            </>
          )}

          {/* Attendance Employees Table (before processing) */}
          {!showPayrollItems && showAttendanceEmployees && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="w-10 px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={filteredBatchEmployees.length > 0 && selectedEmployeeIds.size === filteredBatchEmployees.length}
                        onChange={toggleAllEmployees}
                        className="rounded border-slate-300 accent-brand-600 cursor-pointer"
                      />
                    </th>
                    <th className="border-r border-slate-200/50 text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Employee</th>
                    <th className="border-r border-slate-200/50 text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Department</th>
                    <th className="border-r border-slate-200/50 text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Position</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-32">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatchEmployees.map((be, idx) => {
                    const employeeId = be.employee?.id ?? "";
                    const isSelected = selectedEmployeeIds.has(employeeId);
                    return (
                      <tr
                        key={be.id}
                        onClick={() => toggleEmployee(employeeId)}
                        className={cn(
                          "border-b border-slate-100 transition-colors cursor-pointer",
                          idx % 2 === 0 ? "bg-slate-50/40" : "bg-white",
                          isSelected ? "bg-brand-50/80 hover:bg-brand-50" : "hover:bg-brand-50/60",
                        )}
                      >
                        <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEmployee(employeeId)}
                            className="rounded border-slate-300 accent-brand-600 cursor-pointer"
                          />
                        </td>
                        <td className="border-r border-slate-200/50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-white">
                                {(be.employee?.firstName?.[0] ?? "") +
                                  (be.employee?.lastName?.[0] ?? "")}
                              </span>
                            </div>
                            <span className="font-semibold text-slate-800">
                              {be.employee?.firstName} {be.employee?.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="border-r border-slate-200/50 px-4 py-3 text-slate-500">
                          {be.employee?.department?.name || "\u2014"}
                        </td>
                        <td className="border-r border-slate-200/50 px-4 py-3 text-slate-500">
                          {be.employee?.position?.title || "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded border border-amber-200">
                            Pending
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty state — Not Processed */}
          {!loading && !loadingEmployees && !loadingItems && !showAttendanceEmployees && !showPayrollItems && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-lg font-black text-slate-700 tracking-tight">
                Not Processed
              </p>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto font-medium">
                {hrManagerBlocked
                  ? "HR Generalist is responsible for processing payroll while active in your company."
                  : !canRunPayroll
                  ? "You don't have permission to process payroll. Contact your administrator."
                  : batches.length === 0
                    ? "Create payroll batches first, then return here to process payroll."
                    : !attendanceApproved
                      ? "Attendance must be fully approved before payroll can be processed."
                      : isBatchInactive
                        ? `This batch is ${selectedBatch!.status.toLowerCase()} — activate it before processing payroll.`
                        : "Click \"Process Payroll\" to calculate employee pay for this period."}
              </p>
            </div>
          )}


          {/* Bottom footer — processed */}
          {currentRun && items.length > 0 && (
            <div className="border-t border-slate-100 p-8 flex items-center justify-between bg-white/40">
              <div className="flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-slate-400">
                <span className="text-slate-700">
                  {paginationMeta?.totalItems ?? items.length} Personnel
                </span>
                <span>
                  Gross:{" "}
                  <span className="font-mono text-slate-900 ml-1">{fmt(items.reduce((s, i) => s + Number(i.grossSalary), 0))}</span>
                </span>
                <span>
                  Net:{" "}
                  <span className="font-mono text-brand-primary ml-1">{fmt(items.reduce((s, i) => s + Number(i.netSalary), 0))}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleProcessPayroll}
                  disabled={disableProcess}
                  title={hrManagerBlocked ? "HR Generalist is responsible for this while active" : !canRunPayroll ? "You don't have permission to process payroll" :!attendanceApproved ? "Attendance must be approved before processing" : isPeriodClosed ? "This period is closed" : isProcessing ? "Processing in progress" : "Run payroll for these employees"}
                  className={cn(
                    "inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg",
                    disableProcess
                      ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                      : "bg-brand-primary text-white hover:bg-brand-dark shadow-brand-900/10",
                  )}
                >
                  {processingStatus === "processing" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {processingStatus === "processing" ? "Processing..." : "Recalculate"}
                </button>
              </div>
            </div>
          )}

          {/* Pre-process footer */}
          {!showPayrollItems && showAttendanceEmployees && (
            <div className="border-t border-slate-200 p-4 flex items-center justify-between bg-brand-50/30">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{filteredBatchEmployees.length}</span> employees ready for processing
              </div>
              <div className="flex items-center gap-2">
                {selectedEmployeeIds.size > 0 && (
                  <button
                    onClick={handleProcessSelected}
                    disabled={disableProcess}
                    title={hrManagerBlocked ? "HR Generalist is responsible for this while active" : !canRunPayroll ? "You don't have permission to process payroll" :!attendanceApproved ? "Attendance must be approved before processing" : isPeriodClosed ? "This period is closed" : isProcessing ? "Processing in progress" : "Process selected employees"}
                      className={cn(
                        "inline-flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 border-2",
                        disableProcess
                          ? "bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                          : "bg-primary border-brand-800/30 text-white hover:bg-brand-700",
                      )}
                  >
                    {processingStatus === "processing" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Process Selected ({selectedEmployeeIds.size})
                  </button>
                )}
                <button
                  onClick={handleProcessPayroll}
                  disabled={disableProcess}
                  title={hrManagerBlocked ? "HR Generalist is responsible for this while active" : !canRunPayroll ? "You don't have permission to process payroll" :!attendanceApproved ? "Attendance must be approved before processing" : isPeriodClosed ? "This period is closed" : isProcessing ? "Processing in progress" : "Run payroll for these employees"}
                  className={cn(
                    "inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm active:scale-95",
                    disableProcess
                      ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                        : "bg-primary text-white hover:bg-brand-700",
                  )}
                >
                  {processingStatus === "processing" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  {processingStatus === "processing" ? "Processing..." : "Process Payroll"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
