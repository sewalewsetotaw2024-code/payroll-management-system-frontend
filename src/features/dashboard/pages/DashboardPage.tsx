import React, { useEffect, useState, useMemo } from "react";
import { motion } from 'motion/react';
import {
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronDown,
} from "lucide-react";
import { cn, formatCurrency } from "../../../lib/utils";
import type { StatCardProps, SummaryItemProps } from "../../../types/ui.types";
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
import { payrollRunApi, type PayrollRun, type PayrollRunItem } from "../../payrollProcessing/api/payrollProcessingApi";
import { payrollPeriodApi } from "../../configuration/api/configurationApi";
import { listBatchesByPeriod } from "../../payrollBatch/api";
import type { PayrollBatch } from "../../payrollBatch/types";

// ── Chart colors ─────────────────────────────────────────

const chartColors = {
  basic: "#047857", // brand-700
  net: "#059669",
  tax: "#e11d48",
  pension: "#d97706",
  deductions: "#6366f1",
  overtime: "#8b5cf6",
  gross: "#0f766e",
};

const pieColors = {
  net: "#059669",
  tax: "#e11d48",
  pension: "#d97706",
  overtime: "#8b5cf6",
  bonus: "#0ea5e9",
};

// ── Formatters ───────────────────────────────────────────

const fmt = (value: number | string | undefined | null, currency = "ETB") => {
  if (value == null) return `${currency} 0`;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return formatCurrency(num, currency);
};

const fmtShort = (value: number | undefined | null) => {
  if (value == null) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
};

export const DashboardPage: React.FC = () => {
  // ── Real payroll data ──────────────────────────────────

  const [periods, setPeriods] = useState<any[]>([]);
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [allItems, setAllItems] = useState<PayrollRunItem[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("__ALL__");

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoadingAnalytics(true);
      try {
        const [ppRes, runsRes] = await Promise.all([
          payrollPeriodApi.getAll(),
          payrollRunApi.getRuns({ limit: 100, _t: Date.now() }),
        ]);
        if (cancelled) return;

        const fetchedPPs = ppRes.data?.data || [];
        const fetchedRuns: PayrollRun[] = runsRes.data?.data || [];

        // Sort periods: active first, then by start date descending
        const sortedPPs = [...fetchedPPs].sort((a: any, b: any) => {
          const now = new Date();
          const aActive =
            new Date(a.startDate) <= now && new Date(a.endDate) >= now;
          const bActive =
            new Date(b.startDate) <= now && new Date(b.endDate) >= now;
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;
          return (
            new Date(b.startDate).getTime() -
            new Date(a.startDate).getTime()
          );
        });

        setPeriods(sortedPPs);
        setRuns(fetchedRuns);

        // Default period
        if (!selectedPeriodId && sortedPPs.length > 0) {
          setSelectedPeriodId(sortedPPs[0].id);
        }
      } catch {
        // Silently fail — analytics are non-critical
      } finally {
        if (!cancelled) setLoadingAnalytics(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch batches when period changes
  useEffect(() => {
    if (!selectedPeriodId) {
      setBatches([]);
      return;
    }
    let cancelled = false;
    listBatchesByPeriod({ payrollPeriodId: selectedPeriodId, page: 1, limit: 100 })
      .then((res) => {
        if (!cancelled) setBatches(res.batches ?? []);
      })
      .catch(() => {
        if (!cancelled) setBatches([]);
      });
    return () => { cancelled = true; };
  }, [selectedPeriodId]);

  // Reset batch filter when period changes
  useEffect(() => {
    setSelectedBatchId("__ALL__");
  }, [selectedPeriodId]);

  // All runs for the selected period
  const periodRuns = useMemo(() => {
    if (!selectedPeriodId) return [];
    return runs.filter((r) => r.payrollPeriodId === selectedPeriodId);
  }, [runs, selectedPeriodId]);

  // Filter the run based on selected batch
  const currentRun = useMemo((): PayrollRun | null => {
    if (!selectedPeriodId || periodRuns.length === 0) return null;

    if (selectedBatchId === "__ALL__") {
      // Prefer an all-attendance run (no batchId)
      const attendanceRun = periodRuns.find((r) => !r.payrollBatchId);
      if (attendanceRun) return attendanceRun;

      // No all-attendance run — aggregate all batch runs into one virtual run
      const agg = {
        id: `__ALL_BATCHES__${selectedPeriodId}`,
        payrollPeriodId: selectedPeriodId,
        payrollBatchId: undefined,
        status: "COMPLETED",
        totalGross: periodRuns.reduce((s, r) => s + Number(r.totalGross), 0),
        totalNet: periodRuns.reduce((s, r) => s + Number(r.totalNet), 0),
        totalTax: periodRuns.reduce((s, r) => s + Number(r.totalTax), 0),
        totalPension: periodRuns.reduce((s, r) => s + Number(r.totalPension), 0),
        totalBonus: periodRuns.reduce((s, r) => s + Number(r.totalBonus || 0), 0),
        totalOvertime: periodRuns.reduce((s, r) => s + Number(r.totalOvertime), 0),
        totalCostToCompany: periodRuns.reduce((s, r) => s + Number(r.totalCostToCompany), 0),
        employeeCount: periodRuns.reduce((s, r) => s + Number(r.employeeCount), 0),
        monthlyWorkdays: periodRuns[0].monthlyWorkdays,
        processedAt: periodRuns[0].processedAt,
        finalizedAt: periodRuns[0].finalizedAt,
        createdBy: 0,
        createdAt: periodRuns[0].createdAt,
        updatedAt: periodRuns[0].updatedAt,
      } as PayrollRun;
      return agg;
    }

    // Specific batch
    return periodRuns.find((r) => r.payrollBatchId === selectedBatchId) ?? null;
  }, [periodRuns, selectedPeriodId, selectedBatchId]);

  // Fetch items — single run or aggregate from all period runs
  useEffect(() => {
    if (!currentRun || !selectedPeriodId) {
      setAllItems([]);
      return;
    }

    let cancelled = false;

    const isAggregated = currentRun.id.startsWith("__ALL_BATCHES__");

    if (isAggregated) {
      // Aggregated view — fetch items from all runs for this period
      if (periodRuns.length === 0) {
        if (!cancelled) setAllItems([]);
        return;
      }
      Promise.all(
        periodRuns.map((r) =>
          payrollRunApi
            .getRunItems(r.id, { page: 1, limit: 1000 })
            .then((res) => res.data.data)
            .catch(() => [] as PayrollRunItem[]),
        ),
      ).then((results) => {
        if (!cancelled) setAllItems(results.flat());
      });
      return () => { cancelled = true; };
    }

    // Single run
    payrollRunApi
      .getRunItems(currentRun.id, { page: 1, limit: 1000 })
      .then((res) => {
        if (!cancelled) setAllItems(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setAllItems([]);
      });
    return () => { cancelled = true; };
  }, [currentRun?.id, periodRuns, selectedPeriodId]);

  // Chart data
  const displayPeriod = selectedPeriodId
    ? periods.find((p: any) => p.id === selectedPeriodId) || null
    : null;

  const periodName = displayPeriod?.name ?? "No active period";
  const periodDateRange = displayPeriod
    ? `${new Date(displayPeriod.startDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })} - ${new Date(displayPeriod.endDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    : "No period selected";

  const chartData = currentRun
    ? [
        { name: "Gross Pay", amount: Number(currentRun.totalGross), fill: chartColors.gross },
        { name: "Net Pay", amount: Number(currentRun.totalNet), fill: chartColors.net },
        { name: "Income Tax", amount: Number(currentRun.totalTax), fill: chartColors.tax },
        { name: "Pension", amount: Number(currentRun.totalPension), fill: chartColors.pension },
        { name: "Overtime", amount: Number(currentRun.totalOvertime), fill: chartColors.overtime },
      ].filter((d) => d.amount > 0)
    : [];

  const costDistributionData = currentRun
    ? [
        { name: "Net Pay", value: Number(currentRun.totalNet), fill: pieColors.net },
        { name: "Income Tax", value: Number(currentRun.totalTax), fill: pieColors.tax },
        { name: "Pension", value: Number(currentRun.totalPension), fill: pieColors.pension },
        { name: "Overtime", value: Number(currentRun.totalOvertime), fill: pieColors.overtime },
        { name: "Bonus", value: Number(currentRun.totalBonus || 0), fill: pieColors.bonus },
      ].filter((d) => d.value > 0)
    : [];

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
      main: currentRun ? `${currentRun.monthlyWorkdays} days` : "\u2014",
      sub: "Configurable",
      icon: Calendar,
      iconColor: "text-blue-500",
    },
    {
      label: "Employees",
      main: currentRun ? String(currentRun.employeeCount) : "\u2014",
      sub: currentRun
        ? `Total gross: ${fmtShort(Number(currentRun.totalGross))}`
        : "No runs yet",
      icon: Calendar,
      iconColor: "text-purple-500",
      subClassName: currentRun
        ? "text-emerald-600 font-bold"
        : "text-slate-400",
    },
    {
      label: "Processing Status",
      main: currentRun
        ? currentRun.status.replace(/_/g, " ")
        : "Not Processed",
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
        { label: "Total Gross Income", value: fmt(Number(currentRun.totalGross)) },
        { label: "Income Tax", value: fmt(Number(currentRun.totalTax)), valueClassName: "text-rose-600" },
        { label: "Employee Pension", value: fmt(Number(currentRun.totalPension)), valueClassName: "text-amber-600" },
        { label: "Total Overtime", value: fmt(Number(currentRun.totalOvertime)), valueClassName: "text-indigo-600" },
        { label: "Cost to Company", value: fmt(Number(currentRun.totalCostToCompany)), valueClassName: "text-emerald-600" },
        { label: "Other Deductions", value: "\u2014" },
      ]
    : [];

  return (
    <div className="space-y-10 relative pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Payroll Intelligence
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Real-time analytics for your processed periods
          </p>
        </div>
        
        {/* Filters - Modern Glassy Style */}
        <div className="flex flex-wrap items-center gap-3 p-2 glass rounded-[2rem] shadow-lg border-white">
          {periods.length > 0 && (
            <div className="relative flex items-center group">
              <Calendar className="absolute left-4 w-4 h-4 text-brand-primary pointer-events-none group-focus-within:scale-110 transition-transform" />
              <select
                value={selectedPeriodId ?? ""}
                onChange={(e) => setSelectedPeriodId(e.target.value || null)}
                className="appearance-none bg-white/40 hover:bg-white/60 border-none rounded-2xl pl-10 pr-10 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-brand-primary/10 transition-all cursor-pointer min-w-[200px]"
              >
                {periods.map((p: any) => {
                  const now = new Date();
                  const isActive =
                    new Date(p.startDate) <= now && new Date(p.endDate) >= now;
                  return (
                    <option key={p.id} value={p.id}>
                      {isActive ? "ACTIVE: " : ""}{p.name}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}

          {(periodRuns.length > 1 || batches.length > 0) && (
            <div className="relative flex items-center group">
              <Users className="absolute left-4 w-4 h-4 text-blue-500 pointer-events-none group-focus-within:scale-110 transition-transform" />
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="appearance-none bg-white/40 hover:bg-white/60 border-none rounded-2xl pl-10 pr-10 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer min-w-[200px]"
              >
                <option value="__ALL__">All Employees</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {loadingAnalytics && (
        <div className="flex flex-col items-center justify-center py-32 glass rounded-[3rem]">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
          <span className="text-slate-500 font-bold text-sm tracking-widest uppercase">
            Compiling Data...
          </span>
        </div>
      )}

      {!loadingAnalytics && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
          {/* Stat Cards - Bento Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card p-8 flex flex-col gap-6 group hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm ring-1 ring-slate-100 group-hover:scale-110 transition-transform duration-300", card.iconColor?.replace('text-', 'text-') || "text-brand-primary")}>
                    {card.icon && <card.icon className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{card.label}</span>
                </div>
                <div>
                  <p className={cn("text-2xl font-black text-slate-900 tracking-tight font-mono", card.mainClassName)}>
                    {card.main}
                  </p>
                  <p className={cn("text-xs mt-2 font-bold text-slate-400", card.subClassName)}>
                    {card.sub}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts Row - Deep Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cost Distribution */}
            <div className="lg:col-span-5 glass-card p-8 flex flex-col h-full min-h-[500px]">
              <div className="mb-10">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-1">Cost Allocation</h3>
                <p className="text-sm text-slate-500 font-medium">Distribution by statutory category</p>
              </div>
              
              <div className="flex-1 flex flex-col justify-center relative">
                {costDistributionData.length > 0 ? (
                  <>
                    <div className="h-[300px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={costDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={90}
                            outerRadius={120}
                            dataKey="value"
                            paddingAngle={6}
                            stroke="transparent"
                          >
                            {costDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer outline-none" />
                            ))}
                          </Pie>
                          <Tooltip content={<div className="glass-dark p-3 rounded-xl border border-white/10 shadow-2xl text-white text-xs font-bold font-mono">Custom Value</div>} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-slate-900 tracking-tighter font-mono">
                          {fmtShort(totalGrossForChart || Number(currentRun?.totalGross))}
                        </span>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                          Gross
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-10">
                      {costDistributionData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-3 p-3 bg-white/30 rounded-2xl border border-white/50">
                          <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.fill }} />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{entry.name}</p>
                            <p className="text-sm font-black text-slate-900 font-mono">{fmt(entry.value)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center opacity-50 py-20">
                    <AlertCircle className="w-10 h-10 text-slate-300 mb-4" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Cost Data</p>
                  </div>
                )}
              </div>
            </div>

            {/* Salary Distribution */}
            <div className="lg:col-span-7 glass-card p-8 flex flex-col h-full min-h-[500px]">
              <div className="mb-10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-1">Pay Distribution</h3>
                  <p className="text-sm text-slate-500 font-medium">Employee-wise salary spread</p>
                </div>
                <div className="bg-brand-50 text-brand-primary text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest">
                  {salaryDistributionData.length} Personnel
                </div>
              </div>

              <div className="flex-1 w-full mt-4">
                {salaryDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={salaryDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="rank" hide />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <Tooltip />
                      <Line type="monotone" dataKey="grossSalary" stroke="var(--color-brand-700)" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="netSalary" stroke="#10b981" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="deductions" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center opacity-50">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Awaiting Run Results</p>
                  </div>
                )}
              </div>

              {/* Summary Items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-10 pt-10 border-t border-slate-100">
                {summaryItems.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
                    <p className={cn("text-base font-black font-mono tracking-tighter", item.valueClassName || "text-slate-900")}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bento Box: Main Totals */}
          <div className="glass-card p-10 bg-brand-primary text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center border border-white/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-3xl font-black tracking-tight leading-none mb-2">Cycle Complete</h4>
                  <p className="text-emerald-100 font-bold tracking-wide uppercase text-xs">Total Net Disbursement for {periodName}</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-6xl font-black tracking-tighter font-mono leading-none">
                  {fmt(Number(currentRun?.totalNet))}
                </p>
                <div className="mt-4 flex flex-wrap md:justify-end gap-3">
                  <span className="bg-white/20 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20">Finalized</span>
                  <span className="bg-white/20 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20">Tax Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
