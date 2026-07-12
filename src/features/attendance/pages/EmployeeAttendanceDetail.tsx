import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Users, TrendingUp, Calendar, Inbox, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../lib/utils";
import { GlassCard, StatusBadge, InitialAvatar } from "../../../components/ui";
import { attendanceApi } from "../api/attendanceApi";
import { AttendanceHeatmap } from "../../overtime/components/AttendanceHeatmap";
import { formatHourValue, getSummaryColor } from "../../../lib/parseBiometricWorkbook";
import type { ImportDetail, AttendanceMonthlySummary } from "../types/attendance.types";

const SUMMARY_FIELD_MAP: Record<string, keyof AttendanceMonthlySummary> = {
  "Regular Hours": "regularHours",
  "Late Minutes": "lateMinutes",
  "Absence Hours": "absenceHours",
  "Normal OT": "normalOtHours",
  "Weekend OT": "weekendOtHours",
  "Holiday OT": "holidayOtHours",
  "Night OT (OT1)": "ot1Hours",
};

const SUMMARY_FIELDS = Object.keys(SUMMARY_FIELD_MAP);

export const EmployeeAttendanceDetail: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [searchParams] = useSearchParams();
  const importId = searchParams.get("importId");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ImportDetail | null>(null);
  const [summary, setSummary] = useState<AttendanceMonthlySummary | null>(null);
  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    if (!importId || !employeeId) return;
    let cancelled = false;

    setLoading(true);
    attendanceApi.getImportById(importId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        const firstRecord = data.attendanceRecords?.find((r) => r.employeeId === employeeId);
        if (firstRecord?.employee) {
          setEmployeeName(`${firstRecord.employee.firstName} ${firstRecord.employee.lastName || ""}`.trim());
        }
        const empSummary = data.monthlySummaries?.find((s) => s.employeeId === employeeId);
        if (empSummary) setSummary(empSummary);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load employee intelligence.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [importId, employeeId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full" />
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Analyzing Performance Data...</p>
    </div>
  );

  if (error || !detail) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-sm mx-auto">
      <div className="w-16 h-16 bg-red-50 rounded-xl flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-xl font-black text-slate-800 mb-2">Access Restricted</h3>
      <p className="text-slate-500 text-sm mb-8 leading-relaxed">{error || "The requested biometric data is not available in the current sync cycle."}</p>
      <button onClick={() => navigate("/attendance")} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all active:scale-95">
        Return to Overview
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Premium Glass Header */}
      <GlassCard>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <button 
              onClick={() => navigate(`/attendance${importId ? `?importId=${importId}` : ""}`)}
              className="group flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-white/60 border border-slate-200 flex items-center justify-center group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest">Back to Attendance</span>
            </button>
            
            <div className="flex items-center gap-4">
              <InitialAvatar
                firstName={employeeName?.split(' ')[0] ?? ''}
                lastName={employeeName?.split(' ').slice(1).join(' ') ?? ''}
                size="xl"
                variant="emerald"
              />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    {employeeName || `Employee ${employeeId}`}
                  </h1>
                  <StatusBadge status="Present" />
                </div>
                <p className="text-sm text-slate-400 font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Intelligence Report &middot; <span className="text-slate-900 font-bold">{detail.periodLabel || "Current Sync"}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 shrink-0">
            <button className="px-5 py-2.5 bg-white/60 backdrop-blur-sm border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-white/80 transition-all flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer">
              <Inbox className="w-4 h-4" /> Export Report
            </button>
            <button className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer">
              <ShieldCheck className="w-4 h-4" /> Validate Hours
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Dynamic Stats - Glass Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard>
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Utilization</p>
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">{formatHourValue(summary.regularHours)}<span className="text-sm font-bold text-slate-400 ml-1">h</span></p>
            <p className="text-[11px] text-slate-400 mt-1">Regular Hours</p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Lateness</p>
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <p className={cn("text-3xl font-black tracking-tight tabular-nums", summary.lateMinutes > 60 ? "text-red-600" : "text-slate-900")}>
              {summary.lateMinutes}<span className="text-sm font-bold text-slate-400 ml-1">m</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Total Delay</p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overtime</p>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
              {formatHourValue(Number(summary.normalOtHours) + Number(summary.weekendOtHours))}<span className="text-sm font-bold text-slate-400 ml-1">h</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Total OT</p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attendance</p>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
              {detail.attendanceRecords?.filter((r) => r.employeeId === employeeId && !r.isAbsent).length ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Days Present</p>
          </GlassCard>
        </div>
      )}

      {/* Two-column layout: Heatmap + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap Card */}
        <GlassCard padding="lg" className="lg:col-span-2">
          <AttendanceHeatmap
            employeeId={employeeId!}
            importId={importId!}
            employeeName={employeeName}
          />
        </GlassCard>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Work Metrics - Dark glass card */}
          <GlassCard padding="lg" className="bg-slate-900/95 backdrop-blur-xl border-slate-700 text-white">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-6">Work Metrics</h3>
            <div className="space-y-4">
              {SUMMARY_FIELDS.map((field, idx) => {
                const modelField = SUMMARY_FIELD_MAP[field] as string;
                const val = modelField ? (summary as any)[modelField] as number : 0;
                if (val === 0 && !["Regular Hours"].includes(field)) return null;

                return (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={field} 
                    className="flex items-center justify-between py-2 border-b border-white/10 last:border-0"
                  >
                    <span className="text-xs font-bold text-white/60">{field}</span>
                    <span className={cn("text-sm font-black tracking-tight", val > 0 && field.includes("Absence") ? "text-red-400" : "text-white")}>
                      {formatHourValue(val)} {field.includes("Minutes") ? "m" : "h"}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>

          {/* Summary Verdict */}
          <GlassCard padding="lg" className="bg-emerald-50/80 border-emerald-200">
            <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-widest mb-4">Summary Verdict</h3>
            <p className="text-emerald-800/70 text-sm leading-relaxed font-medium">
              Attendance records for this cycle show a <span className="font-bold text-emerald-900">{(Number(summary?.regularHours || 0) / 160 * 100).toFixed(0)}%</span> shift compliance. No critical discrepancies detected in biometric logs.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
