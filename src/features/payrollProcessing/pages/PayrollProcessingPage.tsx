import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Play,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Users,
  Clock,
  Loader2,
  Check,
  X,
  RefreshCw,
  Banknote,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { cn, formatCurrency } from "../../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { StatCardProps, SummaryItemProps } from "../../../types/ui.types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { payrollRunApi } from "../api/payrollProcessingApi";
import type { PayrollRun, PayrollRunItem } from "../api/payrollProcessingApi";
import { payrollPeriodApi } from "../../configuration/api/configurationApi";
import { EmployeePayrollBreakdown } from "../components/EmployeePayrollBreakdown";
import { Pagination } from "../../../components/ui";
import type { PayrollBatch } from "../../payrollBatch/types";
import type { PayrollBatchEmployeeItem } from "../../payrollBatch/types";
import {
  listBatchesByPeriod,
  listBatchEmployees,
} from "../../payrollBatch/api";
import { exportPayrollToExcel } from "../utils/exportPayrollExcel";

/** Current status of the payroll processing workflow. */
type ProcessingStatus = "idle" | "processing" | "success" | "error";

/** Tracks progress while processing payroll for a large batch of employees. */
interface ProcessingProgress {
  processed: number;
  total: number;
}

/**
 * PayrollProcessingPage component that serves as the main entry point for payroll processing.
 * Displays period stats, run summary chart, employee breakdown list, and validation warnings.
 */
export const PayrollProcessingPage: React.FC = () => {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [items, setItems] = useState<PayrollRunItem[]>([]);
  const [allItems, setAllItems] = useState<PayrollRunItem[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus>("idle");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] =
    useState<ProcessingProgress | null>(null);

  // Pagination state for employee list
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState<{
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  } | null>(null);

  // Modal state for employee breakdown
  const [selectedItem, setSelectedItem] = useState<{
    runId: string;
    itemId: string;
  } | null>(null);

  // ── Batch-driven workflow state ─────────────────────────────
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [processingBatchIndex, setProcessingBatchIndex] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // ── Single employee processing state ─────────────────────────────
  const [batchEmployees, setBatchEmployees] = useState<
    PayrollBatchEmployeeItem[]
  >([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Counter to force items refetch after processing (even if currentRun.id hasn't changed)
  const [itemsVersion, setItemsVersion] = useState(0);

  /** Colour palette used for the run summary bar chart segments. */
  const chartColors = {
    basic: "#047857",
    net: "#059669",
    tax: "#e11d48",
    pension: "#d97706",
    deductions: "#6366f1",
    overtime: "#8b5cf6",
    gross: "#0f766e",
  };

  /**
   * Fetches payroll runs (with optional period filter) and period data.
   * Employee items are fetched separately via an effect that watches currentRun.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const periodId = selectedPeriodId;

      const [runsRes, periodRes, periodsRes] = await Promise.all([
        payrollRunApi.getRuns({
          limit: 100,
          ...(periodId ? { payrollPeriodId: periodId } : {}),
          _t: Date.now(),
        }),
        payrollPeriodApi.getCurrent().catch(() => null),
        payrollPeriodApi.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      const fetchedRuns = runsRes.data.data;
      setRuns(fetchedRuns);
      setCurrentPeriod(periodRes?.data?.data || null);
      const fetchedPeriods = periodsRes.data.data || [];
      // Sort: active/current period first, then by start date descending
      const sortedPeriods = [...fetchedPeriods].sort((a: any, b: any) => {
        const now = new Date();
        const aActive =
          new Date(a.startDate) <= now && new Date(a.endDate) >= now;
        const bActive =
          new Date(b.startDate) <= now && new Date(b.endDate) >= now;
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return (
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
      });
      setPeriods(sortedPeriods);
      if (!periodId && sortedPeriods.length > 0) {
        setSelectedPeriodId(sortedPeriods[0].id);
      }

      // Items are fetched by the dedicated effect — just clear if no runs
      if (fetchedRuns.length === 0) {
        setItems([]);
        setAllItems([]);
        setPaginationMeta(null);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load payroll data",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Updates the current page number for the employee list pagination. */
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  /** Updates the page size and resets to page 1 for the employee list. */
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  /** Fetch batches when the selected period changes. Default to "All Employees". */
  useEffect(() => {
    if (!selectedPeriodId) return;
    setSelectedBatchId("__ALL__");
    setProcessingBatchIndex(null);
    listBatchesByPeriod({
      payrollPeriodId: selectedPeriodId,
      page: 1,
      limit: 100,
    })
      .then((res) => {
        const batchList: PayrollBatch[] = res.batches || [];
        setBatches(batchList);
        if (batchList.length === 1) setSelectedBatchId(batchList[0].id);
      })
      .catch(() => setBatches([]));
  }, [selectedPeriodId]);

  /** Fetch employees when the selected batch changes (skip for "All Employees"). */
  useEffect(() => {
    if (!selectedBatchId || selectedBatchId === "__ALL__") {
      setBatchEmployees([]);
      setSelectedEmployeeId(null);
      return;
    }
    setLoadingEmployees(true);
    listBatchEmployees({ batchId: selectedBatchId, page: 1, limit: 500 })
      .then((res) => {
        setBatchEmployees(res.items || []);
        setSelectedEmployeeId(null);
      })
      .catch(() => {
        setBatchEmployees([]);
        setSelectedEmployeeId(null);
      })
      .finally(() => setLoadingEmployees(false));
  }, [selectedBatchId]);

  // ── Derived state ──────────────────────────────────────
  /** The current run to display — determined by selected batch, or latest run if none selected. */
  const currentRun = useMemo<PayrollRun | null>(() => {
    if (runs.length === 0) return null;
    if (!selectedBatchId || selectedBatchId === "__ALL__") {
      // "All Employees" or no batch: show the run without a batch (or the latest)
      return runs.find((r) => !r.payrollBatchId) ?? runs[0];
    }
    return runs.find((r) => r.payrollBatchId === selectedBatchId) ?? null;
  }, [runs, selectedBatchId]);

  /** All runs belonging to the currently selected period. */
  const periodRuns = useMemo(() => {
    if (!selectedPeriodId) return [];
    return runs.filter((r) => r.payrollPeriodId === selectedPeriodId);
  }, [runs, selectedPeriodId]);

  /** Aggregated totals across all batch runs in the selected period. */
  const allBatchesTotal = useMemo(
    () => ({
      totalGross: periodRuns.reduce((s, r) => s + Number(r.totalGross), 0),
      totalNet: periodRuns.reduce((s, r) => s + Number(r.totalNet), 0),
      totalCostToCompany: periodRuns.reduce(
        (s, r) => s + Number(r.totalCostToCompany),
        0,
      ),
      totalTax: periodRuns.reduce((s, r) => s + Number(r.totalTax), 0),
      totalPension: periodRuns.reduce((s, r) => s + Number(r.totalPension), 0),
      totalOvertime: periodRuns.reduce(
        (s, r) => s + Number(r.totalOvertime),
        0,
      ),
      employeeCount: periodRuns.reduce(
        (s, r) => s + Number(r.employeeCount),
        0,
      ),
      runCount: periodRuns.length,
    }),
    [periodRuns],
  );

  /** Resets to page 1 when switching to a different payroll run. */
  useEffect(() => {
    setPage(1);
    setPaginationMeta(null);
  }, [currentRun?.id]);

  /** Fetch items for the current run whenever it changes or pagination changes. */
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
    return () => {
      cancelled = true;
    };
  }, [currentRun?.id, page, pageSize, itemsVersion]);

  /**
   * Runs payroll for the selected batch (or all attendance employees) of the selected period.
   * Single-shot (processes one batch, user clicks again for the next).
   */
  const handleProcessPayroll = async () => {
    const periodId = selectedPeriodId;
    const batchId =
      selectedBatchId === "__ALL__"
        ? undefined
        : (selectedBatchId ?? undefined);

    if (!periodId) {
      setProcessingError("Select a payroll period first.");
      setProcessingStatus("error");
      setTimeout(() => {
        setProcessingStatus("idle");
        setProcessingError(null);
      }, 4000);
      return;
    }
    if (!selectedBatchId) {
      setProcessingError('Select a batch or "All Employees" to process.');
      setProcessingStatus("error");
      setTimeout(() => {
        setProcessingStatus("idle");
        setProcessingError(null);
      }, 4000);
      return;
    }

    // Duplicate processing guard: if a run already exists for this period/batch, confirm re-run
    // We only have items in local state (fetched separately), not on the PayrollRun object.
    if (currentRun && items.length > 0) {
      const confirmed = window.confirm(
        `This period already has ${items.length} processed employee(s). Re-processing will replace the existing data. Continue?`,
      );
      if (!confirmed) return;
    }

    setProcessingStatus("processing");
    setProcessingError(null);
    setProcessingProgress(null);

    try {
      const res = await payrollRunApi.runPayroll({
        payrollPeriodId: periodId,
        batchId,
        page: 1,
        limit: 500,
      });

      const { data } = res.data;

      setProcessingProgress({
        processed: data.processedCount,
        total: data.totalEmployees,
      });

      // Update batch index tracking (skip for "All Employees" mode)
      if (batchId) {
        const currentBatchIdx = batches.findIndex((b) => b.id === batchId);
        if (currentBatchIdx >= 0) {
          setProcessingBatchIndex({
            current: currentBatchIdx + 1,
            total: batches.length,
          });
        }
      } else {
        setProcessingBatchIndex(null);
      }

      setProcessingStatus("success");
      await fetchData();
      setItemsVersion((v) => v + 1);
      setTimeout(() => {
        setProcessingStatus("idle");
        setProcessingProgress(null);
      }, 3000);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to process payroll";
      setProcessingError(message);
      setProcessingStatus("error");
      await fetchData();
    }
  };

  /**
   * Runs payroll for a single employee or all employees in the selected batch.
   * When selectedEmployeeId is "__ALL__", processes all employees (batch mode).
   */
  const handleProcessSingleEmployee = async () => {
    const periodId = selectedPeriodId;
    const employeeId = selectedEmployeeId;

    if (!periodId) {
      setProcessingError("Select a payroll period first.");
      setProcessingStatus("error");
      setTimeout(() => {
        setProcessingStatus("idle");
        setProcessingError(null);
      }, 4000);
      return;
    }
    if (!employeeId) {
      setProcessingError('Select an employee or "All employees" to process.');
      setProcessingStatus("error");
      setTimeout(() => {
        setProcessingStatus("idle");
        setProcessingError(null);
      }, 4000);
      return;
    }

    const isAllEmployees = employeeId === "__ALL__";

    setProcessingStatus("processing");
    setProcessingError(null);
    setProcessingProgress(null);

    try {
      const res = await payrollRunApi.runPayroll({
        payrollPeriodId: periodId,
        batchId: selectedBatchId ?? undefined,
        ...(isAllEmployees ? {} : { employeeId }),
        page: 1,
        limit: isAllEmployees ? 500 : 1,
      });

      const { data } = res.data;
      setProcessingProgress({
        processed: data.processedCount,
        total: data.totalEmployees,
      });
      setProcessingStatus("success");
      await fetchData();
      setItemsVersion((v) => v + 1);
      setTimeout(() => {
        setProcessingStatus("idle");
        setProcessingProgress(null);
      }, 3000);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to process payroll";
      setProcessingError(message);
      setProcessingStatus("error");
      await fetchData();
    }
  };

  /** Exports the current payroll run data to an Excel workbook. */
  const handleExportExcel = () => {
    if (!currentRun || items.length === 0) return;
    exportPayrollToExcel(items, currentRun, periodName);
  };

  /** Derive display period info from selected period or latest run. */
  const displayPeriod = selectedPeriodId
    ? periods.find((p: any) => p.id === selectedPeriodId) ||
      currentPeriod ||
      currentRun?.payrollPeriod
    : currentPeriod || currentRun?.payrollPeriod;

  const periodName = displayPeriod?.name
    ? `${displayPeriod.name}`
    : "No active period";

  const periodDateRange = displayPeriod
    ? `${new Date(displayPeriod.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${new Date(displayPeriod.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : "No period selected";

  /**
   * Formats a numeric value as a currency string.
   * @param value - The numeric value to format.
   * @param currency - Optional currency code. Defaults to 'ETB'.
   * @returns The formatted currency string (e.g., "ETB 1,000.00") or "ETB 0" for null/undefined.
   */
  const fmt = (value: number | string | undefined | null, currency = 'ETB') => {
    if (value == null) return `${currency} 0`;
    const num = typeof value === "string" ? parseFloat(value) : value;
    return formatCurrency(num, currency);
  };

  /** Formats a numeric value as a short human-readable string (e.g. 1.2M, 450K). */
  const fmtShort = (value: number | undefined | null) => {
    if (value == null) return "0";
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  /** Derives chart-compatible data points from the latest payroll run summary. */
  const chartData = currentRun
    ? [
        {
          name: "Gross Pay",
          amount: Number(currentRun.totalGross),
          fill: chartColors.gross,
        },
        {
          name: "Net Pay",
          amount: Number(currentRun.totalNet),
          fill: chartColors.net,
        },
        {
          name: "Income Tax",
          amount: Number(currentRun.totalTax),
          fill: chartColors.tax,
        },
        {
          name: "Pension",
          amount: Number(currentRun.totalPension),
          fill: chartColors.pension,
        },
        {
          name: "Overtime",
          amount: Number(currentRun.totalOvertime),
          fill: chartColors.overtime,
        },
      ].filter((d) => d.amount > 0)
    : [];

  /** Filters employee items where the deduction cap has been breached (validation warnings). */
  const issues = items.filter((i) => i.deductionCapBreached);

  /** Data for the cost-distribution donut chart. */
  const pieColors = {
    net: "#059669",
    tax: "#e11d48",
    pension: "#d97706",
    overtime: "#8b5cf6",
    bonus: "#0ea5e9",
  };
  const costDistributionData = currentRun
    ? [
        {
          name: "Net Pay",
          value: Number(currentRun.totalNet),
          fill: pieColors.net,
        },
        {
          name: "Income Tax",
          value: Number(currentRun.totalTax),
          fill: pieColors.tax,
        },
        {
          name: "Pension",
          value: Number(currentRun.totalPension),
          fill: pieColors.pension,
        },
        {
          name: "Overtime",
          value: Number(currentRun.totalOvertime),
          fill: pieColors.overtime,
        },
        {
          name: "Bonus",
          value: Number(currentRun.totalBonus || 0),
          fill: pieColors.bonus,
        },
      ].filter((d) => d.value > 0)
    : [];

  /** Data for the salary-distribution line chart — employees sorted by net salary. */
  const salaryDistributionData = [...allItems]
    .sort((a, b) => Number(a.netSalary) - Number(b.netSalary))
    .map((item, idx) => ({
      rank: idx + 1,
      employee:
        `${item.employee?.firstName ?? ""} ${item.employee?.lastName ?? ""}`.trim() ||
        `#${idx + 1}`,
      grossSalary: Number(item.grossSalary),
      netSalary: Number(item.netSalary),
      deductions: Number(item.grossSalary) - Number(item.netSalary),
    }));
  const totalGrossForChart = salaryDistributionData.reduce(
    (s, d) => s + d.grossSalary,
    0,
  );
  const totalDeductionsForChart = salaryDistributionData.reduce(
    (s, d) => s + d.deductions,
    0,
  );
  const totalNetForChart = salaryDistributionData.reduce(
    (s, d) => s + d.netSalary,
    0,
  );

  const statCards: StatCardProps[] = [
    {
      label: "Payroll Period",
      main: periodName,
      sub: periodDateRange,
      icon: Calendar,
      iconColor: "text-emerald-500",
    },
    {
      label: "Working Days",
      main: currentRun ? `${currentRun.monthlyWorkdays} days` : "—",
      sub: "Configurable",
      icon: Clock,
      iconColor: "text-blue-500",
    },
    {
      label: "Employees",
      main: currentRun ? String(currentRun.employeeCount) : "—",
      sub: currentRun
        ? `Total gross: ${fmtShort(Number(currentRun.totalGross))}`
        : "No runs yet",
      icon: Users,
      iconColor: "text-purple-500",
      subClassName: currentRun
        ? "text-emerald-600 font-bold"
        : "text-slate-400",
    },
    {
      label: "Processing Status",
      main: currentRun ? currentRun.status.replace(/_/g, " ") : "Not Processed",
      sub: currentRun
        ? `Net pay: ${fmtShort(Number(currentRun.totalNet))}`
        : "Run payroll to start",
      icon: currentRun ? CheckCircle2 : AlertCircle,
      iconColor: currentRun ? "text-emerald-500" : "text-amber-500",
      mainClassName: currentRun ? "text-emerald-600" : "text-amber-600",
    },
  ];

  const summaryItems: SummaryItemProps[] = currentRun
    ? [
        {
          label: "Total Gross Income",
          value: fmt(Number(currentRun.totalGross)),
        },
        {
          label: "Income Tax",
          value: fmt(Number(currentRun.totalTax)),
          valueClassName: "text-rose-600",
        },
        {
          label: "Employee Pension",
          value: fmt(Number(currentRun.totalPension)),
          valueClassName: "text-amber-600",
        },
        {
          label: "Total Overtime",
          value: fmt(Number(currentRun.totalOvertime)),
          valueClassName: "text-indigo-600",
        },
        {
          label: "Cost to Company",
          value: fmt(Number(currentRun.totalCostToCompany)),
          valueClassName: "text-emerald-600",
        },
        { label: "Other Deductions", value: "—" },
      ]
    : [];

  return (
    <div className="space-y-6 pb-12 relative">
      {/* Employee Breakdown Modal */}
      <EmployeePayrollBreakdown
        runId={selectedItem?.runId ?? ""}
        itemId={selectedItem?.itemId ?? ""}
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
      />

      {/* Batch progress indicator */}
      {processingBatchIndex && (
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">
            Batch{" "}
            {batches[processingBatchIndex.current - 1]?.name ??
              `#${processingBatchIndex.current}`}
          </span>
          <span className="text-emerald-400">·</span>
          <span>
            {processingBatchIndex.current} of {processingBatchIndex.total}{" "}
            batches processed
          </span>
          {currentRun && (
            <>
              <span className="text-emerald-400">·</span>
              <span>
                Cost to company: {fmt(Number(currentRun.totalCostToCompany))}
              </span>
              <span className="text-emerald-400">·</span>
              <span>{currentRun.employeeCount} employees</span>
            </>
          )}
        </div>
      )}

      {/* Processing Toast */}
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
                "px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 transition-all duration-500",
                processingStatus === "processing" &&
                  "bg-white border-slate-200 text-slate-800",
                processingStatus === "success" &&
                  "bg-[#047857] border-emerald-600 text-white",
                processingStatus === "error" &&
                  "bg-rose-600 border-rose-700 text-white",
              )}
            >
              {processingStatus === "processing" ? (
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                </div>
              ) : processingStatus === "success" ? (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <X className="w-5 h-5 text-white" />
                </div>
              )}

              <div>
                <p className="font-bold text-sm">
                  {processingStatus === "processing" &&
                    "Processing Calculations..."}
                  {processingStatus === "success" && "Calculations Finished"}
                  {processingStatus === "error" && "Processing Failed"}
                </p>
                <p
                  className={cn(
                    "text-[10px] font-medium opacity-70",
                    processingStatus === "processing" && "text-slate-500",
                    processingStatus === "success" && "text-emerald-50",
                    processingStatus === "error" && "text-rose-50",
                  )}
                >
                  {processingStatus === "processing" && processingProgress
                    ? `Processed ${processingProgress.processed} of ${processingProgress.total} employees...`
                    : ""}
                  {processingStatus === "processing" &&
                    !processingProgress &&
                    "Running statutory tax formulas and deductions..."}
                  {processingStatus === "success" &&
                    "System has verified all employee net pay amounts."}
                  {processingStatus === "error" &&
                    (processingError || "An error occurred")}
                </p>
              </div>

              {processingStatus !== "processing" && (
                <button
                  onClick={() => {
                    setProcessingStatus("idle");
                    setProcessingError(null);
                    setProcessingProgress(null);
                  }}
                  className="ml-2 p-1 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-4 h-4 opacity-70" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Payroll Processing
          </h1>
          <p className="text-slate-500 text-sm">
            {displayPeriod ? periodDateRange : "No active payroll period"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <select
            value={selectedPeriodId ?? ""}
            onChange={(e) => setSelectedPeriodId(e.target.value || null)}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          >
            {periods.length === 0 && <option value="">No periods</option>}
            {periods.map((p: any) => {
              const now = new Date();
              const isActive =
                new Date(p.startDate) <= now && new Date(p.endDate) >= now;
              return (
                <option key={p.id} value={p.id}>
                  {isActive ? "● " : ""}
                  {p.name} —{" "}
                  {new Date(p.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(p.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </option>
              );
            })}
          </select>

          {/* Batch Selector */}
          <select
            value={selectedBatchId ?? ""}
            onChange={(e) => setSelectedBatchId(e.target.value || null)}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          >
            <option value="__ALL__">All Employees (Attendance)</option>
            {batches.length === 0 && (
              <option value="" disabled>
                No batches
              </option>
            )}
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b._count?.employees ?? 0} employees)
              </option>
            ))}
          </select>

          {/* Employee Selector (visible when a specific batch is selected) */}
          {selectedBatchId &&
            selectedBatchId !== "__ALL__" &&
            batchEmployees.length > 0 && (
              <select
                value={selectedEmployeeId ?? ""}
                onChange={(e) => setSelectedEmployeeId(e.target.value || null)}
                disabled={loadingEmployees}
                className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-40 max-w-[220px]"
              >
                <option value="__ALL__">All employees</option>
                {batchEmployees.map((be) => (
                  <option key={be.employeeId} value={be.employeeId}>
                    {be.employee.firstName} {be.employee.lastName}
                  </option>
                ))}
              </select>
            )}

          {/* Process / Next Batch Button */}
          <button
            onClick={handleProcessPayroll}
            disabled={processingStatus === "processing" || !selectedBatchId}
            className={cn(
              "bg-[#047857] text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/10 active:scale-95",
              processingStatus === "processing" || !selectedBatchId
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[#03664a]",
            )}
          >
            {processingStatus === "processing" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            {processingStatus === "processing"
              ? "Processing..."
              : processingBatchIndex
                ? `Process Batch ${processingBatchIndex.current + 1} of ${processingBatchIndex.total}`
                : selectedBatchId === "__ALL__"
                  ? "Process All Employees"
                  : "Process Batch"}
          </button>

          {/* Process Employee / All Employees Button (visible when employee is selected) */}
          {selectedEmployeeId && (
            <button
              onClick={handleProcessSingleEmployee}
              disabled={processingStatus === "processing"}
              className={cn(
                "bg-white border-2 border-emerald-600 text-emerald-700 px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95",
                processingStatus === "processing"
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-emerald-50",
              )}
            >
              {processingStatus === "processing" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : selectedEmployeeId === "__ALL__" ? (
                <Layers className="w-4 h-4" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              {selectedEmployeeId === "__ALL__"
                ? "Process All"
                : "Process Employee"}
            </button>
          )}

          {/* Export to Excel */}
          {currentRun && items.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export Excel
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">
            Loading payroll data...
          </p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertCircle className="w-12 h-12 text-rose-400" />
          <div className="text-center">
            <p className="text-sm font-bold text-rose-600">
              Failed to Load Data
            </p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && runs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Banknote className="w-12 h-12 text-slate-300" />
          <div className="text-center">
            <p className="text-sm font-bold text-slate-600">
              No Payroll Runs Yet
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {currentPeriod
                ? 'Select a period and batch above, then click "Process Batch".'
                : "Create a payroll period in Configuration first."}
            </p>
          </div>
          {currentPeriod && (
            <button
              onClick={handleProcessPayroll}
              disabled={processingStatus === "processing"}
              className="px-5 py-2.5 bg-[#047857] text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#03664a] transition-colors shadow-lg"
            >
              {processingStatus === "processing" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              Process Batch Now
            </button>
          )}
        </div>
      )}

      {/* Data Content (only when loaded and runs exist) */}
      {!loading && !error && runs.length > 0 && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500">
                    {card.label}
                  </p>
                  {card.icon && (
                    <card.icon className={cn("w-4 h-4", card.iconColor)} />
                  )}
                </div>
                <p
                  className={cn(
                    "text-xl font-black text-slate-900 tracking-tight",
                    card.mainClassName,
                  )}
                >
                  {card.main}
                </p>
                <p
                  className={cn(
                    "text-xs mt-1 text-slate-400",
                    card.subClassName,
                  )}
                >
                  {card.sub}
                </p>
              </div>
            ))}
          </div>

          {/* All Batches Total Card */}
          {periodRuns.length > 1 && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  Total (All Batches)
                </p>
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <div>
                  <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">
                    Gross
                  </p>
                  <p className="text-base font-black text-emerald-900">
                    {fmtShort(allBatchesTotal.totalGross)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">
                    Net
                  </p>
                  <p className="text-base font-black text-emerald-900">
                    {fmtShort(allBatchesTotal.totalNet)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">
                    Cost to Company
                  </p>
                  <p className="text-base font-black text-emerald-900">
                    {fmtShort(allBatchesTotal.totalCostToCompany)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">
                    Employees
                  </p>
                  <p className="text-base font-black text-emerald-900">
                    {allBatchesTotal.employeeCount}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-emerald-500 mt-2 font-medium">
                {allBatchesTotal.runCount} batch
                {allBatchesTotal.runCount > 1 ? "es" : ""} · Tax{" "}
                {fmtShort(allBatchesTotal.totalTax)} · Pension{" "}
                {fmtShort(allBatchesTotal.totalPension)} · OT{" "}
                {fmtShort(allBatchesTotal.totalOvertime)}
              </p>
            </div>
          )}

          {/* Distribution Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Cost Distribution Donut */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-1 uppercase tracking-wider">
                Cost Distribution
                {selectedBatchId && currentRun && (
                  <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {batches.find((b) => b.id === selectedBatchId)?.name ??
                      "Batch"}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                How each payroll amount is allocated
              </p>
              {costDistributionData.length > 0 ? (
                <div
                  className="h-[300px] w-full relative"
                  style={{ minWidth: 300, minHeight: 200 }}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={300}
                    minHeight={200}
                  >
                    <PieChart>
                      <Pie
                        data={costDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        dataKey="value"
                        nameKey="name"
                        paddingAngle={2}
                        cornerRadius={4}
                        animationBegin={100}
                        animationDuration={800}
                      >
                        {costDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          border: "none",
                          borderRadius: "12px",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        }}
                        formatter={(value: any) => fmt(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      {fmtShort(
                        totalGrossForChart || Number(currentRun?.totalGross),
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Total Gross
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-sm text-slate-400">
                    No cost data available
                  </p>
                </div>
              )}
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-2 pt-4 border-t border-slate-100">
                {costDistributionData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span className="text-[11px] font-medium text-slate-500">
                      {entry.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Salary Distribution Line */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-1 uppercase tracking-wider">
                Salary Distribution
                {selectedBatchId && currentRun && (
                  <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {batches.find((b) => b.id === selectedBatchId)?.name ??
                      "Batch"}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Employees ranked by net salary — {salaryDistributionData.length}{" "}
                employees
              </p>
              {salaryDistributionData.length > 0 ? (
                <div
                  className="h-[300px] w-full"
                  style={{ minWidth: 300, minHeight: 200 }}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={300}
                    minHeight={200}
                  >
                    <LineChart
                      data={salaryDistributionData}
                      margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="rank"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        dy={8}
                        tickCount={6}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        contentStyle={{
                          border: "none",
                          borderRadius: "12px",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          fontSize: "12px",
                        }}
                        formatter={(value: any, name: any) => [
                          fmt(Number(value)),
                          name === "grossSalary"
                            ? "Gross"
                            : name === "netSalary"
                              ? "Net"
                              : "Deductions",
                        ]}
                        labelFormatter={(label: any) => `Employee #${label}`}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={30}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span className="text-[11px] text-slate-500">
                            {value === "grossSalary"
                              ? "Gross"
                              : value === "netSalary"
                                ? "Net"
                                : "Deductions"}
                          </span>
                        )}
                      />
                      <Line
                        type="monotone"
                        dataKey="grossSalary"
                        stroke="#0f766e"
                        strokeWidth={2}
                        dot={false}
                        animationBegin={100}
                        animationDuration={1000}
                      />
                      <Line
                        type="monotone"
                        dataKey="netSalary"
                        stroke="#059669"
                        strokeWidth={2.5}
                        dot={false}
                        animationBegin={300}
                        animationDuration={1000}
                      />
                      <Line
                        type="monotone"
                        dataKey="deductions"
                        stroke="#e11d48"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                        animationBegin={500}
                        animationDuration={1000}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-sm text-slate-400">
                    {allItems.length === 0
                      ? "Run payroll to see distribution"
                      : "No items available"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Main Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">
                Run Summary
                {selectedBatchId && currentRun && (
                  <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {batches.find((b) => b.id === selectedBatchId)?.name ??
                      "Batch"}
                  </span>
                )}
              </h3>
              {chartData.length > 0 ? (
                <div
                  className="h-[300px] w-full"
                  style={{ minWidth: 300, minHeight: 200 }}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={300}
                    minHeight={200}
                  >
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        dy={10}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickFormatter={(value) =>
                          `${(value / 1000000).toFixed(0)}M`
                        }
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{
                          border: "none",
                          borderRadius: "12px",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        }}
                        formatter={(value: any) =>
                          value != null
                            ? formatCurrency(Number(value))
                            : ""
                        }
                      />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={50}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.fill || "#047857"}
                            className="hover:opacity-80 transition-opacity"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-sm text-slate-400">
                    No data available for chart
                  </p>
                </div>
              )}
            </div>

            {/* Right: Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">
                Calculation Summary
              </h3>
              <div className="space-y-4">
                {summaryItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm py-2 border-b border-dotted border-slate-200 last:border-0"
                  >
                    <span className="text-slate-500 font-medium">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "font-bold text-slate-800 font-mono",
                        item.valueClassName,
                      )}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-emerald-50 rounded-xl p-4 flex justify-between items-center border border-emerald-100">
                <span className="text-emerald-900 font-bold">
                  Total Net Pay
                </span>
                <span className="text-2xl font-black text-emerald-900">
                  {fmt(Number(currentRun?.totalNet))}
                </span>
              </div>
            </div>
          </div>

          {/* Employees Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-slate-800">
                  Employee Breakdown
                </h3>
                {selectedBatchId && currentRun && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded tracking-wider">
                    {batches.find((b) => b.id === selectedBatchId)?.name ??
                      "Batch"}
                  </span>
                )}
              </div>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded tracking-wider">
                {paginationMeta?.totalItems ?? items.length} Employees
              </span>
            </div>

            {loadingItems && items.length === 0 && (
              <div className="p-8 text-center flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                <p className="text-sm text-slate-500">
                  Loading employee items...
                </p>
              </div>
            )}

            {!loadingItems && items.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-400">
                  No employee items found for this run.
                </p>
              </div>
            )}

            {items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                        Department
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                        Basic Salary
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                        Allowances
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                        Gross
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                        Deductions
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                        Net Pay
                      </th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-24">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const totalAllowances = (
                        item.payrollAllowances ?? []
                      ).reduce((s, a) => s + Number(a.amount), 0);
                      return (
                        <tr
                          key={item.id}
                          onClick={() =>
                            setSelectedItem({
                              runId: item.payrollRunId,
                              itemId: item.id,
                            })
                          }
                          className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-emerald-700">
                                  {(item.employee?.firstName?.[0] ?? "") +
                                    (item.employee?.lastName?.[0] ?? "")}
                                </span>
                              </div>
                              <span className="font-semibold text-slate-800">
                                {item.employee?.firstName}{" "}
                                {item.employee?.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {item.employee?.departmentName || "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">
                            {fmt(Number(item.basicSalary))}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-blue-600">
                            {fmt(totalAllowances)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                            {fmt(Number(item.grossSalary))}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-rose-600">
                            {fmt(Number(item.totalDeductions))}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            {fmt(Number(item.netSalary))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.deductionCapBreached ? (
                              <span className="inline-flex items-center px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded border border-rose-200">
                                Cap Issue
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded border border-emerald-200">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold">
                      <td className="px-4 py-3 text-slate-800" colSpan={2}>
                        Total
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {fmt(
                          items.reduce((s, i) => s + Number(i.basicSalary), 0),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-600">
                        {fmt(
                          items.reduce(
                            (s, i) =>
                              s +
                              (i.payrollAllowances ?? []).reduce(
                                (a, al) => a + Number(al.amount),
                                0,
                              ),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        {fmt(
                          items.reduce((s, i) => s + Number(i.grossSalary), 0),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-rose-600">
                        {fmt(
                          items.reduce(
                            (s, i) => s + Number(i.totalDeductions),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">
                        {fmt(
                          items.reduce((s, i) => s + Number(i.netSalary), 0),
                        )}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

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
          </div>

          {/* Validation Issues Section */}
          {issues.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800">
                  Validation Errors & Warnings
                </h3>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded tracking-wider">
                  {issues.length} Issues
                </span>
              </div>
              <div className="p-4 space-y-3">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-4 rounded-xl border flex items-center justify-between group hover:shadow-md transition-all bg-rose-50 border-rose-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-800 text-sm">
                          {issue.employee?.firstName} {issue.employee?.lastName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Deduction exceeds 1/3 of basic salary limit
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setSelectedItem({
                          runId: issue.payrollRunId,
                          itemId: issue.id,
                        })
                      }
                      className="text-xs font-bold text-rose-600 px-4 py-2 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors bg-white"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="mt-8">
            <div className="bg-[#ECFDF5] rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between text-[#065F46] gap-6">
              <div>
                <h4 className="font-bold text-xl">
                  {currentRun ? "Payroll Processed" : "Ready to Process"}
                </h4>
                <p className="text-sm opacity-90">
                  {currentRun
                    ? `${currentRun.employeeCount} employees processed — total net pay ${fmt(Number(currentRun.totalNet))}`
                    : processingBatchIndex
                      ? `Batch ${processingBatchIndex.current} of ${processingBatchIndex.total} processed`
                      : "Select a period and batch, then click Process Batch"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  onClick={handleProcessPayroll}
                  disabled={
                    processingStatus === "processing" || !selectedBatchId
                  }
                  className={cn(
                    "flex-1 md:flex-none bg-[#022c22] text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95",
                    processingStatus === "processing" || !selectedBatchId
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-black",
                  )}
                >
                  {processingStatus === "processing" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {processingStatus === "processing"
                    ? "Processing..."
                    : processingBatchIndex
                      ? `Process Next Batch (${processingBatchIndex.current}/${processingBatchIndex.total})`
                      : "Process Batch"}
                </button>

                {/* Process Employee / All Employees (bottom bar) */}
                {selectedEmployeeId && (
                  <button
                    onClick={handleProcessSingleEmployee}
                    disabled={processingStatus === "processing"}
                    className={cn(
                      "flex-1 md:flex-none bg-white text-emerald-700 border-2 border-emerald-600 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95",
                      processingStatus === "processing"
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-emerald-50",
                    )}
                  >
                    {processingStatus === "processing" ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : selectedEmployeeId === "__ALL__" ? (
                      <Layers className="w-5 h-5" />
                    ) : (
                      <Users className="w-5 h-5" />
                    )}
                    {selectedEmployeeId === "__ALL__"
                      ? "Process All"
                      : "Process Employee"}
                  </button>
                )}

                {/* Export to Excel (bottom bar) */}
                {currentRun && items.length > 0 && (
                  <button
                    onClick={handleExportExcel}
                    className="flex-1 md:flex-none bg-white text-emerald-800 border border-emerald-300 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 hover:bg-emerald-50"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    Export Excel
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
