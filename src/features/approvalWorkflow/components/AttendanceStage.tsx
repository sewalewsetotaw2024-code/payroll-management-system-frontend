import React, { useState } from "react";
import { 
  FileSpreadsheet, 
  Clock, 
  User, 
  Users,
  RefreshCw, 
  BadgeCheck, 
  Loader2, 
  ChevronRight,
  AlertCircle,
  Send
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { ActionButton } from "./ActionButton";
import type { AttendanceImportSummary } from "../types/approvalWorkflow.types";

interface AttendanceStageProps {
  data: AttendanceImportSummary | null;
  loading: boolean;
  approvalStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  approvalsSummary: { label: string; status: "done" | "todo" }[];
  isApprover: boolean;
  onRefresh: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onSubmit?: () => void;
  submitting?: boolean;
  onViewStats?: () => void;
}

export const AttendanceStage: React.FC<AttendanceStageProps> = ({
  data,
  loading,
  approvalStatus,
  approvalsSummary,
  isApprover,
  onRefresh,
  onApprove,
  onReject,
  onSubmit,
  submitting,
  onViewStats,
}) => {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const fmtInt = (n: number) => n.toLocaleString();
  const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

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
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
              Attendance Verification
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
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">• Stage 1</span>
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

      <div className="p-8 space-y-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
            <p className="text-sm font-bold text-slate-400">Loading attendance data...</p>
          </div>
        ) : !data ? (
          <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
             <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-600">No Import Found</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">Attendance data has not been uploaded for this period yet.</p>
          </div>
        ) : (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { label: "File Name", value: data.fileName, icon: FileSpreadsheet },
                { label: "Imported", value: fmtDateTime(data.importedAt), icon: Clock },
                { label: "Employees", value: fmtInt(data.totalEmployees), icon: User, highlight: true },
                { label: "Records", value: fmtInt(data.totalRecords), icon: BadgeCheck },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <stat.icon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <span className={cn(
                    "text-sm font-bold truncate",
                    stat.highlight ? "text-brand-primary" : "text-slate-900"
                  )}>
                    {stat.value}
                  </span>
                </div>
              ))}
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

            {/* Actions */}
            <div className="pt-8 border-t border-slate-100">
              {approvalStatus === "NONE" && data ? (
                <div className="flex items-center justify-between p-5 rounded-2xl bg-brand-light/30 border border-brand-primary/10">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Submission</p>
                      <p className="text-sm font-bold text-slate-900">Biometric data ready for authorization</p>
                    </div>
                  </div>
                  <button
                    onClick={onSubmit}
                    disabled={submitting}
                    className={cn(
                      "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 border-2",
                      !submitting
                        ? "bg-brand-primary text-white hover:bg-brand-dark border-brand-800/30 shadow-lg shadow-brand-900/20"
                        : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                    )}
                  >
                    {submitting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="w-3.5 h-3.5" /> Authorize Batch</>
                    )}
                  </button>
                </div>
              ) : isApprover ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Required Action</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">Authorization will lock this data and enable payroll processing.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setShowRejectForm(!showRejectForm)}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                      >
                        Return for Changes
                      </button>
                      <button 
                        onClick={onApprove}
                        className="btn-primary"
                      >
                        Approve
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {showRejectForm && (
                    <div className="p-6 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-4">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for return..."
                        className="w-full h-24 p-4 rounded-xl border border-rose-200 bg-white text-sm focus-ring outline-hidden transition-all"
                        autoFocus
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => onReject(rejectReason)}
                          disabled={!rejectReason.trim()}
                          className="px-6 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-all disabled:opacity-50 border-2 border-rose-600/30"
                        >
                          Confirm Return
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {approvalStatus === "APPROVED" ? "Verified by" : "Awaiting from"}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {approvalsSummary.find(a => a.status === (approvalStatus === "APPROVED" ? "done" : "todo"))?.label || "Designated Role"}
                      </p>
                    </div>
                  </div>
                  {approvalStatus === "PENDING" && (
                    <div className="flex items-center gap-2 text-brand-primary">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">In Review</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
