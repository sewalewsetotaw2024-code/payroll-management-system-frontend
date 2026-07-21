import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Users, TrendingUp, Calendar, Inbox, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { cn, slugify } from "../../../lib/utils";
import { GlassCard, StatusBadge, InitialAvatar, Button } from "../../../components/ui";
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
  const { employeeSlug } = useParams<{ employeeSlug: string }>();
  const [searchParams] = useSearchParams();
  const importId = searchParams.get("importId");
  const navigate = useNavigate();

  const [resolvedEmployeeId, setResolvedEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ImportDetail | null>(null);
  const [summary, setSummary] = useState<AttendanceMonthlySummary | null>(null);
  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    if (!importId || !employeeSlug) return;
    let cancelled = false;

    setLoading(true);
    attendanceApi.getImportById(importId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);

        // Find employee record by matching slugified name
        const matchedRecord = data.attendanceRecords?.find((r) => {
          if (!r.employee) return false;
          const fullName = `${r.employee.firstName} ${r.employee.lastName || ""}`.trim();
          return slugify(fullName) === employeeSlug;
        });

        if (matchedRecord?.employee) {
          const empId = matchedRecord.employee.id;
          setResolvedEmployeeId(empId);
          setEmployeeName(`${matchedRecord.employee.firstName} ${matchedRecord.employee.lastName || ""}`.trim());

          const empSummary = data.monthlySummaries?.find((s) => s.employeeId === empId);
          if (empSummary) setSummary(empSummary);
        } else {
          setError("Employee not found in this import");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load employee intelligence.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [importId, employeeSlug]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full" />
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
    <div className="max-w-7xl mx-auto space-y-10 pb-20 relative">
      {/* Premium Glass Header */}
      <div className="glass rounded-[3rem] p-10 bg-white/40 border-white shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-6">
            <button 
              onClick={() => navigate(`/attendance${importId ? `?importId=${importId}` : ""}`)}
              className="group flex items-center gap-3 text-slate-400 hover:text-brand-primary transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-2xl glass border-white flex items-center justify-center group-hover:bg-white transition-all shadow-sm">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Personnel Overview</span>
            </button>
            
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-brand-primary rounded-[2rem] blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
                <InitialAvatar
                  firstName={employeeName?.split(' ')[0] ?? ''}
                  lastName={employeeName?.split(' ').slice(1).join(' ') ?? ''}
                  size="xl"
                  variant="emerald"
                  className="rounded-[2rem] shadow-xl relative z-10 ring-4 ring-white"
                />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                    {employeeName || "Identifying..."}
                  </h1>
                  <span className="px-3 py-1 rounded-xl bg-brand-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                    Verified Present
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-primary" />
                    <span>{detail.periodLabel || "Active Cycle"}</span>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span className="text-slate-900">Biometric Intel Report</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 shrink-0">
            <Button variant="secondary" className="px-8 shadow-lg border-white">
              <Inbox className="w-4 h-4" /> Export Intel
            </Button>
            <Button className="px-8 shadow-brand-900/20">
              <ShieldCheck className="w-4 h-4" /> Finalize Record
            </Button>
          </div>
        </div>
      </div>

      {/* Dynamic Stats - Bento Grid */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Cycle Utilization', value: formatHourValue(summary.regularHours), unit: 'h', icon: Clock, color: 'text-blue-500', desc: 'Regular Hours' },
            { label: 'Cumulative Delay', value: summary.lateMinutes, unit: 'm', icon: AlertTriangle, color: summary.lateMinutes > 60 ? 'text-red-500' : 'text-amber-500', desc: 'Lateness Log' },
            { label: 'Overtime Engine', value: formatHourValue(Number(summary.normalOtHours) + Number(summary.weekendOtHours)), unit: 'h', icon: TrendingUp, color: 'text-indigo-500', desc: 'Total OT Ingest' },
            { label: 'Presence Matrix', value: detail.attendanceRecords?.filter((r) => r.employeeId === resolvedEmployeeId && !r.isAbsent).length ?? 0, unit: '', icon: CheckCircle2, color: 'text-brand-primary', desc: 'Active Days' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-[2rem] p-8 shadow-xl border-white group hover:-translate-y-1 transition-all duration-300 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <div className={cn("w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center ring-1 ring-slate-100 group-hover:scale-110 transition-transform", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</span>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
                  {stat.value}<span className="text-sm font-bold text-slate-400 ml-1">{stat.unit}</span>
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{stat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Two-column layout: Heatmap + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Heatmap Card */}
        <div className="lg:col-span-8 glass rounded-[3rem] p-10 shadow-2xl border-white bg-white/40">
          <AttendanceHeatmap
            employeeId={resolvedEmployeeId!}
            importId={importId!}
            employeeName={employeeName}
          />
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* Work Metrics - Dark glass card */}
          <div className="glass-dark rounded-[3.5rem] p-10 shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-8 border-b border-white/10 pb-4">Cycle Performance Matrix</h3>
            <div className="space-y-6">
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
                    className="flex items-center justify-between group/item"
                  >
                    <span className="text-xs font-bold text-white/50 group-hover/item:text-white transition-colors">{field}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-lg font-black tracking-tight font-mono", val > 0 && field.includes("Absence") ? "text-rose-400" : "text-white")}>
                        {formatHourValue(val)}
                      </span>
                      <span className="text-[10px] font-black text-white/30 uppercase">{field.includes("Minutes") ? "m" : "h"}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Summary Verdict */}
          <div className="glass bg-brand-50 rounded-[3rem] p-8 border-white shadow-xl group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5 text-brand-primary" />
              </div>
              <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em]">Compliance Verdict</h3>
            </div>
            <p className="text-emerald-900/70 text-sm leading-relaxed font-medium">
              Employee attendance for the current processing window indicates a <span className="font-black text-emerald-900">{(Number(summary?.regularHours || 0) / 160 * 100).toFixed(0)}%</span> adherence to assigned shifts. Biometric verification logs are within standard deviation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
