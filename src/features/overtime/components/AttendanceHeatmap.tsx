import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../lib/utils";
import { Skeleton } from "../../../components/ui";
import { attendanceApi } from "../../attendance/api/attendanceApi";
import type { EmployeeDailyRecords, MonthGroup, DailyRecordEntry } from "../../attendance/types/attendance.types";

interface AttendanceHeatmapProps {
  employeeId: string;
  importId: string;
  employeeName?: string;
  compact?: boolean;
}

/**
 * Calendar-Style Heatmap
 *
 * Fetches pre-structured daily records from the backend (grouped by month)
 * and renders them in a calendar grid. No client-side grouping needed.
 */
export const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({
  employeeId,
  importId,
  employeeName,
  compact = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EmployeeDailyRecords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    attendanceApi.getEmployeeDailyRecords(importId, employeeId)
      .then((result) => {
        if (cancelled) return;
        setData(result);

        // Default to the month with the most days
        if (result.months.length > 0) {
          const best = result.months.reduce(
            (a, b) => (a.days.length > b.days.length ? a : b),
            result.months[0],
          );
          const bestIdx = result.months.indexOf(best);
          setSelectedMonthIdx(bestIdx >= 0 ? bestIdx : 0);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load cycle data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [employeeId, importId]);

  const activeMonth = data?.months[selectedMonthIdx] ?? null;

  // Build calendar grid for the active month
  const calendarGrid = buildCalendarGrid(activeMonth);

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <p className="text-sm font-medium">Failed to load attendance data.</p>
      <p className="text-xs text-slate-300 mt-1">{error}</p>
    </div>
  );

  if (!data || data.months.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <p className="text-sm font-medium">No attendance records found for this period.</p>
    </div>
  );

  return (
    <div className={cn("bg-white", compact ? "" : "p-4")}>
      {/* Calendar Header */}
      {!compact && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-3xl font-black text-slate-800 tracking-tight">
               {activeMonth!.monthName} <span className="text-slate-400 font-medium">{activeMonth!.year}</span>
             </h2>
             <div className="flex items-center gap-3">
               <div className="flex items-center gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Present</span>
               </div>
               <div className="flex items-center gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Absent</span>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="max-w-xl mx-auto">
        {!compact && (
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest pb-2">
                {d}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-7 gap-1.5">
          {calendarGrid.map((item, idx) => (
            <CalendarCell key={idx} item={item} idx={idx} compact={compact} />
          ))}
        </div>

        {/* Month Navigation */}
        {!compact && data.months.length > 1 && (
          <div className="flex items-center justify-center gap-6 mt-12">
            <button
              disabled={selectedMonthIdx === 0}
              onClick={() => setSelectedMonthIdx(p => p - 1)}
              className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">
              {activeMonth!.monthName} {activeMonth!.year}
            </span>
            <button
              disabled={selectedMonthIdx === data.months.length - 1}
              onClick={() => setSelectedMonthIdx(p => p + 1)}
              className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Pure helper: build calendar grid from a month group ──────────────────────

function buildCalendarGrid(month: MonthGroup | null): ({ day: number; record?: DailyRecordEntry; empty?: boolean })[] {
  if (!month || month.days.length === 0) return [];

  const [year, monthNum] = month.key.split("-").map(Number);
  const jsMonth = monthNum - 1;

  const startOfMonth = new Date(year, jsMonth, 1);
  const endOfMonth = new Date(year, jsMonth + 1, 0);

  const startingDay = startOfMonth.getDay();
  const totalDays = endOfMonth.getDate();

  const grid: ({ day: number; record?: DailyRecordEntry; empty?: boolean })[] = [];

  for (let i = 0; i < startingDay; i++) {
    grid.push({ day: 0, empty: true });
  }

  // Build a quick lookup map: dateString -> record
  const recordMap = new Map<string, DailyRecordEntry>();
  for (const d of month.days) {
    recordMap.set(d.date, d);
  }

  for (let i = 1; i <= totalDays; i++) {
    const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const record = recordMap.get(dateStr);
    grid.push({ day: i, record });
  }

  return grid;
}

// ── Calendar Cell Component ──────────────────────────────────────────────────

const CalendarCell = ({ item, idx, compact }: { item: any; idx: number; compact: boolean }) => {
  if (item.empty) return <div className="aspect-square" />;

  const record = item.record as DailyRecordEntry | undefined;
  const hours = record ? record.hours : 0;
  const isAbsent = record?.isAbsent ?? false;
  const isPresent = hours > 0;

  let cellBg = "bg-slate-50/50";
  let textColor = "text-slate-400";
  let subColor = "text-slate-300";
  let border = "border-slate-100";

  if (isPresent) {
    cellBg = "bg-brand-50 shadow-sm shadow-emerald-600/5";
    textColor = "text-emerald-900";
    subColor = "text-emerald-600";
    border = "border-emerald-100";
  } else if (isAbsent) {
    cellBg = "bg-red-100 shadow-sm shadow-red-600/5";
    textColor = "text-red-900 font-black";
    subColor = "text-red-600";
    border = "border-red-200";
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.005 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "aspect-square rounded-xl flex flex-col items-center justify-center border transition-all cursor-default group",
        cellBg,
        border,
        isAbsent && "animate-pulse-subtle"
      )}
    >
      <span className={cn("font-bold tracking-tight", compact ? "text-xs" : "text-base", textColor)}>
        {item.day}
      </span>
      {record && (
        <span className={cn("font-bold tracking-tighter mt-0.5", compact ? "text-[7px]" : "text-[9px]", subColor)}>
          {isPresent ? `+${hours}h` : isAbsent ? `ABSENT` : ""}
        </span>
      )}
    </motion.div>
  );
};
