import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronLeft, Loader2, AlertTriangle } from "lucide-react";
import { cn, formatCurrency } from "../../../lib/utils";
import { Pagination } from "../../../components/ui/Pagination/Pagination";
import { payrollRunApi, type PayrollRunItem, type PayrollRunItemDetail } from "../api/payrollProcessingApi";

/* ─── Types ─────────────────────────────────────────────────── */

interface ExpandablePayrollTableProps {
  items: PayrollRunItem[];
  runId: string;
  loading: boolean;
  onSelectItem: (runId: string, itemId: string) => void;
}

/* ─── Earning type → column label ──────────────────────────── */

type ColumnKey =
  | "name" | "position" | "department" | "workingDay"
  | "basicSalary" | "grossSalary"
  | "transportTaxable" | "transportNonTaxable"
  // expanded (hidden until expand)
  | "telephone" | "representation" | "housing"
  | "meal" | "overtime" | "incomeTax"
  | "pensionEmployer" | "pensionEmployee"
  | "otherDeductions" | "totalDeduction" | "netPay";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  align: "left" | "right";
  expanded: boolean;          // true = hidden until expand
  alwaysExpand?: boolean;     // e.g. netPay always expanded? no — it's in expanded group
}

/* ─── Detail value helpers ──────────────────────────────────── */

function getEarningAmount(detail: PayrollRunItemDetail | null, earningType: string): number {
  if (!detail) return 0;
  return detail.payrollEarnings
    .filter((e) => e.earningType === earningType)
    .reduce((s, e) => s + Number(e.amount), 0);
}

function getAllowanceAmount(detail: PayrollRunItemDetail | null, labelMatch: string): number {
  if (!detail) return 0;
  return detail.payrollAllowances
    .filter((a) => a.label?.toLowerCase().includes(labelMatch.toLowerCase()))
    .reduce((s, a) => s + Number(a.amount), 0);
}

/** Sum of all deductions EXCEPT income tax and employee pension. */
function getOtherDeductions(detail: PayrollRunItemDetail | null): number {
  if (!detail) return 0;
  return detail.payrollDeductions
    .filter((d) => d.deductionType !== "EMPLOYMENT_INCOME_TAX" && d.deductionType !== "PENSION_EMPLOYEE")
    .reduce((s, d) => s + Number(d.amount), 0);
}

/* ─── Column definition order ───────────────────────────────── */

const COLUMNS: ColumnDef[] = [
  { key: "name",               label: "Master Data Name",                  align: "left",  expanded: false },
  { key: "position",           label: "Job Position",                      align: "left",  expanded: false },
  { key: "department",         label: "Department",                        align: "left",  expanded: false },
  { key: "workingDay",         label: "Working Day",                       align: "right", expanded: false },
  { key: "basicSalary",        label: "Basic Salary",                      align: "right", expanded: false },
  { key: "grossSalary",        label: "Gross Salary",                      align: "right", expanded: false },
  { key: "transportTaxable",   label: "Transport (Taxable Remuneration)",  align: "right", expanded: false },
  { key: "transportNonTaxable",label: "Non-Taxable Transport Allowance",   align: "right", expanded: false },
  // ── expand boundary ──
  { key: "telephone",          label: "Telephone Allowance",               align: "right", expanded: true },
  { key: "representation",     label: "Representation / Meal (Non-Mgmt)",  align: "right", expanded: true },
  { key: "housing",            label: "Housing Allowance",                 align: "right", expanded: true },
  { key: "meal",               label: "Meal Allowance",                    align: "right", expanded: true },
  { key: "overtime",           label: "OT (Overtime)",                     align: "right", expanded: true },
  { key: "incomeTax",          label: "Income Tax",                        align: "right", expanded: true },
  { key: "pensionEmployer",    label: "11% Pension (Employer)",            align: "right", expanded: true },
  { key: "pensionEmployee",    label: "7% Pension (Employee)",             align: "right", expanded: true },
  { key: "otherDeductions",    label: "Other Deductions",                  align: "right", expanded: true },
  { key: "totalDeduction",     label: "Total Deduction",                   align: "right", expanded: true },
  { key: "netPay",             label: "Net Pay",                           align: "right", expanded: true },
];

const DEFAULT_COLUMNS = COLUMNS.filter((c) => !c.expanded);
const EXPANDED_COLUMNS = COLUMNS.filter((c) => c.expanded);

/* ─── Cell value extractor ──────────────────────────────────── */

function cellValue(
  item: PayrollRunItem,
  detail: PayrollRunItemDetail | null,
  key: ColumnKey,
): { value: string; isNumber: boolean; colorClass?: string } {
  const num = (v: number | string | null | undefined): number =>
    (v == null ? 0 : typeof v === "string" ? parseFloat(v) : v);
  const fmt = (v: number) => formatCurrency(v);
  const emp = item.employee;

  switch (key) {
    case "name": {
      const name = emp
        ? `${emp.firstName} ${emp.lastName}`
        : `Employee #${String(item.employeeId).substring(0, 8)}`;
      return { value: name, isNumber: false };
    }
    case "position":
      return { value: emp?.jobPosition || "\u2014", isNumber: false };
    case "department":
      return { value: emp?.departmentName || "\u2014", isNumber: false };
    case "workingDay":
      return { value: String(item.workDays ?? 0), isNumber: true };
    case "basicSalary":
      return { value: fmt(num(item.basicSalary)), isNumber: true };
    case "grossSalary":
      return { value: fmt(num(item.grossSalary)), isNumber: true, colorClass: "text-slate-800 font-semibold" };
    case "transportTaxable": {
      const amt = getEarningAmount(detail, "TRANSPORT_TAXABLE");
      return { value: amt > 0 ? fmt(amt) : "\u2014", isNumber: true };
    }
    case "transportNonTaxable": {
      const amt = getEarningAmount(detail, "TRANSPORT_NON_TAXABLE");
      return { value: amt > 0 ? fmt(amt) : "\u2014", isNumber: true };
    }
    case "telephone": {
      const amt = getEarningAmount(detail, "TELEPHONE_ALLOWANCE");
      return { value: amt > 0 ? fmt(amt) : "\u2014", isNumber: true };
    }
    case "representation": {
      const amt = getEarningAmount(detail, "RESPONSIBILITY_ALLOWANCE");
      return { value: amt > 0 ? fmt(amt) : "\u2014", isNumber: true };
    }
    case "housing": {
      const amt = getEarningAmount(detail, "HOUSING_ALLOWANCE");
      return { value: amt > 0 ? fmt(amt) : "\u2014", isNumber: true };
    }
    case "meal": {
      const amt = getEarningAmount(detail, "MEAL_ALLOWANCE");
      return { value: amt > 0 ? fmt(amt) : "\u2014", isNumber: true };
    }
    case "overtime": {
      const amt = detail
        ? detail.payrollOvertime.reduce((s, o) => s + Number(o.amount), 0)
        : 0;
      return { value: amt > 0 ? fmt(amt) : "\u2014", isNumber: true };
    }
    case "incomeTax": {
      const amt = detail ? Number(detail.payrollTax?.taxAmount ?? 0) : 0;
      return { value: amt > 0 ? fmt(amt) : "\u2014", isNumber: true, colorClass: "text-slate-900" };
    }
    case "pensionEmployer": {
      const amt = detail ? Number(detail.payrollPension?.employerContribution ?? 0) : 0;
      return { value: amt > 0 ? fmt(amt) : "\u2014", isNumber: true, colorClass: "text-slate-900" };
    }
    case "pensionEmployee": {
      const amt = detail ? Number(detail.payrollPension?.employeeContribution ?? 0) : 0;
      return { value: amt > 0 ? fmt(amt) : "\u2014", isNumber: true, colorClass: "text-slate-900" };
    }
    case "otherDeductions": {
      const other = detail ? getOtherDeductions(detail) : 0;
      const amt = other + (detail
        ? Number(detail.payrollDeductions.find((d) => d.deductionType === "EMPLOYMENT_INCOME_TAX")?.amount ?? 0)
        : 0);
      // other deductions = everything except tax and employee pension
      const otherTotal = detail
        ? detail.payrollDeductions
            .filter((d) => d.deductionType !== "EMPLOYMENT_INCOME_TAX" && d.deductionType !== "PENSION_EMPLOYEE")
            .reduce((s, d) => s + Number(d.amount), 0)
        : 0;
      return { value: otherTotal > 0 ? fmt(otherTotal) : "\u2014", isNumber: true, colorClass: "text-slate-900" };
    }
    case "totalDeduction":
      return { value: fmt(num(item.totalDeductions)), isNumber: true, colorClass: "text-slate-900 font-semibold" };
    case "netPay":
      return { value: fmt(num(item.netSalary)), isNumber: true, colorClass: "text-slate-900 font-bold" };
    default:
      return { value: "\u2014", isNumber: false };
  }
}

/* ─── Footer total helper ───────────────────────────────────── */

function totalFor(items: PayrollRunItem[], details: Map<string, PayrollRunItemDetail | null>, key: ColumnKey): string {
  const num = (v: number | string | null | undefined): number =>
    (v == null ? 0 : typeof v === "string" ? parseFloat(v) : v);

  switch (key) {
    case "basicSalary":
      return formatCurrency(items.reduce((s, i) => s + num(i.basicSalary), 0));
    case "grossSalary":
      return formatCurrency(items.reduce((s, i) => s + num(i.grossSalary), 0));
    case "overtime":
      return formatCurrency(items.reduce((s, i) => {
        const d = details.get(i.id) ?? null;
        return s + (d ? d.payrollOvertime.reduce((a, o) => a + Number(o.amount), 0) : 0);
      }, 0));
    case "incomeTax":
      return formatCurrency(items.reduce((s, i) => {
        const d = details.get(i.id) ?? null;
        return s + Number(d?.payrollTax?.taxAmount ?? 0);
      }, 0));
    case "pensionEmployer":
      return formatCurrency(items.reduce((s, i) => {
        const d = details.get(i.id) ?? null;
        return s + Number(d?.payrollPension?.employerContribution ?? 0);
      }, 0));
    case "pensionEmployee":
      return formatCurrency(items.reduce((s, i) => {
        const d = details.get(i.id) ?? null;
        return s + Number(d?.payrollPension?.employeeContribution ?? 0);
      }, 0));
    case "otherDeductions":
      return formatCurrency(items.reduce((s, i) => {
        const d = details.get(i.id) ?? null;
        if (!d) return s;
        return s + d.payrollDeductions
          .filter((dd) => dd.deductionType !== "EMPLOYMENT_INCOME_TAX" && dd.deductionType !== "PENSION_EMPLOYEE")
          .reduce((a, dd) => a + Number(dd.amount), 0);
      }, 0));
    case "totalDeduction":
      return formatCurrency(items.reduce((s, i) => s + num(i.totalDeductions), 0));
    case "netPay":
      return formatCurrency(items.reduce((s, i) => s + num(i.netSalary), 0));
    default:
      return "\u2014";
  }
}

/* ═══════════════════════════════════════════════════════════════ */
/*  COMPONENT                                                      */
/* ═══════════════════════════════════════════════════════════════ */

export const ExpandablePayrollTable: React.FC<ExpandablePayrollTableProps> = ({
  items,
  runId,
  loading,
  onSelectItem,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<Map<string, PayrollRunItemDetail | null>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const detailsFetchedRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  const HIDDEN_COUNT = EXPANDED_COLUMNS.length; // 11

  /* ── Fetch details for expanded view ────────────────────── */
  const fetchDetails = useCallback(async () => {
    setLoadingDetails(true);
    const map = new Map<string, PayrollRunItemDetail | null>();
    const results = await Promise.allSettled(
      items.map((item) =>
        payrollRunApi.getRunItem(runId, item.id).then((res) => ({ id: item.id, data: res.data.data })),
      ),
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        map.set(result.value.id, result.value.data);
      } else {
        map.set(items.find((i) => true)?.id ?? "", null); // graceful degrade
      }
    }
    // Build a complete map: for items that failed, store null
    for (const item of items) {
      if (!map.has(item.id)) map.set(item.id, null);
    }
    setDetails(map);
    detailsFetchedRef.current = true;
    setLoadingDetails(false);
  }, [items, runId]);

  /* Auto-fetch details when items load (needed for cols 7-8 even in collapsed view) */
  useEffect(() => {
    if (items.length > 0 && !detailsFetchedRef.current) {
      fetchDetails();
    }
  }, [items, fetchDetails]);

  /* ── Scroll detection for gradient overlay ──────────────── */
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    const notAtEnd = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setCanScrollRight(expanded && hasOverflow && notAtEnd);
  }, [expanded]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll, expanded]);

  /* ── Expand / collapse ──────────────────────────────────── */
  const handleExpand = useCallback(() => {
    setExpanded(true);
    // Fetch details if not already fetched
    if (!detailsFetchedRef.current) {
      fetchDetails();
    }
    // After render, the scroll container will have overflow; check scroll
    requestAnimationFrame(() => checkScroll());
  }, [fetchDetails, checkScroll]);

  const handleCollapse = useCallback(() => {
    setExpanded(false);
  }, []);

  /* ── Keyboard accessibility ─────────────────────────────── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, action: () => void) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        action();
      }
    },
    [],
  );

  /* ── Detail lookup helper ──────────────────────────────── */
  const getDetail = useCallback(
    (itemId: string): PayrollRunItemDetail | null => details.get(itemId) ?? null,
    [details],
  );

  /* ── Render ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Loading payroll data...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-400">No payroll items found for this period.</p>
      </div>
    );
  }

  const visibleCols = expanded ? COLUMNS : DEFAULT_COLUMNS;

  return (
    <div className="space-y-2">
      {/* ── Expanded toolbar ─────────────────────────────────── */}
      {expanded && (
        <div className="flex items-center justify-between px-1 py-1.5">
          <button
            onClick={handleCollapse}
            onKeyDown={(e) => handleKeyDown(e, handleCollapse)}
            tabIndex={0}
            aria-label="Collapse table to default 8-column view"
            className="cursor-pointer inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Collapse
          </button>
          <span className="text-[11px] text-slate-400 font-medium">
            {COLUMNS.length} columns visible
          </span>
        </div>
      )}

      {/* ── Table container (horizontally scrollable) ────────── */}
      <div className="relative">
        {/* Scroll gradient overlay — right edge */}
        {canScrollRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 z-10 bg-gradient-to-l from-white/90 to-transparent" />
        )}

          <div
            ref={scrollRef}
            className={cn("overflow-x-auto rounded-[2rem] glass border-white shadow-xl")}
          >
            {loadingDetails && expanded && (
              <div className="absolute top-4 right-16 z-20 flex items-center gap-2 glass-dark px-4 py-2 rounded-xl shadow-2xl text-white text-[10px] font-black uppercase tracking-widest border-white/10">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Updating Matrix...
              </div>
            )}

            <table className="w-full text-sm border-collapse" style={{ minWidth: expanded ? "2400px" : "1200px" }}>
              {/* ── Header ──────────────────────────────────────── */}
              <thead>
                <tr className="bg-white/40 border-b border-slate-100">
                  {visibleCols.map((col, idx) => {
                    const isLastDefault = idx === DEFAULT_COLUMNS.length - 1 && !expanded;
                    return (
                      <th
                        key={col.key}
                        className={cn(
                          "px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap transition-all",
                          col.align === "right" ? "text-right" : "text-left",
                          // Sticky first column
                          col.key === "name" &&
                            "sticky left-0 z-10 bg-white/80 backdrop-blur-md border-r border-slate-200/50",
                          // Boundary divider after last default column
                          isLastDefault && "border-r-4 border-brand-primary/20",
                          // Column separator
                          idx < visibleCols.length - 1 && "border-r border-slate-200/50",
                        )}
                        title={col.label}
                      >
                        <div className="flex items-center gap-2">
                          {col.label}
                          {/* Expand trigger button — at last default column header */}
                          {isLastDefault && !expanded && (
                            <button
                              onClick={handleExpand}
                              onKeyDown={(e) => handleKeyDown(e, handleExpand)}
                              tabIndex={0}
                              aria-label="Show more columns"
                              title={`Show ${HIDDEN_COUNT} more columns`}
                              className="cursor-pointer ml-2 inline-flex items-center justify-center w-8 h-8 rounded-xl bg-brand-primary text-white hover:bg-brand-dark transition-all shadow-lg shadow-brand-900/20 active:scale-90"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

            {/* ── Body ────────────────────────────────────────── */}
            <tbody>
              {paginatedItems.map((item, idx) => {
                const detail = getDetail(item.id);
                const isBreached = item.deductionCapBreached;
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectItem(runId, item.id)}
                    className={cn(
                      "border-b border-slate-50 transition-all cursor-pointer group",
                      idx % 2 === 0 ? "bg-white/20" : "bg-transparent",
                      isBreached
                        ? "bg-rose-50/50 hover:bg-rose-100/50"
                        : "hover:bg-brand-primary/5",
                    )}
                  >
                    {visibleCols.map((col, idx) => {
                      const { value, isNumber, colorClass } = cellValue(item, detail, col.key);
                      const isLastDefault = idx === DEFAULT_COLUMNS.length - 1 && !expanded;
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            "px-6 py-4 transition-all",
                            col.align === "right" ? "text-right font-mono font-bold tracking-tight" : "text-left font-black",
                            colorClass || "text-slate-700",
                            // Sticky first column
                            col.key === "name" &&
                              "sticky left-0 z-10 bg-white group-hover:bg-brand-primary/5 border-r border-slate-200/50",
                            // Boundary divider
                            isLastDefault && "border-r-4 border-brand-primary/20",
                            // Column separator
                            idx < visibleCols.length - 1 && "border-r border-slate-200/50",
                          )}
                        >
                          {col.key === "name" ? (
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-brand-primary shadow-lg shadow-brand-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <span className="text-[10px] font-black text-white">
                                  {item.employee
                                    ? (item.employee.firstName?.[0] ?? "") + (item.employee.lastName?.[0] ?? "")
                                    : "?"}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <span className="font-black text-slate-900 whitespace-nowrap block">
                                  {value}
                                </span>
                                {isBreached && (
                                  <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mt-0.5">Cap Breached</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className={cn(
                              "whitespace-nowrap text-xs",
                              isNumber ? "tabular-nums" : "",
                            )}>
                              {value}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>

            {/* ── Footer totals ───────────────────────────────── */}
            <tfoot>
              <tr className="border-t-4 border-slate-100 bg-white/60 font-black text-xs">
                {visibleCols.map((col, idx) => {
                  const isLastDefault = idx === DEFAULT_COLUMNS.length - 1 && !expanded;
                  const total = totalFor(items, details, col.key);
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "px-6 py-6",
                        col.key === "name"
                          ? "sticky left-0 z-10 bg-white text-slate-900 border-r border-slate-200/50"
                          : col.align === "right"
                            ? "text-right font-mono tracking-tight"
                            : "text-left",
                        col.key === "name" ? "font-black uppercase tracking-widest text-[10px]" : "text-slate-800",
                        isLastDefault && "border-r-4 border-brand-primary/20",
                        idx < visibleCols.length - 1 && "border-r border-slate-200/50",
                      )}
                    >
                      {col.key === "name" ? (
                        <span>
                          Total ({items.length})
                        </span>
                      ) : (
                        total
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────── */}
      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        totalItems={items.length}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
      />
    </div>
  );
};
