import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Calculator, 
  TrendingUp, 
  PieChart, 
  Loader2, 
  ChevronRight,
  RefreshCw,
  BadgeCheck,
  Users,
  Send,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { ActionButton } from "./ActionButton";
import type { PayrollRunSummary } from "../types/approvalWorkflow.types";

interface PayrollStageProps {
  data: PayrollRunSummary | null;
  loading: boolean;
  approvalStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  isApprover: boolean;
  onRefresh: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onSubmit?: () => void;
  submitting?: boolean;
  onViewStats?: () => void;
}

export const PayrollStage: React.FC<PayrollStageProps> = ({
  data,
  loading,
  approvalStatus,
  isApprover,
  onRefresh,
  onApprove,
  onReject,
  onSubmit,
  submitting = false,
  onViewStats,
}) => {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (n: number) => n.toLocaleString();

  const statusLabel = (s: string) => {
    switch (s) {
      case "NONE": return "Awaiting";
      case "PENDING": return "In Review";
      case "APPROVED": return "Approved";
      case "REJECTED": return "Returned";
      default: return s;
    }
  };

  return (
    <div className="flow-card overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-brand-primary">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
              Payroll Run Summary
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                approvalStatus === "APPROVED" ? "bg-brand-primary text-white border-brand-primary" :
                approvalStatus === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
                "bg-slate-100 text-slate-500 border-slate-200"
              )}>
                {statusLabel(approvalStatus)}
              </span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">• Stage 2</span>
            </div>
          </div>
        </div>
        
        <ActionButton
          label="Refresh"
          icon={RefreshCw}
          variant="ghost"
          onClick={onRefresh}
          loading={loading}
          className="text-slate-400 hover:text-brand-primary"
        />
      </div>

      <div className="p-8 space-y-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
              <p className="text-sm font-bold text-slate-400">Loading payroll data...</p>
          </div>
        ) : !data ? (
          <div className="text-center py-24 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
             <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-600">Awaiting Payroll Run</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">Payroll results will appear here once attendance is approved.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Left Column: Key Totals */}
              <div className="space-y-10">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Gross</span>
                  <div className="flex items-baseline gap-2 text-brand-accent">
                    <span className="text-sm font-bold opacity-60">ETB</span>
                    <span className="text-4xl font-bold mono-value tracking-tighter">{fmt(data.totalGross)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-10">
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Payable</p>
                      <p className="text-lg font-bold text-slate-900 mono-value">ETB {fmt(data.totalNet)}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Taxation</p>
                      <p className="text-lg font-bold text-slate-900 mono-value">ETB {fmt(data.totalTax)}</p>
                   </div>
                </div>
              </div>

              {/* Right Column: Allocation */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <PieChart className="w-3.5 h-3.5 text-brand-primary" />
                  Cost Allocation
                </h3>
                
                <div className="space-y-5">
                  {[
                    { label: "Net Salaries", value: data.totalNet, total: data.totalGross, color: "bg-brand-primary" },
                    { label: "Income Tax", value: data.totalTax, total: data.totalGross, color: "bg-brand-accent" },
                    { label: "Pension Fund", value: data.totalPension, total: data.totalGross, color: "bg-amber-400" },
                  ].map((item, i) => {
                    const percentage = (item.value / item.total) * 100;
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                          <span className="text-slate-500 tracking-wider">{item.label}</span>
                          <span className="text-slate-900">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className={cn("h-full rounded-full", item.color)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {onViewStats && (
              <button
                onClick={onViewStats}
                className="w-full py-3 px-6 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-white hover:border-brand-primary/30 transition-all flex items-center justify-center gap-2 group"
              >
                <Users className="w-4 h-4 text-slate-400 group-hover:text-brand-primary" />
                View Employee Details
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-all" />
              </button>
            )}

            {/* Footer */}
            <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                     <BadgeCheck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-slate-900 leading-none">
                      {fmtInt(data.employeeCount)} Employees Verified
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Working Days: {(data as any).monthlyWorkdays ?? "—"}
                    </p>
                  </div>
                </div>

                {isApprover && approvalStatus === "PENDING" ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowRejectForm(!showRejectForm)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                    >
                      Return for Changes
                    </button>
                    <button onClick={onApprove} className="btn-primary px-8 active:scale-95">
                      Approve
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : approvalStatus === "NONE" && onSubmit ? (
                  <button
                    onClick={onSubmit}
                    disabled={submitting}
                    className={cn(
                      "inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl border-2 border-brand-800/30",
                      submitting
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                        : "bg-brand-primary text-white hover:bg-brand-dark shadow-brand-900/20",
                    )}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {submitting ? "Submitting..." : "Authorize Run"}
                  </button>
                ) : approvalStatus === "APPROVED" && (
                  <div className="flex items-center gap-2 text-brand-primary">
                     <BadgeCheck className="w-5 h-5" />
                     <span className="text-[10px] font-bold uppercase tracking-widest">Approved</span>
                  </div>
                )}
              </div>

              {showRejectForm && (
                <div className="mt-6 p-6 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-4">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for return..."
                    className="w-full h-24 p-4 rounded-xl border border-rose-200 bg-white text-sm focus-ring outline-hidden transition-all"
                    autoFocus
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => { onReject(rejectReason); setRejectReason(""); setShowRejectForm(false); }}
                      disabled={!rejectReason.trim()}
                      className="px-6 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-all disabled:opacity-50 border-2 border-rose-600/30"
                    >
                      Confirm Return
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
