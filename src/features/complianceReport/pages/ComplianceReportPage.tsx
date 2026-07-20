import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  LucideIcon,
  Sparkles,
  FileCheck,
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  FileOutput,
  Loader2,
  X,
  Banknote,
  Receipt,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,

} from "lucide-react";
import { cn } from "../../../lib/utils";
import { StatCardProps } from "../../../types/ui.types";
import {
  fetchReportablePeriods,
  enqueueGeneration,
  fetchJobStatus,
  downloadGeneratedReport,
  checkReportExists,
  ReportablePeriod,
} from "../api/complianceReportApi";

// ── Helpers ────────────────────────────────────────────────────────────────

const REPORT_TYPES: ReportType[] = ["tax", "pension", "bank"];

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");

type ReportType = "tax" | "pension" | "bank";
type GenStatus = "idle" | "generating" | "done";

const PAGE_SIZE = 5;

const reportTypeLabel: Record<ReportType, string> = {
  tax: "Tax",
  pension: "Pension",
  bank: "Bank",
};

// ── Page Component ─────────────────────────────────────────────────────────

export const ComplianceReportPage: React.FC = () => {
  const [periods, setPeriods] = useState<ReportablePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [downloadErr, setDownloadErr] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<Record<string, GenStatus>>({});
  const [downloading, setDownloading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const reconcileGenerated = useCallback(
    async (data: ReportablePeriod[]): Promise<Record<string, GenStatus>> => {
      const statusMap: Record<string, GenStatus> = {};
      await Promise.all(
        data.flatMap((p) =>
          REPORT_TYPES.map(async (type) => {
            const key = `${type}-${p.runId}`;
            try {
              const exists = await checkReportExists(p.runId, type);
              if (exists) statusMap[key] = "done";
            } catch {
              // skip — will show "Ready" as fallback
            }
          }),
        ),
      );
      return statusMap;
    },
    [],
  );

  useEffect(() => {
    fetchReportablePeriods()
      .then(async (data) => {
        setPeriods(data);
        if (data.length > 0) setSelectedPeriodId(data[0].id);

        const statusMap = await reconcileGenerated(data);
        setGenStatus((prev) => ({ ...prev, ...statusMap }));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [reconcileGenerated]);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  // ── Filter + paginate ─────────────────────────────────────────────────────

  const filtered = useMemo(
    () =>
      periods.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [periods, searchQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  // Reset page when search changes
  useEffect(() => setPage(1), [searchQuery]);

  // ── Handlers ──────────────────────────────────────────────────────────────

    const pollingRef = React.useRef<Map<string, number>>(new Map());

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingRef.current.forEach((id) => clearInterval(id));
    };
  }, []);

  /** Poll a job until it completes or fails */
  const pollJob = useCallback((key: string, jobId: string) => {
    const interval = window.setInterval(async () => {
      try {
        const status = await fetchJobStatus(jobId);
        if (status.state === "completed") {
          setGenStatus((s) => ({ ...s, [key]: "done" }));
          clearInterval(interval);
          pollingRef.current.delete(key);
        } else if (status.state === "failed") {
          setDownloadErr(`${key} failed: ${status.failedReason || "Unknown error"}`);
          setGenStatus((s) => ({ ...s, [key]: "idle" }));
          clearInterval(interval);
          pollingRef.current.delete(key);
        }
      } catch {
        // keep polling
      }
    }, 2000);
    pollingRef.current.set(key, interval);
  }, []);

  /** Generate (enqueue BullMQ job, poll until done) */
  const handleGenerate = useCallback(
    async (type: ReportType, runId: string, label: string) => {
      const key = `${type}-${runId}`;
      setGenStatus((s) => ({ ...s, [key]: "generating" }));
      setDownloadErr(null);
      try {
        const result = await enqueueGeneration(runId, sanitize(label), type);
        if (result.alreadyGenerated) {
          setGenStatus((s) => ({ ...s, [key]: "done" }));
        } else if (result.jobId) {
          pollJob(key, result.jobId);
        }
      } catch (err: any) {
        setDownloadErr(`${reportTypeLabel[type]} generate failed: ${err.message}`);
        setGenStatus((s) => ({ ...s, [key]: "idle" }));
      }
    },
    [pollJob],
  );

  /** Download a pre-generated report file */
  const handleDownload = useCallback(
    async (type: ReportType, runId: string, label: string) => {
      const key = `dl-${type}-${runId}`;
      setDownloading(key);
      setDownloadErr(null);
      try {
        const safeLabel = sanitize(label);
        await downloadGeneratedReport(runId, type, `${type}-${safeLabel}.xlsx`);
      } catch (err: any) {
        setDownloadErr(`${reportTypeLabel[type]} download failed: ${err.message}`);
      } finally {
        setDownloading(null);
      }
    },
    [],
  );

  /** Bulk: enqueue ALL 3 report types for EVERY filtered period */
  const handleBulkGenerateAll = useCallback(async () => {
    setDownloadErr(null);
    for (const type of ["tax", "pension", "bank"] as ReportType[]) {
      for (const p of filtered) {
        const key = `${type}-${p.runId}`;
        setGenStatus((s) => ({ ...s, [key]: "generating" }));
        try {
          const result = await enqueueGeneration(p.runId, sanitize(p.name), type);
          if (result.alreadyGenerated) {
            setGenStatus((s) => ({ ...s, [key]: "done" }));
          } else if (result.jobId) {
            pollJob(key, result.jobId);
          }
        } catch (err: any) {
          setDownloadErr(
            `Bulk ${reportTypeLabel[type]} (${p.name}) failed: ${err.message}`,
          );
          setGenStatus((s) => ({ ...s, [key]: "idle" }));
        }
      }
    }
  }, [filtered, pollJob]);

  // ── Computed stats ────────────────────────────────────────────────────────

  const totalEmployees = periods.reduce((s, p) => s + p.employeeCount, 0);
  const totalTax = periods.reduce((s, p) => s + p.totalTax, 0);
  const totalPension = periods.reduce((s, p) => s + p.totalPension, 0);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500 text-sm">Failed to load periods: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Statutory Compliance & Reports</h1>
          <p className="text-slate-500 text-sm">Tax and pension reports for MoR and POESSA</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              setGenStatus({});
              fetchReportablePeriods()
                .then(async (data) => {
                  setPeriods(data);
                  if (data.length > 0 && !data.find((p) => p.id === selectedPeriodId)) {
                    setSelectedPeriodId(data[0].id);
                  }
                  const statusMap = await reconcileGenerated(data);
                  setGenStatus((prev) => ({ ...prev, ...statusMap }));
                })
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
            }}
            className="p-2 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh periods"
          >
            <FileCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {downloadErr && (
        <div className="flex items-center gap-3 px-5 py-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{downloadErr}</span>
          <button onClick={() => setDownloadErr(null)} className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Period selector + Action buttons */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 cursor-pointer min-w-[200px]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "16px",
              }}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Generate Tax */}
            <button
              onClick={() =>
                selectedPeriod &&
                handleGenerate("tax", selectedPeriod.runId, selectedPeriod.name)
              }
              disabled={
                !selectedPeriod ||
                genStatus[`tax-${selectedPeriod?.runId}`] === "generating"
              }
              className="px-4 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-brand-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {genStatus[`tax-${selectedPeriod?.runId}`] === "generating" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : genStatus[`tax-${selectedPeriod?.runId}`] === "done" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Receipt className="w-4 h-4" />
              )}
              Generate Tax
            </button>

            {/* Generate Pension */}
            <button
              onClick={() =>
                selectedPeriod &&
                handleGenerate("pension", selectedPeriod.runId, selectedPeriod.name)
              }
              disabled={
                !selectedPeriod ||
                genStatus[`pension-${selectedPeriod?.runId}`] === "generating"
              }
              className="px-4 py-2.5 text-sm font-bold text-white bg-[#0369a1] rounded-xl hover:bg-[#0284c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {genStatus[`pension-${selectedPeriod?.runId}`] === "generating" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : genStatus[`pension-${selectedPeriod?.runId}`] === "done" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              Generate Pension
            </button>

            {/* Generate Bank */}
            <button
              onClick={() =>
                selectedPeriod &&
                handleGenerate("bank", selectedPeriod.runId, selectedPeriod.name)
              }
              disabled={
                !selectedPeriod ||
                genStatus[`bank-${selectedPeriod?.runId}`] === "generating"
              }
              className="px-4 py-2.5 text-sm font-bold text-white bg-[#7c3aed] rounded-xl hover:bg-[#8b5cf6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {genStatus[`bank-${selectedPeriod?.runId}`] === "generating" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : genStatus[`bank-${selectedPeriod?.runId}`] === "done" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Banknote className="w-4 h-4" />
              )}
              Generate Bank
            </button>
          </div>
        </div>

        {/* Bulk Generate All row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkGenerateAll}
              disabled={filtered.length === 0}
              className="px-5 py-2.5 text-sm font-bold text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              Generate All ({filtered.length} period{filtered.length !== 1 ? "s" : ""} × 3 reports)
            </button>
            <span className="text-[10px] text-slate-400 leading-tight max-w-[180px]">
              Generates Tax + Pension + Bank for every period
            </span>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search periods..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
            />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Tax Reports"
          value={periods.length.toString()}
          subValue={`Total tax: ${totalTax.toLocaleString()}`}
          subColor="text-emerald-500"
          icon={FileText}
          iconColor="text-emerald-500"
        />
        <StatCard
          label="Pension Reports"
          value={periods.length.toString()}
          subValue={`Total pension: ${totalPension.toLocaleString()}`}
          subColor="text-emerald-500"
          icon={CheckCircle2}
          iconColor="text-emerald-500"
        />
        <StatCard
          label="Total Employees"
          value={totalEmployees.toLocaleString()}
          subValue="Across all periods"
          subColor="text-slate-500"
          icon={Clock}
          iconColor="text-slate-400"
        />
        <StatCard
          label="Compliance Status"
          value={periods.length > 0 ? "Ready" : "N/A"}
          subValue={periods.length > 0 ? `${periods.length} report(s) available` : "No finalized runs"}
          subColor={periods.length > 0 ? "text-emerald-500" : "text-orange-500"}
          icon={AlertCircle}
          iconColor={periods.length > 0 ? "text-emerald-500" : "text-orange-500"}
        />
      </div>

      {/* ── Tax Reports Table ── */}
      <ReportTable
        title="Tax Reports (Ministry of Revenue)"
        periods={paginated}
        totalCount={filtered.length}
        reportType="tax"
        genStatus={genStatus}
        downloading={downloading}
        onGenerate={handleGenerate}
        onDownload={handleDownload}
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        columns={[
          { key: "period", label: "Period" },
          { key: "totalTax", label: "Total Tax", align: "right" },
          { key: "employees", label: "Employees", align: "center" },
          { key: "status", label: "Status" },
          { key: "finalizedOn", label: "Finalized On" },
          { key: "actions", label: "Actions", align: "right" },
        ]}
        renderRow={(p, i) => (
          <>
            <td className="px-8 py-4 font-bold text-slate-800 border-r border-slate-200/50">{p.name}</td>
            <td className="px-6 py-4 text-right font-medium text-slate-700 border-r border-slate-200/50">{p.totalTax.toLocaleString()}</td>
            <td className="px-6 py-4 text-center text-slate-500 border-r border-slate-200/50">{p.employeeCount}</td>
            <td className="px-6 py-4 border-r border-slate-200/50">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                genStatus[`tax-${p.runId}`] === "done"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-brand-100 text-emerald-700",
              )}>
                {genStatus[`tax-${p.runId}`] === "done" ? "Generated" : "Ready"}
              </span>
            </td>
            <td className="px-6 py-4 text-slate-500 font-mono text-xs border-r border-slate-200/50">
              {p.finalizedAt ? new Date(p.finalizedAt).toLocaleDateString() : "—"}
            </td>
            <td className="px-8 py-4 text-right">
              <button
                onClick={() => handleDownload("tax", p.runId, p.name)}
                disabled={downloading === `dl-tax-${p.runId}`}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                title="Download report"
              >
                {downloading === `dl-tax-${p.runId}` ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </td>
          </>
        )}
      />

      {/* ── Pension Reports Table ── */}
      <ReportTable
        title="Pension Reports (POESSA)"
        periods={paginated}
        totalCount={filtered.length}
        reportType="pension"
        genStatus={genStatus}
        downloading={downloading}
        onGenerate={handleGenerate}
        onDownload={handleDownload}
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        columns={[
          { key: "period", label: "Period" },
          { key: "employee7", label: "Employee (7%)", align: "right" },
          { key: "employer11", label: "Employer (11%)", align: "right" },
          { key: "total", label: "Total", align: "right" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Actions", align: "right" },
        ]}
        renderRow={(p, i) => (
          <>
            <td className="px-8 py-4 font-bold text-slate-800 border-r border-slate-200/50">{p.name}</td>
            <td className="px-6 py-4 text-right font-medium text-orange-600 border-r border-slate-200/50">
              {(p.totalPension * 0.07 / 0.18).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </td>
            <td className="px-6 py-4 text-right font-medium text-orange-600 border-r border-slate-200/50">
              {(p.totalPension * 0.11 / 0.18).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </td>
            <td className="px-6 py-4 text-right font-black text-slate-900 border-r border-slate-200/50">{p.totalPension.toLocaleString()}</td>
            <td className="px-6 py-4 border-r border-slate-200/50">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                genStatus[`pension-${p.runId}`] === "done"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-brand-100 text-emerald-700",
              )}>
                {genStatus[`pension-${p.runId}`] === "done" ? "Generated" : "Ready"}
              </span>
            </td>
            <td className="px-8 py-4 text-right">
              <button
                onClick={() => handleDownload("pension", p.runId, p.name)}
                disabled={downloading === `dl-pension-${p.runId}`}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                title="Download report"
              >
                {downloading === `dl-pension-${p.runId}` ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </td>
          </>
        )}
      />

      {/* ── Bank Reports Table ── */}
      <ReportTable
        title="Bank Transfer Reports"
        periods={paginated}
        totalCount={filtered.length}
        reportType="bank"
        genStatus={genStatus}
        downloading={downloading}
        onGenerate={handleGenerate}
        onDownload={handleDownload}
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        columns={[
          { key: "period", label: "Period" },
          { key: "totalNet", label: "Total Net Pay", align: "right" },
          { key: "employees", label: "Employees", align: "center" },
          { key: "status", label: "Status" },
          { key: "finalizedOn", label: "Finalized On" },
          { key: "actions", label: "Actions", align: "right" },
        ]}
        renderRow={(p, i) => (
          <>
            <td className="px-8 py-4 font-bold text-slate-800 border-r border-slate-200/50">{p.name}</td>
            <td className="px-6 py-4 text-right font-medium text-slate-700 border-r border-slate-200/50">{p.totalNet.toLocaleString()}</td>
            <td className="px-6 py-4 text-center text-slate-500 border-r border-slate-200/50">{p.employeeCount}</td>
            <td className="px-6 py-4 border-r border-slate-200/50">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                genStatus[`bank-${p.runId}`] === "done"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-brand-100 text-emerald-700",
              )}>
                {genStatus[`bank-${p.runId}`] === "done" ? "Generated" : "Ready"}
              </span>
            </td>
            <td className="px-6 py-4 text-slate-500 font-mono text-xs border-r border-slate-200/50">
              {p.finalizedAt ? new Date(p.finalizedAt).toLocaleDateString() : "—"}
            </td>
            <td className="px-8 py-4 text-right">
              <button
                onClick={() => handleDownload("bank", p.runId, p.name)}
                disabled={downloading === `dl-bank-${p.runId}`}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                title="Download report"
              >
                {downloading === `dl-bank-${p.runId}` ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </td>
          </>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Export Options */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Export Options</h3>
          <div className="space-y-4">
            <ExportButton label="Export as CSV" icon={FileOutput} />
            <ExportButton label="Export as Excel" icon={FileSpreadsheet} />
            <ExportButton label="Export as PDF" icon={FileText} />
          </div>
        </div>

        {/* Submission Tracking */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Submission Tracking</h3>
          <div className="space-y-4">
            {periods.length === 0 ? (
              <p className="text-sm text-slate-400">No periods ready for submission.</p>
            ) : (
              periods.slice(0, 3).map((p) => (
                <SubmissionItem
                  key={p.id}
                  label={`Tax Report - ${p.name}`}
                  date={p.finalizedAt ? new Date(p.finalizedAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  }) : "Pending"}
                  status="Pending"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Report Table Sub-component ──────────────────────────────────────────────

interface Column {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

function ReportTable({
  title,
  periods,
  totalCount,
  reportType,
  genStatus,
  downloading,
  onGenerate,
  onDownload,
  page,
  totalPages,
  onPageChange,
  columns,
  renderRow,
}: {
  title: string;
  periods: ReportablePeriod[];
  totalCount: number;
  reportType: ReportType;
  genStatus: Record<string, GenStatus>;
  downloading: string | null;
  onGenerate: (type: ReportType, runId: string, label: string) => void;
  onDownload: (type: ReportType, runId: string, label: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  columns: Column[];
  renderRow: (p: ReportablePeriod, i: number) => React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/30">
        <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-200/50",
                    col.align === "right" && "text-right px-6",
                    col.align === "center" && "text-center px-6",
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-8 py-12 text-center text-slate-400 text-sm">
                  No finalized payroll periods available.
                </td>
              </tr>
            ) : (
              periods.map((p, i) => (
                <tr
                  key={p.id}
                  className={cn(
                    "transition-colors border-b border-slate-100",
                    i % 2 === 0 ? "bg-slate-50/40" : "bg-white",
                    "hover:bg-brand-50/60 text-sm",
                  )}
                >
                  {renderRow(p, i)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-8 py-4 bg-slate-50/50 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-medium">
            Showing {(page - 1) * 5 + 1}–{Math.min(page * 5, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  "w-7 h-7 rounded-lg text-xs font-bold transition-colors",
                  p === page
                    ? "bg-primary text-white"
                    : "text-slate-500 hover:bg-slate-100",
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Static Sub-components ──────────────────────────────────────────────────

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, subColor, icon: Icon, iconColor }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm group hover:shadow-md transition-all">
    <div className="flex items-start justify-between mb-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-brand-50 transition-colors">
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-3xl font-black text-slate-900">{value}</p>
      <p className={cn("text-[10px] font-bold", subColor)}>{subValue}</p>
    </div>
  </div>
);

const ExportButton: React.FC<{ label: string; icon: LucideIcon }> = ({ label, icon: Icon }) => (
  <button className="w-full flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-brand-200 hover:bg-brand-50/20 transition-all group">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-bold text-slate-700">{label}</span>
    </div>
    <Download className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
  </button>
);

const SubmissionItem: React.FC<{ label: string; date: string; status: string }> = ({ label, date, status }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
    <div>
      <p className="text-sm font-bold text-slate-800">{label}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">Due: {date}</p>
    </div>
    <span className="px-3 py-1 bg-brand-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">{status}</span>
  </div>
);
