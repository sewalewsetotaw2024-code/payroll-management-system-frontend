import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Banknote, 
  Send, 
  FileDown, 
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  Loader2,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import type { PayrollRunSummary } from "../types/approvalWorkflow.types";

interface PaymentStageProps {
  data: PayrollRunSummary | null;
  loading: boolean;
  approvalStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  isApprover: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onSubmit?: () => void;
  submitting?: boolean;
  onDownloadExcel: () => void;
  onDownloadCsv: () => void;
}

export const PaymentStage: React.FC<PaymentStageProps> = ({
  data,
  loading,
  approvalStatus,
  isApprover,
  onApprove,
  onReject,
  onSubmit,
  submitting = false,
  onDownloadExcel,
  onDownloadCsv,
}) => {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
              Payment Authorization
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                approvalStatus === "APPROVED" ? "bg-brand-primary text-white border-brand-primary" :
                approvalStatus === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
                "bg-slate-100 text-slate-500 border-slate-200"
              )}>
                {statusLabel(approvalStatus)}
              </span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">• Final Stage</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-12 space-y-12">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-5">
             <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
              <p className="text-sm font-bold text-slate-400">Loading payment data...</p>
          </div>
        ) : !data ? (
          <div className="py-20 flex items-start gap-6">
             <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <Lock className="w-7 h-7 text-slate-300" />
             </div>
             <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-700 tracking-tight">Awaiting Payroll Approval</h3>
                <p className="text-sm text-slate-400 font-medium max-w-sm leading-relaxed">Payment authorization will be available once the payroll run is approved in Stage 2.</p>
             </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-md p-10 rounded-3xl bg-brand-accent text-white shadow-xl overflow-hidden ticket-edge">
              <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5 pointer-events-none" />
              
              <div className="relative z-10 space-y-2 text-center">
                <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">Total Net Payable</span>
                <div className="flex items-baseline justify-center gap-3">
                  <span className="text-xl font-bold opacity-40">ETB</span>
                  <span className="text-5xl font-bold mono-value tracking-tighter">{fmt(data.totalNet)}</span>
                </div>
                
                <div className="pt-8 mt-8 border-t border-white/10 grid grid-cols-2 gap-4 text-left">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Employees</p>
                    <p className="text-sm font-bold">{data.employeeCount} Staff</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Status</p>
                    <p className="text-sm font-bold">Ready</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-md mt-10">
              {approvalStatus === "APPROVED" ? (
                <div className="space-y-6">
                   <div className="p-6 rounded-2xl bg-brand-light/50 border border-brand-primary/10 flex items-center gap-5 text-left">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-brand-primary shadow-sm">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">Payment Approved</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Disbursement files are ready for download.</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={onDownloadExcel}
                        className="flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-primary hover:bg-brand-light/20 transition-all text-slate-600 font-bold text-xs"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Download Excel
                      </button>
                      <button 
                        onClick={onDownloadCsv}
                        className="flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-primary hover:bg-brand-light/20 transition-all text-slate-600 font-bold text-xs"
                      >
                        <FileDown className="w-4 h-4 text-slate-400" />
                        Download CSV
                      </button>
                   </div>
                </div>
              ) : isApprover && approvalStatus === "PENDING" ? (
                <div className="space-y-4">
                  <button 
                    onClick={onApprove}
                    className="w-full py-5 rounded-2xl bg-brand-primary text-white font-bold text-lg shadow-lg shadow-brand-500/20 flex items-center justify-center gap-3 hover:bg-brand-accent transition-all active:scale-95 border-2 border-brand-800/30"
                  >
                    <Send className="w-6 h-6" />
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectForm(!showRejectForm)}
                    className="w-full py-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all border border-rose-200"
                  >
                    Return for Changes
                  </button>
                </div>
              ) : approvalStatus === "NONE" && onSubmit ? (
                <button
                  onClick={onSubmit}
                  disabled={submitting}
                  className={cn(
                    "w-full py-5 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 border-2 border-brand-800/30",
                    submitting
                      ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none border-slate-200"
                      : "bg-brand-primary text-white hover:bg-brand-accent shadow-brand-500/20",
                  )}
                >
                  {submitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Send className="w-6 h-6" />
                  )}
                  {submitting ? "Submitting..." : "Authorize Payment"}
                </button>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 border-dashed text-center">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Awaiting Payroll Approval
                  </p>
                </div>
              )}

              {showRejectForm && (
                <div className="mt-6 p-6 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-4">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for return..."
                    className="w-full h-24 p-4 rounded-xl border border-rose-200 bg-white text-sm focus-ring outline-hidden transition-all"
                    autoFocus
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      Cancel
                    </button>
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
          </div>
        )}
      </div>
    </div>
  );
};
