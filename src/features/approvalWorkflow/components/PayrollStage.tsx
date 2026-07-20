import React from "react";
import { motion } from "motion/react";
import { 
  Calculator, 
  TrendingUp, 
  PieChart, 
  Loader2, 
  ChevronRight,
  RefreshCw,
  BadgeCheck
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
  onViewStats?: () => void;
}

export const PayrollStage: React.FC<PayrollStageProps> = ({
  data,
  loading,
  approvalStatus,
  isApprover,
  onRefresh,
  onApprove,
  onViewStats,
}) => {
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (n: number) => n.toLocaleString();

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
                {approvalStatus}
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
             <p className="text-sm font-bold text-slate-400">Processing calculations...</p>
          </div>
        ) : !data ? (
          <div className="text-center py-24 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
             <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-4" />
             <p className="text-sm font-bold text-slate-600">Pending Calculation</p>
             <p className="text-xs text-slate-400 mt-2 font-medium">Payroll results will appear here once Stage 1 is verified.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Left Column: Key Totals */}
              <div className="space-y-10">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Gross Expenditure</span>
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
                View Individual Employee Stats
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-all" />
              </button>
            )}

            {/* Footer */}
            <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                   <BadgeCheck className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-slate-900 leading-none">
                    Verified for {fmtInt(data.employeeCount)} Employees
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Confirmed Working Days: {data.monthlyWorkdays}
                  </p>
                </div>
              </div>

              {isApprover && approvalStatus === "PENDING" ? (
                <button onClick={onApprove} className="btn-primary px-8 active:scale-95">
                  Confirm Totals
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : approvalStatus === "APPROVED" && (
                <div className="flex items-center gap-2 text-brand-primary">
                   <BadgeCheck className="w-5 h-5" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Calculations Confirmed</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
