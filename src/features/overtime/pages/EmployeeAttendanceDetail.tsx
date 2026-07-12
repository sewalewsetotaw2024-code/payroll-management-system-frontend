import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Clock, Users, TrendingUp, Calendar, Inbox, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../lib/utils";
import { Skeleton } from "../../../components/ui";
import { attendanceApi } from "../../attendance/api/attendanceApi";
import { AttendanceHeatmap } from "../components/AttendanceHeatmap";
import { formatHourValue, getSummaryColor } from "../../../lib/parseBiometricWorkbook";
import type { ImportDetail, AttendanceMonthlySummary } from "../../attendance/types/attendance.types";

const SUMMARY_FIELD_MAP: Record<string, keyof AttendanceMonthlySummary> = {
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
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-96" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-48 rounded-[2rem]" />
        <Skeleton className="h-48 rounded-[2rem]" />
        <Skeleton className="h-48 rounded-[2rem]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Skeleton className="lg:col-span-2 h-[500px] rounded-[2.5rem]" />
        <Skeleton className="h-[500px] rounded-[2.5rem]" />
      </div>
    </div>
  );

  if (error || !detail) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-sm mx-auto">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-xl font-black text-slate-800 mb-2">Access Restricted</h3>
      <p className="text-slate-500 text-sm mb-8 leading-relaxed">{error || "The requested biometric data is not available in the current sync cycle."}</p>
      <button onClick={() => navigate(-1)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all">
        Return to Overview
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <button 
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-all">
              <ArrowLeft className="w-4 h-4 translate-x-0 group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">Back</span>
          </button>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                {employeeName || `Employee ${employeeId}`}
              </h1>
              <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-tighter rounded-full border border-emerald-100">
                Active Profile
              </div>
            </div>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Intelligence Report &middot; <span className="text-slate-900 font-bold">{detail.periodLabel || "Current Sync"}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Inbox className="w-4 h-4" /> Export Report
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <ShieldCheck className="w-4 h-4" /> Validate Hours
          </motion.button>
        </div>
      </div>

      {/* Dynamic Stats Banner */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            label="Overtime Hours" 
            value={formatHourValue(Number(summary.normalOtHours) + Number(summary.weekendOtHours) + Number(summary.holidayOtHours) + Number(summary.ot1Hours)) + "h"} 
            sub="Total Cycle OT"
            icon={TrendingUp} 
            color="text-indigo-600"
            bg="bg-indigo-50"
            trend="+12% active demand"
          />
          <StatCard 
            label="OT Intensity" 
            value={String(detail.attendanceRecords?.filter((r) => r.employeeId === employeeId && Number(r.regularHours) > 0).length ?? 0)} 
            sub="Active Days"
            icon={Clock} 
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <StatCard 
            label="Max Multiplier" 
            value="2.5x" 
            sub="Holiday Rate"
            icon={ShieldCheck} 
            color="text-amber-600"
            bg="bg-amber-50"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Engagement Heatmap Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
          <AttendanceHeatmap
            employeeId={employeeId!}
            importId={importId!}
            employeeName={employeeName}
          />
        </div>

        {/* Breakdown Card */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest opacity-60 mb-8">Work Metrics</h3>
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
                    <span className="text-xs font-bold opacity-60">{field}</span>
                    <span className={cn("text-sm font-black tracking-tight", val > 0 && field.includes("Absence") ? "text-red-400" : "text-white")}>
                      {formatHourValue(val)} {field.includes("Minutes") ? "m" : "h"}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100">
            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-widest mb-4">Overtime Status</h3>
            <p className="text-amber-800/70 text-sm leading-relaxed font-medium">
              This employee has contributed <span className="font-bold text-amber-900">{formatHourValue(Number(summary?.normalOtHours) + Number(summary?.weekendOtHours))}</span> hours of overtime during the current period. All records are currently pending final payroll verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, sub, icon: Icon, color, bg, trend, isWarning }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm relative overflow-hidden group"
  >
    <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-5 group-hover:scale-110 transition-transform", bg)} />
    <div className="flex items-start justify-between mb-6">
      <div className={cn("p-4 rounded-2xl", bg)}>
        <Icon className={cn("w-6 h-6", color)} />
      </div>
      {trend && (
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{trend}</span>
      )}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
    <div className="flex items-baseline gap-2">
      <h3 className={cn("text-4xl font-black tracking-tight", isWarning ? "text-red-600" : "text-slate-900")}>{value}</h3>
      <span className="text-xs font-bold text-slate-400">{sub}</span>
    </div>
  </motion.div>
);
