import React, { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Layers,
  Loader2,
  Banknote,
  Play,
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
import { payrollRunApi } from "../api/payrollProcessingApi";
import type { PayrollRun, PayrollRunItem } from "../api/payrollProcessingApi";
import type { PayrollPeriod } from "../../configuration/types/configuration.types";

interface PayrollDashboardTabProps {
  selectedPeriodId: string | null;
  periods: any[];
  runs: PayrollRun[];
  payrollPeriods: PayrollPeriod[];
  onPeriodChange: (periodId: string | null) => void;
}

const chartColors = {
  basic: "var(--color-brand-700)",
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

export const PayrollDashboardTab: React.FC<PayrollDashboardTabProps> = ({
  selectedPeriodId,
  periods,
  runs,
  payrollPeriods: _payrollPeriods,
  onPeriodChange,
}) => {
  const [items, setItems] = useState<PayrollRunItem[]>([]);
  const [allItems, setAllItems] = useState<PayrollRunItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // ── Derived data ──────────────────────────────────────

  const currentRun = useMemo(() => {
    if (!selectedPeriodId || runs.length === 0) return null;
    return runs.find((r) => r.payrollPeriodId === selectedPeriodId) ?? null;
  }, [runs, selectedPeriodId]);

  const periodRuns = useMemo(() => {
    if (!selectedPeriodId) return [];
    return runs.filter((r) => r.payrollPeriodId === selectedPeriodId);
  }, [runs, selectedPeriodId]);

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

  // ── Data fetching ──────────────────────────────────────

  useEffect(() => {
    if (!currentRun) {
      setItems([]);
      setAllItems([]);
      return;
    }

    let cancelled = false;

    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const res = await payrollRunApi.getRunItems(currentRun.id, {
          page: 1,
          limit: 1000,
        });
        if (!cancelled) {
          const data = res.data.data;
          setAllItems(data);
          setItems(data);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setAllItems([]);
        }
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    };

    fetchItems();
    return () => {
      cancelled = true;
    };
  }, [currentRun?.id]);

  // ── Chart data ─────────────────────────────────────────

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
      icon: Clock,
      iconColor: "text-blue-500",
    },
    {
      label: "Employees",
      main: currentRun ? String(currentRun.employeeCount) : "\u2014",
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
        { label: "Other Deductions", value: "\u2014" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-3">
        <select
          value={selectedPeriodId ?? ""}
          onChange={(e) => onPeriodChange(e.target.value || null)}
          className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
        >
          {periods.length === 0 && <option value="">No periods</option>}
          {periods.map((p: any) => {
            const now = new Date();
            const isActive =
              new Date(p.startDate) <= now && new Date(p.endDate) >= now;
            return (
              <option key={p.id} value={p.id}>
                {isActive ? "\u25CF " : ""}
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
      </div>

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
        <div className="bg-gradient-to-br from-brand-50 to-teal-50 border border-brand-200 rounded-2xl p-5 shadow-sm">
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
                    {costDistributionData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={costDistributionData[index].fill}
                      />
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
              <p className="text-sm text-slate-400">No cost data available</p>
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
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Employees ranked by net salary —{" "}
            {salaryDistributionData.length} employees
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
                {loadingItems
                  ? "Loading..."
                  : "Run payroll to see distribution"}
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
                      `${(value / 1_000_000).toFixed(0)}M`
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
                      value != null ? formatCurrency(Number(value)) : ""
                    }
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={50}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill || "var(--color-brand-700)"}
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

          <div className="mt-8 bg-brand-50 rounded-xl p-4 flex justify-between items-center border border-emerald-100">
            <span className="text-emerald-900 font-bold">Total Net Pay</span>
            <span className="text-2xl font-black text-emerald-900">
              {fmt(Number(currentRun?.totalNet))}
            </span>
          </div>
        </div>
      </div>

      {/* Empty state when no runs */}
      {!currentRun && !loadingItems && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Banknote className="w-12 h-12 text-slate-300" />
          <div className="text-center">
            <p className="text-sm font-bold text-slate-600">
              No Payroll Runs Yet
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Switch to the processing tab to run payroll for a period.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loadingItems && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-3" />
          <span className="text-sm text-slate-500">Loading data...</span>
        </div>
      )}
    </div>
  );
};
