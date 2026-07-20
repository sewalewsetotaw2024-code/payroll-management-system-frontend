import React from "react";
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
  onDownloadExcel: () => void;
  onDownloadCsv: () => void;
}

export const PaymentStage: React.FC<PaymentStageProps> = ({
  data,
  loading,
  approvalStatus,
  isApprover,
  onApprove,
  onDownloadExcel,
  onDownloadCsv,
}) => {
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
                {approvalStatus}
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
             <p className="text-sm font-bold text-slate-400">Finalizing disbursement file...</p>
          </div>
        ) : !data ? (
          <div className="py-20 flex items-start gap-6">
             <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <Lock className="w-7 h-7 text-slate-300" />
             </div>
             <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-700 tracking-tight">Stage Locked</h3>
                <p className="text-sm text-slate-400 font-medium max-w-sm leading-relaxed">Disbursement controls are restricted until the payroll calculation is authorized in Stage 2.</p>
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
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Recipients</p>
                    <p className="text-sm font-bold">{data.employeeCount} Staff</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Status</p>
                    <p className="text-sm font-bold">Active Run</p>
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
                        <p className="text-sm font-bold text-slate-900 leading-tight">Payment Authorized</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Disbursement files are generated and ready.</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={onDownloadExcel}
                        className="flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-primary hover:bg-brand-light/20 transition-all text-slate-600 font-bold text-xs"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Excel Format
                      </button>
                      <button 
                        onClick={onDownloadCsv}
                        className="flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-primary hover:bg-brand-light/20 transition-all text-slate-600 font-bold text-xs"
                      >
                        <FileDown className="w-4 h-4 text-slate-400" />
                        CSV Format
                      </button>
                   </div>
                </div>
              ) : isApprover && approvalStatus === "PENDING" ? (
                <button 
                  onClick={onApprove}
                  className="w-full py-5 rounded-2xl bg-brand-primary text-white font-bold text-lg shadow-lg shadow-brand-500/20 flex items-center justify-center gap-3 hover:bg-brand-accent transition-all active:scale-95 border-2 border-brand-800/30"
                >
                  <Send className="w-6 h-6" />
                  Final Disbursement
                </button>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 border-dashed text-center">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Awaiting Stage 2 Completion
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
