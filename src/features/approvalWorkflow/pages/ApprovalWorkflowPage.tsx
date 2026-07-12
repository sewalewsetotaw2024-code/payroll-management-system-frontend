import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { notificationActions } from "../../notifications/store/notificationSlice";
import {
  CheckCircle2,
  Lock,
  Unlock,
  Loader2,
  RefreshCw,
  ArrowRight,
  FileSpreadsheet,
  FileDown,
  Calculator,
  ShieldCheck,
  AlertCircle,
  Play,
  Send,
  RotateCcw,
  CircleDot,
  Ban,
  BadgeCheck,
  Banknote,
  X,
  Clock,
  History,
  User,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  Hourglass,
  CalendarDays,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { StatCardProps } from "../../../types/ui.types";
import { toast } from "../../../components/ui/Toast";
import { attendanceApi } from "../../attendance/api/attendanceApi";
import { payrollRunApi } from "../../payrollProcessing/api/payrollProcessingApi";
import { payrollPeriodApi } from "../../configuration/api/configurationApi";
import {
  fetchAttendanceImportSummary,
  fetchPayrollRunSummary,
  computePipelineFlags,
  requestApproval as apiRequestApproval,
  approveRequest as apiApproveRequest,
  rejectRequest as apiRejectRequest,
  fetchApprovalStatus,
  fetchApprovalWorkflow,
  fetchWorkflowForCompany,
  fetchRolePermissions,
  fetchRoleLabels,
  fetchRoles,
  type ApprovalWorkflowConfig,
} from "../api/approvalWorkflowApi";
import type {
  PipelineStageStatus,
  AttendanceImportSummary,
  PayrollRunSummary,
  PipelineFlag,
  UserRole,
  RolePermissions,
  ApprovalWorkflowStep,
} from "../types/approvalWorkflow.types";
import { downloadPaymentExcel, downloadPaymentCsv } from "../api/paymentExportApi";
import {
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_LABELS as FALLBACK_ROLE_LABELS,
} from "../types/approvalWorkflow.types";

// ── Helpers ──────────────────────────────────────────────────────────────────



/** Default workflow steps used when the approval backend is unavailable.
 *  Maps role IDs to the actual database values from seedApprovalUsers.ts:
 *    HR Manager     → roleId 14
 *    Finance Manager → roleId 16 */
const DEFAULT_WORKFLOW_STEPS: ApprovalWorkflowStep[] = [
  {
    id: "default-step-attendance",
    stageType: "PAYROLL_DOCUMENT",
    stepOrder: 1,
    requiredRoleId: 14,
    requiredRole: { id: 14, name: "HR Manager" },
    alternateRoleId: null,
    isRequired: true,
  },
  {
    id: "default-step-hr-approval",
    stageType: "PAYROLL_APPROVAL",
    stepOrder: 2,
    requiredRoleId: 14,
    requiredRole: { id: 14, name: "HR Manager" },
    alternateRoleId: null,
    isRequired: true,
  },
  {
    id: "default-step-payment",
    stageType: "PAYMENT_FILE",
    stepOrder: 3,
    requiredRoleId: 16,
    requiredRole: { id: 16, name: "Finance Manager" },
    alternateRoleId: null,
    isRequired: true,
  },
];

/** Given workflow steps and existing approval actions, compute the current
 *  step that needs attention. Returns null if all required steps are done. */
function computeCurrentStep(
  steps: ApprovalWorkflowStep[],
  approvalActions: { action: string; actor?: { role?: { id?: number } } }[],
) {
  const doneRoleIds = new Set(
    approvalActions
      .filter((a) => a.action === "APPROVED")
      .map((a) => a.actor?.role?.id)
      .filter((id): id is number => id != null),
  );

  const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  for (const step of sortedSteps) {
    if (!step.isRequired) continue;
    const stepDone = doneRoleIds.has(step.requiredRoleId) ||
                     (step.alternateRoleId != null && doneRoleIds.has(step.alternateRoleId));
    if (!stepDone) return step;
  }
  return null; // all required steps approved
}

const fmt = (n: number): string =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtInt = (n: number): string => n.toLocaleString("en-US");

const fmtDateTime = (d: string): string => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const extractErrorMessage = (err: any, fallback: string) => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.response?.data?.msg ||
    err?.message ||
    fallback
  );
};

/** Format a run status into descriptive natural language. */
const describeRunStatus = (status: string): string => {
  const map: Record<string, string> = {
    DRAFT: "Payroll run not yet started",
    PROCESSING: "Calculating payroll…",
    PENDING_PAYROLL_APPROVAL: "Awaiting payroll approval",
    PENDING_PAYMENT_APPROVAL: "Awaiting payment approval",
    APPROVED: "Fully approved — ready for payment",
    DONE: "Completed and disbursed",
    REJECTED: "Returned for revision",
    CANCELLED: "Payroll run cancelled",
  };
  return map[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

/** Format an approval status into descriptive natural language. */
const describeApprovalStatus = (status: string): string => {
  const map: Record<string, string> = {
    NONE: "Not yet submitted",
    PENDING: "Under review",
    APPROVED: "Approved ✓",
    REJECTED: "Returned for changes",
  };
  return map[status] ?? status;
};

/** Return relative time string like "2 hours ago". */
const timeAgo = (dateStr: string): string => {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  subColor,
  icon: Icon,
  iconColor,
}) => (
  <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-5 shadow-sm group hover:shadow-lg hover:shadow-slate-900/5 hover:-translate-y-0.5 transition-all duration-300">
    <div className="flex items-start justify-between mb-3">
      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
        {label}
      </p>
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-2xl font-black text-slate-900 tracking-tight">
        {value}
      </p>
      {subValue && (
        <p className={cn("text-[10px] font-bold uppercase", subColor)}>
          {subValue}
        </p>
      )}
    </div>
  </div>
);

// ── Pipeline Step Indicator ──────────────────────────────────────────────────

interface StepIndicatorProps {
  stages: { id: number; label: string; status: PipelineStageStatus }[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ stages }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {stages.map((stage, i) => (
      <React.Fragment key={stage.id}>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-300",
              stage.status === "completed" &&
                "bg-emerald-100 border-emerald-400 text-emerald-600 shadow-sm shadow-emerald-200",
              stage.status === "active" &&
                "bg-blue-100 border-blue-400 text-blue-600 shadow-sm shadow-blue-200 ring-2 ring-blue-200/50",
              stage.status === "locked" &&
                "bg-slate-100 border-slate-300 text-slate-400",
            )}
          >
            {stage.status === "completed" ? (
              <CheckCircle2 className="w-4.5 h-4.5" />
            ) : stage.status === "active" ? (
              <div>
                <CircleDot className="w-4 h-4" />
              </div>
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
          </div>
          <span
            className={cn(
              "text-xs font-bold uppercase tracking-wider",
              stage.status === "completed" && "text-emerald-600",
              stage.status === "active" && "text-blue-600",
              stage.status === "locked" && "text-slate-400",
            )}
          >
            {stage.label}
          </span>
        </div>
        {i < stages.length - 1 && (
          <div>
            <ArrowRight className="w-4 h-4 mx-1.5 flex-shrink-0 text-slate-300" />
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
);

// ── Flag List ────────────────────────────────────────────────────────────────

const FlagList: React.FC<{ flags: PipelineFlag[] }> = ({ flags }) => {
  if (flags.length === 0) return null;
  return (
    <div
      className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 shadow-lg shadow-slate-900/5 space-y-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-amber-500" />
        <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
          Items Requiring Attention
        </h4>
      </div>
      {flags.map((flag, i) => (
        <div
          key={i}
          className={cn(
            "flex items-start gap-3 p-3 rounded-xl text-sm shadow-sm",
            flag.type === "error" && "bg-gradient-to-br from-rose-50 to-rose-50/30 border border-rose-200/50",
            flag.type === "warning" && "bg-gradient-to-br from-amber-50 to-amber-50/30 border border-amber-200/50",
            flag.type === "info" && "bg-gradient-to-br from-blue-50 to-blue-50/30 border border-blue-200/50",
          )}
        >
          <AlertCircle
            className={cn(
              "w-4 h-4 mt-0.5 flex-shrink-0",
              flag.type === "error" && "text-rose-500",
              flag.type === "warning" && "text-amber-500",
              flag.type === "info" && "text-blue-500",
            )}
          />
          <span
            className={cn(
              "font-medium text-xs",
              flag.type === "error" && "text-rose-700",
              flag.type === "warning" && "text-amber-700",
              flag.type === "info" && "text-blue-700",
            )}
          >
            {flag.message}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Action Button ────────────────────────────────────────────────────────────

interface ActionButtonProps {
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  variant?: "primary" | "danger" | "secondary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  hasPermission?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  icon: Icon,
  onClick,
  variant = "primary",
  disabled = false,
  loading = false,
  className,
  hasPermission = true,
}) => {
  const handleClick = () => {
    if (!hasPermission) {
      toast.error("You are not eligible to perform this action");
      return;
    }
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        "px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed",
        variant === "primary" &&
          "text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-900/15",
        variant === "danger" &&
          "text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 shadow-lg shadow-rose-900/15",
        variant === "secondary" &&
          "text-slate-600 border border-slate-200/60 hover:bg-slate-50 bg-white/80 backdrop-blur-sm",
        variant === "ghost" &&
          "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      {label}
    </button>
  );
};

// ── Stage 1: Attendance Import Card ─────────────────────────────────────────

interface Stage1Props {
  data: AttendanceImportSummary | null;
  loading: boolean;
  permissions: RolePermissions;
  importId: string | null;
  approvalStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  approvalsSummary: { label: string; status: "done" | "todo" }[];
  /** The user's role ID from auth — used to match against the workflow step. */
  userRoleId?: number | null;
  /** The current PAYROLL_DOCUMENT workflow step requiring approval. */
  stage1ApprovalStep: { requiredRoleId: number; requiredRoleName: string } | null;
  onRefresh: () => void;
  onActivate: () => void;
  onCalculateOt: () => void;
  onCalculateSummary: () => void;
  onApproveImport: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  /** Open modal showing per-employee attendance stats. */
  onViewEmployeeStats?: () => void;
}

const Stage1Card: React.FC<Stage1Props> = ({
  data,
  loading,
  permissions,
  approvalStatus,
  approvalsSummary,
  userRoleId,
  stage1ApprovalStep,
  onRefresh,
  onActivate,
  onCalculateOt,
  onCalculateSummary,
  onApproveImport,
  onApprove,
  onReject,
  onViewEmployeeStats,
}) => {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const isStage1Approver =
    approvalStatus === "PENDING" &&
    !!stage1ApprovalStep &&
    stage1ApprovalStep.requiredRoleId === userRoleId;

  // User is a potential approver for stage 1 regardless of current status
  const isPotentialApprover = !!stage1ApprovalStep && stage1ApprovalStep.requiredRoleId === userRoleId;

  return (
  <div
    className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-lg shadow-slate-900/5 overflow-hidden hover:shadow-xl hover:shadow-slate-900/10 transition-all duration-300"
  >
    <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50/30 to-transparent">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center shadow-sm">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 tracking-tight">
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest block -mb-0.5">
                Stage 1
              </span>
              <span className="text-sm">Attendance Import</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
              Upload and verify employee attendance records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
              approvalStatus === "APPROVED" &&
                "bg-emerald-100 text-emerald-700 border border-emerald-200",
              approvalStatus === "PENDING" &&
                "bg-amber-100 text-amber-700 border border-amber-200",
              approvalStatus === "REJECTED" &&
                "bg-rose-100 text-rose-700 border border-rose-200",
              approvalStatus === "NONE" &&
                "bg-slate-100 text-slate-600 border border-slate-200",
            )}
          >
            {describeApprovalStatus(approvalStatus)}
          </span>

          <ActionButton
            label="Refresh"
            icon={RefreshCw}
            variant="ghost"
            onClick={onRefresh}
            loading={loading}
          />
        </div>
      </div>
    </div>

    <div className="p-6">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div>
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-400">Loading attendance data…</p>
        </div>
      ) : !data ? (
        <div
          className="text-center py-12 text-slate-400"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-500">
            No attendance import found
          </p>
          <p className="text-xs text-slate-300 mt-1.5 max-w-xs mx-auto leading-relaxed">
            No biometric data has been uploaded for this pay period yet. Upload an Excel file from the attendance module to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gradient-to-br from-slate-50 to-transparent rounded-xl border border-slate-100/50">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                Source File
              </p>
              <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                {data.fileName}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-slate-50 to-transparent rounded-xl border border-slate-100/50">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                Imported
              </p>
              <p className="text-sm font-bold text-slate-800">
                {fmtDateTime(data.importedAt)}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-slate-50 to-transparent rounded-xl border border-slate-100/50">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                Employees
              </p>
              <p className="text-sm font-bold text-slate-800">
                <span className="text-emerald-600">{fmtInt(data.totalEmployees)}</span> total
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-slate-50 to-transparent rounded-xl border border-slate-100/50">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                Records
              </p>
              <p className="text-sm font-bold text-slate-800">
                {fmtInt(data.totalRecords)} entries
              </p>
            </div>
          </div>

          {/* Approval Progress */}
          {approvalStatus !== "NONE" && approvalsSummary.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-amber-50/50 to-transparent border border-amber-100/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <BadgeCheck className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">
                  Approval Progress
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {approvalsSummary.map((a, idx) => (
                  <span
                    key={a.label}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                      a.status === "done"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-white text-slate-500 border border-slate-200",
                    )}
                  >
                    {a.status === "done" ? (
                      <CheckCircle2 className="w-3 h-3 inline mr-1 -mt-0.5" />
                    ) : (
                      <Hourglass className="w-3 h-3 inline mr-1 -mt-0.5" />
                    )}
                    {a.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Regular Hours", value: fmt(data.regularHours), icon: Calculator, color: "text-emerald-600" },
              { label: "Absent Days", value: fmtInt(data.absentDays), icon: X, color: "text-rose-500" },
              { label: "Paid Leave Days", value: fmt(data.paidLeaveDays), icon: CalendarDays, color: "text-blue-500" },
              { label: "Actual Days", value: fmt(data.actualDays), icon: BadgeCheck, color: "text-indigo-500" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-3 bg-gradient-to-br from-slate-50 to-transparent rounded-xl border border-slate-100/50 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    {stat.label}
                  </p>
                  <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                </div>
                <p className="text-lg font-black text-slate-800">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* View Individual Employee Stats */}
          {onViewEmployeeStats && (
            <div className="pt-2">
              <button
                onClick={onViewEmployeeStats}
                className="w-full py-2.5 px-4 text-xs font-bold text-emerald-600 bg-gradient-to-r from-emerald-50 to-transparent border border-emerald-200/50 rounded-xl hover:from-emerald-100 hover:to-emerald-50/50 transition-all flex items-center justify-center gap-2 group"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                View Individual Employee Stats
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* Preparation / Submission actions (HR Officer / submitter only — not shown to the approver) */}
          {!isPotentialApprover && (
            <div className="flex items-center gap-3 pt-5 border-t border-slate-100 flex-wrap">
              <ActionButton
                label={data.isActive ? "Import Active ✓" : "Activate Import"}
                icon={data.isActive ? CheckCircle2 : Unlock}
                variant={data.isActive ? "ghost" : "primary"}
                disabled={data.isActive || !!data.processedAt}
                hasPermission={permissions.canActivateImport}
                onClick={onActivate}
              />
              <ActionButton
                label={data.otCalculated ? "OT Calculated ✓" : "Calculate Overtime"}
                icon={data.otCalculated ? CheckCircle2 : Calculator}
                variant={data.otCalculated ? "ghost" : "secondary"}
                disabled={data.otCalculated}
                hasPermission={permissions.canCalculateOt}
                onClick={onCalculateOt}
              />
              <ActionButton
                label={
                  data.summaryCalculated ? "Summary Ready ✓" : "Calculate Summary"
                }
                icon={data.summaryCalculated ? CheckCircle2 : Calculator}
                variant={data.summaryCalculated ? "ghost" : "secondary"}
                disabled={data.summaryCalculated}
                hasPermission={permissions.canCalculateSummary}
                onClick={onCalculateSummary}
              />
              <ActionButton
                label={
                  approvalStatus === "NONE" || approvalStatus === "REJECTED"
                    ? "Submit for Approval"
                    : "View Approval"
                }
                icon={BadgeCheck}
                variant="primary"
                disabled={
                  !data.otCalculated ||
                  !data.summaryCalculated ||
                  (approvalStatus !== "NONE" && approvalStatus !== "REJECTED")
                }
                hasPermission={permissions.canApproveImport}
                onClick={onApproveImport}
              />
            </div>
          )}

          {/* Stage 1 Approve / Reject (shown when status is PENDING and user is the approver) */}
          {approvalStatus === "PENDING" && (
            <div className="flex items-center gap-3 pt-5 border-t border-slate-100 flex-wrap">
              {isStage1Approver ? (
                <>
                  <ActionButton
                    label="Approve Attendance ✓"
                    icon={ThumbsUp}
                    variant="primary"
                    hasPermission={permissions.canApproveAttendance}
                    onClick={onApprove}
                  />
                  {showRejectForm ? (
                    <div
                      className="flex items-center gap-2 flex-wrap"
                    >
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Why is this being returned? (required)"
                        className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl w-56 focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none"
                        autoFocus
                      />
                      <ActionButton
                        label="Return for Changes"
                        icon={RotateCcw}
                        variant="danger"
                        disabled={!rejectReason.trim()}
                        onClick={() => {
                          onReject(rejectReason);
                          setRejectReason("");
                          setShowRejectForm(false);
                        }}
                      />
                      <ActionButton
                        label="Cancel"
                        icon={X}
                        variant="ghost"
                        onClick={() => {
                          setRejectReason("");
                          setShowRejectForm(false);
                        }}
                      />
                    </div>
                  ) : (
                    <ActionButton
                      label="Return for Changes"
                      icon={RotateCcw}
                      variant="danger"
                      onClick={() => setShowRejectForm(true)}
                      hasPermission={permissions.canRejectAttendance}
                    />
                  )}
                </>
              ) : stage1ApprovalStep ? (
                <div
                  className="p-4 bg-gradient-to-br from-amber-50 to-amber-50/30 border border-amber-200/50 rounded-xl flex items-center gap-3 w-full"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Hourglass className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-700">
                      Awaiting review
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      <span className="font-semibold underline decoration-dotted">
                        {stage1ApprovalStep.requiredRoleName}
                      </span>{" "}
                      needs to approve the attendance import before payroll can proceed
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {data.importErrors.length > 0 && (
            <div
              className="p-4 bg-gradient-to-br from-rose-50 to-transparent border border-rose-200/50 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <p className="text-xs font-bold text-rose-700 uppercase">
                  Import Errors ({data.importErrors.length})
                </p>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.importErrors.slice(0, 10).map((err, i) => (
                  <p key={i} className="text-xs text-rose-600 font-medium">
                    Row {err.row}: {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
  );
};

// ── Stage 2 & 3 cards remain as-is (kept minimal to avoid regressions) ───────

interface Stage2Props {
  data: PayrollRunSummary | null;
  loading: boolean;
  permissions: RolePermissions;
  stage1Complete: boolean;
  periodId: string | null;
  currentRole: string;
  currentApprovalStep: {
    stageType: string;
    requiredRoleId: number;
    requiredRoleName: string;
    isRequired: boolean;
    requestId: string | null;
    doneRoleNames: string[];
    alternateRoleId?: number | null;
    alternateRoleName?: string;
  } | null;
  /** The actual AppUser.roleId from the backend auth — used for dynamic approver matching. */
  userRoleId?: number | null;
  onRefresh: () => void;
  onRunPayroll: () => void;
  onSubmitForApproval: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  /** Navigate to the employee-level payroll details page. */
  onViewEmployeeStats?: () => void;
}

const Stage2Card: React.FC<Stage2Props> = ({
  data,
  loading,
  permissions,
  stage1Complete,
  currentRole,
  currentApprovalStep,
  userRoleId,
  onRefresh,
  onRunPayroll,
  onSubmitForApproval,
  onApprove,
  onReject,
  onViewEmployeeStats,
}) => {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Determine if the current user's role matches the current approval step
  // Uses the actual AppUser.roleId from auth — no hardcoded ROLE_TO_ID.
  const isCurrentApprover =
    currentApprovalStep?.stageType === "PAYROLL_APPROVAL" &&
    (currentApprovalStep?.requiredRoleId === userRoleId ||
     currentApprovalStep?.alternateRoleId === userRoleId);

  const isWaitingForApproval =
    currentApprovalStep?.stageType === "PAYROLL_APPROVAL" && !isCurrentApprover;

  // Derive approval status (same pattern as Stage 1's approvalStatus prop)
  // null(currentApprovalStep) = all approved/terminal, requestId set = PENDING, requestId null = NONE/REJECTED
  const stage2ApprovalStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED" =
    data?.status === "APPROVED" || data?.status === "DONE" ? "APPROVED"
    : !currentApprovalStep ? "APPROVED"
    : currentApprovalStep.requestId ? "PENDING"
    : data?.status === "REJECTED" ? "REJECTED"
    : "NONE";

  return (
  <div
    className={cn(
      "bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-lg shadow-slate-900/5 overflow-hidden transition-all duration-300",
      !stage1Complete && "opacity-50 pointer-events-none",
    )}
  >
    <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/30 to-transparent">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm">
            <Calculator className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 tracking-tight">
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest block -mb-0.5">
                Stage 2
              </span>
              <span className="text-sm">Payroll Run</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
              Payroll Officer runs and reviews salary calculations
            </p>
          </div>
        </div>
        <ActionButton
          label="Refresh"
          icon={RefreshCw}
          variant="ghost"
          onClick={onRefresh}
          loading={loading}
        />
      </div>
    </div>

    <div className="p-6">
      {!stage1Complete ? (
        <div
          className="text-center py-12 text-slate-400"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-500">Stage 1 must be completed first</p>
          <p className="text-xs text-slate-300 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Activate the attendance import, calculate overtime, and generate the summary before you can run payroll for this period.
          </p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div>
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-400">Loading payroll data…</p>
        </div>
      ) : !data ? (
        <div
          className="text-center py-12 text-slate-400"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-500">No payroll run yet</p>
          <p className="text-xs text-slate-300 mt-1.5 max-w-xs mx-auto leading-relaxed">
            No payroll calculations have been started for this period. Click below to process employee salaries, taxes, and deductions.
          </p>
          <div className="mt-5">
            <ActionButton
              label="Run Payroll"
              icon={Play}
              variant="primary"
              onClick={onRunPayroll}
              hasPermission={permissions.canRunPayroll}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Total Gross Salary", value: `ETB ${fmt(data.totalGross)}`, color: "text-slate-800" },
              { label: "Total Net Pay", value: `ETB ${fmt(data.totalNet)}`, color: "text-emerald-600" },
              { label: "Total Income Tax", value: `ETB ${fmt(data.totalTax)}`, color: "text-rose-600" },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3 bg-gradient-to-br from-slate-50 to-transparent rounded-xl border border-slate-100/50 transition-all"
              >
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                  {item.label}
                </p>
                <p className={cn("text-lg font-black", item.color)}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* View Individual Employee Stats */}
          {onViewEmployeeStats && (
            <div className="pt-2">
              <button
                onClick={onViewEmployeeStats}
                className="w-full py-2.5 px-4 text-xs font-bold text-blue-600 bg-gradient-to-r from-blue-50 to-transparent border border-blue-200/50 rounded-xl hover:from-blue-100 hover:to-blue-50/50 transition-all flex items-center justify-center gap-2 group"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                View Individual Employee Stats
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* Submit for Approval (Payroll Officer action) — stale once submitted */}
          <div className="flex items-center gap-3 pt-5 border-t border-slate-100 flex-wrap">
            <ActionButton
              label={
                stage2ApprovalStatus === "NONE" || stage2ApprovalStatus === "REJECTED"
                  ? "Submit for Approval"
                  : "View Approval"
              }
              icon={BadgeCheck}
              variant="primary"
              disabled={stage2ApprovalStatus !== "NONE" && stage2ApprovalStatus !== "REJECTED"}
              onClick={onSubmitForApproval}
              hasPermission={permissions.canSubmitForApproval}
            />
            {stage2ApprovalStatus !== "NONE" && (
              <span className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                stage2ApprovalStatus === "APPROVED" && "bg-emerald-100 text-emerald-700 border-emerald-200",
                stage2ApprovalStatus === "PENDING" && "bg-amber-100 text-amber-700 border-amber-200",
                stage2ApprovalStatus === "REJECTED" && "bg-rose-100 text-rose-700 border-rose-200",
              )}>
                {describeApprovalStatus(stage2ApprovalStatus)}
              </span>
            )}
          </div>

          {/* Dynamic Approval UI (PAYROLL_APPROVAL steps) */}
          {currentApprovalStep?.stageType === "PAYROLL_APPROVAL" && (
            <>
              {isCurrentApprover ? (
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <ActionButton
                    label="Approve Payroll ✓"
                    icon={ThumbsUp}
                    variant="primary"
                    onClick={onApprove}
                    hasPermission={permissions.canApproveRun}
                  />
                  {showRejectForm ? (
                    <div
                      className="flex items-center gap-2 flex-wrap"
                    >
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Why is this being returned? (required)"
                        className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl w-56 focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none"
                        autoFocus
                      />
                      <ActionButton
                        label="Return for Changes"
                        icon={RotateCcw}
                        variant="danger"
                        disabled={!rejectReason.trim()}
                        onClick={() => {
                          onReject(rejectReason);
                          setRejectReason("");
                          setShowRejectForm(false);
                        }}
                      />
                      <ActionButton
                        label="Cancel"
                        icon={X}
                        variant="ghost"
                        onClick={() => {
                          setRejectReason("");
                          setShowRejectForm(false);
                        }}
                      />
                    </div>
                  ) : (
                    <ActionButton
                      label="Return for Changes"
                      icon={RotateCcw}
                      variant="danger"
                      onClick={() => setShowRejectForm(true)}
                      hasPermission={permissions.canRejectRun}
                    />
                  )}
                </div>
              ) : isWaitingForApproval ? (
                <div
                  className="p-4 bg-gradient-to-br from-amber-50 to-amber-50/30 border border-amber-200/50 rounded-xl flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Hourglass className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-700">
                      Awaiting approval
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      <span className="font-semibold underline decoration-dotted">
                        {currentApprovalStep.alternateRoleName
                          ? `${currentApprovalStep.requiredRoleName} or ${currentApprovalStep.alternateRoleName}`
                          : currentApprovalStep.requiredRoleName}
                      </span>{" "}
                      needs to review and approve this payroll run
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  </div>
);
};

interface Stage3Props {
  data: PayrollRunSummary | null;
  loading: boolean;
  permissions: RolePermissions;
  stage2Complete: boolean;
  currentRole: string;
  currentApprovalStep: {
    stageType: string;
    requiredRoleId: number;
    requiredRoleName: string;
    isRequired: boolean;
    requestId: string | null;
    doneRoleNames: string[];
    alternateRoleId?: number | null;
    alternateRoleName?: string;
  } | null;
  /** The actual AppUser.roleId from the backend auth — used for dynamic approver matching. */
  userRoleId?: number | null;
  onRefresh: () => void;
  onApproveRun: () => void;
  onRejectRun: (reason: string) => void;
  onSubmitPaymentFile: () => void;
  payrollRunId?: string;
}

const Stage3Card: React.FC<Stage3Props> = ({
  data,
  loading,
  permissions,
  stage2Complete,
  currentRole,
  currentApprovalStep,
  userRoleId,
  onRefresh,
  onApproveRun,
  onRejectRun,
  onSubmitPaymentFile,
  payrollRunId,
}) => {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Determine if current user matches the PAYMENT_FILE approval step
  // Uses the actual AppUser.roleId from auth — no hardcoded ROLE_TO_ID.
  const isCurrentPaymentApprover =
    currentApprovalStep?.stageType === "PAYMENT_FILE" &&
    currentApprovalStep?.requiredRoleId === userRoleId;

  return (
    <div
      className={cn(
        "bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-lg shadow-slate-900/5 overflow-hidden transition-all duration-300",
        !stage2Complete && "opacity-50 pointer-events-none",
      )}
    >
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-violet-50/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 flex items-center justify-center shadow-sm">
              <Banknote className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 tracking-tight">
                <span className="text-[10px] text-violet-500 font-bold uppercase tracking-widest block -mb-0.5">
                  Stage 3
                </span>
                <span className="text-sm">Payment Approval</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                Finance Officer submits and approves payments
              </p>
            </div>
          </div>
          <ActionButton
            label="Refresh"
            icon={RefreshCw}
            variant="ghost"
            onClick={onRefresh}
            loading={loading}
          />
        </div>
      </div>

      <div className="p-6">
        {!stage2Complete ? (
          <div
            className="text-center py-12 text-slate-400"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500">Stage 2 must be completed first</p>
            <p className="text-xs text-slate-300 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Run payroll and submit it for approval before you can process the payment file.
            </p>
          </div>
        ) : !data ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm font-medium">Select a payroll run to proceed</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gradient-to-br from-slate-50 to-transparent rounded-xl border border-slate-100/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <Banknote className="w-3 h-3" /> Total Net Payable
                </p>
                <p className="text-xl font-black text-emerald-600">
                  ETB {fmt(data.totalNet)}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-slate-50 to-transparent rounded-xl border border-slate-100/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  Income Tax Withheld
                </p>
                <p className="text-sm font-black text-rose-600">
                  ETB {fmt(data.totalTax)}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-slate-50 to-transparent rounded-xl border border-slate-100/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  Employee Pension
                </p>
                <p className="text-sm font-black text-blue-600">
                  ETB {fmt(data.totalPension)}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-slate-50 to-transparent rounded-xl border border-slate-100/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Run Status
                </p>
                <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    data.status === "APPROVED" || data.status === "DONE" ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                  {describeRunStatus(data.status)}
                </p>
              </div>
            </div>

            {/* ── PAYMENT_FILE Actions ── */}
            {currentApprovalStep?.stageType === "PAYMENT_FILE" && (
              <>
                {/* Finance Officer (submitter): Submit Payment File button */}
                {!isCurrentPaymentApprover && (
                  <div className="flex items-center gap-3 pt-5 border-t border-slate-100 flex-wrap">
                    <ActionButton
                      label={
                        currentApprovalStep?.requestId
                          ? "Payment Submitted ✓"
                          : "Submit Payment File"
                      }
                      icon={Send}
                      variant={currentApprovalStep?.requestId ? "secondary" : "primary"}
                      disabled={!!currentApprovalStep?.requestId}
                      onClick={onSubmitPaymentFile}
                      hasPermission={permissions.canSubmitPaymentFile}
                    />
                  </div>
                )}

                {/* Finance Manager (approver): waiting message before submission */}
                {isCurrentPaymentApprover && !currentApprovalStep?.requestId && (
                  <div className="flex items-center gap-3 pt-5 border-t border-slate-100 flex-wrap">
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-50/30 border border-amber-200/50 rounded-xl flex items-center gap-3 w-full">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Hourglass className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-700">
                          Awaiting payment submission
                        </p>
                        <p className="text-[10px] text-amber-600 mt-0.5">
                          <span className="font-semibold underline decoration-dotted">
                            Finance Officer
                          </span>{" "}
                          needs to submit the payment file before you can approve it
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Finance Manager (approver): approve/reject when request is pending */}
                {currentApprovalStep?.requestId && isCurrentPaymentApprover && (
                  <div className="flex items-center gap-3 pt-5 border-t border-slate-100 flex-wrap">
                    <ActionButton
                      label="Approve Payment ✓"
                      icon={ThumbsUp}
                      variant="primary"
                      hasPermission={permissions.canApprovePayment}
                      disabled={data.status === "DONE"}
                      onClick={onApproveRun}
                    />
                    {showRejectForm ? (
                    <div
                      className="flex items-center gap-2 flex-wrap"
                      >
                        <input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Why is this being returned? (required)"
                          className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl w-56 focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none"
                          autoFocus
                        />
                        <ActionButton
                          label="Return for Changes"
                          icon={RotateCcw}
                          variant="danger"
                          disabled={!rejectReason.trim()}
                          hasPermission={permissions.canRejectPayment}
                          onClick={() => {
                            onRejectRun(rejectReason);
                            setRejectReason("");
                            setShowRejectForm(false);
                          }}
                        />
                        <ActionButton
                          label="Cancel"
                          icon={X}
                          variant="ghost"
                          onClick={() => {
                            setRejectReason("");
                            setShowRejectForm(false);
                          }}
                        />
                      </div>
                    ) : (
                      <ActionButton
                        label="Return for Changes"
                        icon={RotateCcw}
                        variant="danger"
                        onClick={() => setShowRejectForm(true)}
                        hasPermission={permissions.canRejectPayment}
                        disabled={data.status === "DONE"}
                      />
                    )}
                  </div>
                )}

                {/* Finance Officer (submitter): waiting message after submission */}
                {currentApprovalStep?.requestId && !isCurrentPaymentApprover && (
                  <div
                    className="p-4 bg-gradient-to-br from-amber-50 to-amber-50/30 border border-amber-200/50 rounded-xl flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Hourglass className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-700">
                        Awaiting final approval
                      </p>
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        <span className="font-semibold underline decoration-dotted">
                          {currentApprovalStep.requiredRoleName}
                        </span>{" "}
                        needs to approve the payment file to complete payroll
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Download buttons when all approval steps complete ── */}
            {data && !currentApprovalStep && payrollRunId && (
              <div className="flex items-center gap-3 pt-5 border-t border-slate-100 flex-wrap">
                <ActionButton
                  label="Download Excel"
                  icon={FileSpreadsheet}
                  variant="primary"
                  onClick={() => downloadPaymentExcel(payrollRunId)}
                />
                <ActionButton
                  label="Download CSV"
                  icon={FileDown}
                  variant="secondary"
                  onClick={() => downloadPaymentCsv(payrollRunId)}
                />
              </div>
            )}


          </div>
        )}
      </div>
    </div>
  );
};

// ── Approval History Timeline ─────────────────────────────────────────────────

interface ApprovalHistoryTimelineProps {
  localApprovalRequests: any[];
  resolveRoleLabel: (key: string) => string;
}

const ApprovalHistoryTimeline: React.FC<ApprovalHistoryTimelineProps> = ({
  localApprovalRequests,
  resolveRoleLabel,
}) => {
  // Flatten all requests into a sorted list of actions
  const allEvents = useMemo(() => {
    const events: {
      id: string;
      type: "submitted" | "approved" | "rejected";
      stageType: string;
      roleName: string;
      timestamp: string;
      comment?: string;
      status: string;
    }[] = [];

    for (const req of localApprovalRequests) {
      // Add the submission event
      events.push({
        id: `submit-${req.id}`,
        type: "submitted",
        stageType: req.stageType,
        roleName: resolveRoleLabel(req.requestedBy || "UNKNOWN"),
        timestamp: req.requestedAt,
        comment: undefined,
        status: req.status,
      });

      // Add each approval action
      for (const action of req.approvalActions || []) {
        events.push({
          id: action.id,
          type: action.action === "APPROVED" ? "approved" : "rejected",
          stageType: req.stageType,
          roleName: action.actor?.role?.name || resolveRoleLabel(action.actor?.role?.id) || "Unknown",
          timestamp: action.actedAt,
          comment: action.comment,
          status: action.action,
        });
      }
    }

    return events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [localApprovalRequests, resolveRoleLabel]);

  if (allEvents.length === 0) return null;

  const stageLabel = (type: string): string => {
    const labels: Record<string, string> = {
      PAYROLL_DOCUMENT: "Attendance Import",
      PAYROLL_APPROVAL: "Payroll Run",
      PAYMENT_FILE: "Payment File",
    };
    return labels[type] ?? type;
  };

  return (
    <div
      className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-lg shadow-slate-900/5 overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50/30 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center shadow-sm">
            <History className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 tracking-tight">
              <span className="text-sm">Approval History</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
              {allEvents.length} action{allEvents.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="relative">
          {/* Timeline connector line */}
          <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-200 via-slate-200 to-slate-100 rounded-full" />

          <div className="space-y-0">
            {allEvents.map((event, idx) => (
              <div
                key={event.id}
                className="relative flex items-start gap-4 pb-6 last:pb-0"
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    "relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border-2",
                    event.type === "approved" && "bg-emerald-100 border-emerald-300 text-emerald-600",
                    event.type === "rejected" && "bg-rose-100 border-rose-300 text-rose-600",
                    event.type === "submitted" && "bg-blue-100 border-blue-300 text-blue-600",
                  )}
                >
                  {event.type === "approved" ? (
                    <ThumbsUp className="w-4 h-4" />
                  ) : event.type === "rejected" ? (
                    <ThumbsDown className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-700">
                      {event.roleName}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                        event.type === "approved" && "bg-emerald-100 text-emerald-700",
                        event.type === "rejected" && "bg-rose-100 text-rose-700",
                        event.type === "submitted" && "bg-blue-100 text-blue-700",
                      )}
                    >
                      {event.type === "approved"
                        ? "Approved"
                        : event.type === "rejected"
                          ? "Returned"
                          : "Submitted"}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {timeAgo(event.timestamp)}
                    </span>
                  </div>

                  {/* Stage type description */}
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                    {event.type === "submitted"
                      ? `Submitted ${stageLabel(event.stageType)} for approval`
                      : event.type === "approved"
                        ? `Approved ${stageLabel(event.stageType)}`
                        : `Returned ${stageLabel(event.stageType)} for changes`}
                  </p>

                  {/* Rejection comment */}
                  {event.comment && (
                    <div className="mt-1.5 p-2 bg-rose-50 border border-rose-100 rounded-lg">
                      <p className="text-[10px] text-rose-600 italic">
                        "{event.comment}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────

export const ApprovalWorkflowPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();

  /** Derive the initial role from the authenticated user's backend role,
   *  using the role name as-is (converted to uppercase underscore format).
   *  Falls back to localStorage simulation (dev mode), then ADMIN. */
  const [currentRole, setCurrentRole] = useState<string>(() => {
    if (authUser?.role?.name) {
      // Convert "HR Manager" → "HR_MANAGER", "Finance Officer" → "FINANCE_OFFICER"
      return authUser.role.name.toUpperCase().replace(/\s+/g, "_");
    }
    return "ADMIN";
  });

  /* Sync role when auth state changes (login / logout / page refresh) */
  useEffect(() => {
    if (authUser?.role?.name) {
      setCurrentRole(authUser.role.name.toUpperCase().replace(/\s+/g, "_"));
    }
  }, [authUser?.role?.name]);

  const [loading, setLoading] = useState(true);
  const [stage1Loading, setStage1Loading] = useState(false);
  const [stage2Loading, setStage2Loading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);

  const [activeImports, setActiveImports] = useState<any[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [importsVersion, setImportsVersion] = useState(0); // bump to re-fetch imports
  const [stage1Data, setStage1Data] = useState<AttendanceImportSummary | null>(
    null,
  );

  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [stage2Data, setStage2Data] = useState<PayrollRunSummary | null>(null);

  const handleViewEmployeeStats = useCallback(() => {
    if (!selectedImportId) return;
    navigate(`/approval/attendance-stats?importId=${encodeURIComponent(selectedImportId)}`);
  }, [selectedImportId, navigate]);

  const handleViewPayrollEmployeeStats = useCallback(() => {
    if (!selectedPeriod?.id) return;
    navigate(`/approval/payroll-stats?periodId=${encodeURIComponent(selectedPeriod.id)}`);
  }, [selectedPeriod, navigate]);

  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
  const [workflowConfig, setWorkflowConfig] =
    useState<ApprovalWorkflowConfig | null>(null);
  const [stage1ApprovalStatus, setStage1ApprovalStatus] = useState<
    "NONE" | "PENDING" | "APPROVED" | "REJECTED"
  >("NONE");
  const [stage1ApprovalsSummary, setStage1ApprovalsSummary] = useState<
    { label: string; status: "done" | "todo" }[]
  >([]);
  /** The pending PAYROLL_DOCUMENT request ID (for approve/reject API calls). */
  const [stage1RequestId, setStage1RequestId] = useState<string | null>(null);
  /** The current PAYROLL_DOCUMENT workflow step that requires approval. */
  const [stage1ApprovalStep, setStage1ApprovalStep] = useState<{
    requiredRoleId: number;
    requiredRoleName: string;
  } | null>(null);

  // ── Local approval fallback (when /api/v1/approval is unavailable) ─────────
  // Mirrors what the backend would return so the pipeline works without a real
  // approval server. Each entry is an ApprovalRequestData-like object.
  // We keep a ref (always up-to-date for handlers) + state (triggers re-renders).
  const localApprovalRequestsRef = useRef<any[]>([]);
  const [localApprovalRequests, setLocalApprovalRequests] = useState<any[]>([]);

  const updateLocalApprovals = useCallback(
    (updater: (prev: any[]) => any[]) => {
      setLocalApprovalRequests((prev) => {
        const next = updater(prev);
        localApprovalRequestsRef.current = next;
        return next;
      });
    },
    [],
  );

  const localId = useCallback(
    () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  // ── Dynamic Approver Resolution State ──────────────────────────────────────
  // Represents which approval step is currently active and who needs to act next
  const [currentApprovalStep, setCurrentApprovalStep] = useState<{
    stageType: string;
    requiredRoleId: number;
    requiredRoleName: string;
    isRequired: boolean;
    requestId: string | null;
    doneRoleNames: string[];
    alternateRoleId?: number | null;
    alternateRoleName?: string;
  } | null>(null);

  // ── Dynamic role data (fetched from API) ──────────────────────────────────
  const [dynamicRoleLabels, setDynamicRoleLabels] =
    useState<Record<string, string> | null>(null);
  const [dynamicRolePermissions, setDynamicRolePermissions] =
    useState<Record<string, any> | null>(null);
  const [dynamicRoles, setDynamicRoles] =
    useState<{ id: number; name: string }[] | null>(null);

  /** Build a role name → ID map from the fetched roles.
   *  This replaces hardcoded role ID checks like `=== 14` for HR Manager. */
  const roleNameToId = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (dynamicRoles) {
      for (const r of dynamicRoles) {
        const key = r.name.toUpperCase().replace(/\s+/g, "_");
        map[key] = r.id;
      }
    }
    return map;
  }, [dynamicRoles]);

  /**
   * Resolve role label: prefer API-fetched label, fall back to static ROLE_LABELS.
   * Accepts either a UserRole enum key or any string role name.
   */
  const resolveRoleLabel = useCallback(
    (roleKey: string): string => {
      return (
        dynamicRoleLabels?.[roleKey] ??
        FALLBACK_ROLE_LABELS[roleKey] ??
        roleKey
      );
    },
    [dynamicRoleLabels],
  );

  /**
   * Resolve permissions: prefer API-fetched permissions for the role,
   * fall back to the static DEFAULT_ROLE_PERMISSIONS.
   */
  const resolveRolePermissions = useCallback(
    (roleKey: string): RolePermissions => {
      // Start with the fallback defaults so every known key has a value
      const fallback = DEFAULT_ROLE_PERMISSIONS[roleKey] ?? DEFAULT_ROLE_PERMISSIONS.ADMIN;
      // Look up dynamic overrides from the API (may be partial or empty)
      const dynamic =
        dynamicRolePermissions?.[roleKey] ??
        dynamicRolePermissions?.[roleKey.toUpperCase().replace(/\s+/g, "_")];
      // Merge: dynamic values win, but fallback fills in any missing keys.
      // This prevents an empty object {} from the API from breaking every check.
      return dynamic ? { ...fallback, ...dynamic } : fallback;
    },
    [dynamicRolePermissions],
  );

  const permissions = useMemo(
    () => resolveRolePermissions(currentRole),
    [currentRole, resolveRolePermissions],
  );

  // Fetch dynamic role data on mount
  useEffect(() => {
    fetchRolePermissions().then(setDynamicRolePermissions);
    fetchRoleLabels().then(setDynamicRoleLabels);
    fetchRoles().then((roles) => {
      if (roles) setDynamicRoles(roles);
    });
  }, []);

  const loadWorkflow = useCallback(async () => {
    try {
      const wf = await fetchApprovalWorkflow();
      if (wf && wf.steps.length > 0) {
        setWorkflowSteps(wf.steps);
        setWorkflowConfig(wf);
        return; // got real steps — no fallback needed
      }
    } catch {
      // backend unavailable — fall through to defaults
    }
    // Fallback: use default steps so the approval UI is always functional
    setWorkflowSteps(DEFAULT_WORKFLOW_STEPS);
    setWorkflowConfig(null);
  }, []);

  // Load full workflow from company endpoint for dynamic step resolution
  const loadWorkflowConfig = useCallback(async () => {
    try {
      const wf = await fetchWorkflowForCompany("default");
      if (wf && wf.steps.length > 0) {
        setWorkflowConfig(wf);
        setWorkflowSteps(wf.steps);
      }
    } catch {
      // Fallback: already set by loadWorkflow()
    }
  }, []);

  const loadStage1 = useCallback(async () => {
    if (!selectedImportId) {
      setStage1Data(null);
      setStage1ApprovalStatus("NONE");
      setStage1ApprovalsSummary([]);
      setStage1RequestId(null);
      setStage1ApprovalStep(null);
      return;
    }

    setStage1Loading(true);
    try {
      const data = await fetchAttendanceImportSummary(selectedImportId);
      setStage1Data(data);

      // Try backend first; fall back to local approval requests
      let requests: any[] = [];
      try {
        const backend = await fetchApprovalStatus({
          attendanceImportId: selectedImportId,
        });
        if (backend.length > 0) requests = backend;
      } catch {
        // backend unavailable
      }
      if (requests.length === 0) {
        requests = (localApprovalRequestsRef.current).filter(
          (r) =>
            r.referenceType === "ATTENDANCE_IMPORT" &&
            r.attendanceImportId === selectedImportId,
        );
      }

      const req = requests.find(
        (r: any) => r.referenceType === "ATTENDANCE_IMPORT",
      );

      if (!req) {
        setStage1ApprovalStatus("NONE");
        setStage1ApprovalsSummary([]);
        setStage1RequestId(null);
        setStage1ApprovalStep(null);
      } else {
        setStage1ApprovalStatus(req.status as any);

        const stageSteps = (workflowSteps || [])
          .filter((s: any) => s.stageType === "PAYROLL_DOCUMENT")
          .sort((a: any, b: any) => a.stepOrder - b.stepOrder);

        const doneRoleIds = new Set(
          (req.approvalActions || [])
            .filter((a: any) => a.action === "APPROVED")
            .map((a: any) => a.actor?.role?.id)
            .filter((id: any) => id != null),
        );

        setStage1ApprovalsSummary(
          stageSteps.map((s: any) => ({
            label: s.requiredRole?.name || `Role#${s.requiredRoleId}`,
            status: doneRoleIds.has(s.requiredRoleId) ? "done" : "todo",
          })),
        );

        // Compute the current pending step (first PAYROLL_DOCUMENT step not yet approved)
        const currentStep = stageSteps.find(
          (s: any) => !doneRoleIds.has(s.requiredRoleId),
        );
        setStage1ApprovalStep(
          currentStep
            ? {
                requiredRoleId: currentStep.requiredRoleId,
                requiredRoleName:
                  currentStep.requiredRole?.name ||
                  `Role#${currentStep.requiredRoleId}`,
              }
            : null,
        );
        setStage1RequestId(req.status === "PENDING" ? req.id : null);
      }
    } catch (err) {
      console.error("Failed to load stage 1:", err);
      setStage1Data(null);
      setStage1ApprovalStatus("NONE");
      setStage1ApprovalsSummary([]);
      setStage1RequestId(null);
      setStage1ApprovalStep(null);
    } finally {
      setStage1Loading(false);
    }
  }, [selectedImportId, workflowSteps]);

  const loadStage2 = useCallback(async () => {
    if (!selectedPeriod?.id) {
      setStage2Data(null);
      setCurrentApprovalStep(null);
      return;
    }
    setStage2Loading(true);
    try {
      // Fetch ALL runs for the period and aggregate their summaries
      const runsRes = await payrollRunApi.getRuns({ payrollPeriodId: selectedPeriod.id });
      const allRuns = Array.isArray(runsRes.data?.data) ? runsRes.data.data : [];

      if (allRuns.length === 0) {
        setStage2Data(null);
        setCurrentApprovalStep(null);
        setStage2Loading(false);
        return;
      }

      // Fetch summary for each run and aggregate
      const summaries = await Promise.all(
        allRuns.map((r: any) => fetchPayrollRunSummary(r.id)),
      );

      const aggregated: PayrollRunSummary = {
        runId: allRuns.map((r: any) => r.id).join(","),
        status: summaries.some((s) => s.status === "REJECTED")
          ? "REJECTED"
          : summaries.every((s) => s.status === "APPROVED" || s.status === "DONE")
            ? "APPROVED"
            : summaries.some((s) => s.status === "PENDING_PAYROLL_APPROVAL" || s.status === "PENDING_PAYMENT_APPROVAL")
              ? "PENDING"
              : summaries[0]?.status || "",
        createdAt: summaries[0]?.createdAt || "",
        createdBy: summaries[0]?.createdBy || 0,
        employeeCount: summaries.reduce((s, sm) => s + sm.employeeCount, 0),
        totalGross: summaries.reduce((s, sm) => s + sm.totalGross, 0),
        totalNet: summaries.reduce((s, sm) => s + sm.totalNet, 0),
        totalTax: summaries.reduce((s, sm) => s + sm.totalTax, 0),
        totalPension: summaries.reduce((s, sm) => s + sm.totalPension, 0),
        totalOvertime: summaries.reduce((s, sm) => s + sm.totalOvertime, 0),
        totalCostToCompany: summaries.reduce((s, sm) => s + sm.totalCostToCompany, 0),
        deductionCapBreached: summaries.reduce((s, sm) => s + sm.deductionCapBreached, 0),
        midMonthHires: summaries.reduce((s, sm) => s + sm.midMonthHires, 0),
        actingCapHits: summaries.reduce((s, sm) => s + sm.actingCapHits, 0),
        leaveSynced: summaries.every((sm) => sm.leaveSynced),
        periodName: summaries[0]?.periodName || "",
        periodStart: summaries[0]?.periodStart || "",
        periodEnd: summaries[0]?.periodEnd || "",
      };
      setStage2Data(aggregated);

      // ── Dynamic approval step resolution ──
      // Try backend first; fall back to local approval requests
      let requests: any[] = [];
      try {
        // Query by period ID — period-level submission covers all runs
        const backend = await fetchApprovalStatus({
          payrollPeriodId: selectedPeriod.id,
        });
        if (backend.length > 0) requests = backend;
      } catch {
        // backend unavailable
      }
      if (requests.length === 0) {
        requests = (localApprovalRequestsRef.current).filter(
          (r) =>
            r.stageType === "PAYROLL_APPROVAL" ||
            r.stageType === "PAYMENT_FILE",
        );
      }

      // ── Stage-type-aware step resolution ──
      // Separate steps by stage type so PAYROLL_APPROVAL actions don't
      // leak into PAYMENT_FILE resolution (both can use the same role IDs).
      const payrollSteps: ApprovalWorkflowStep[] = (
        workflowConfig?.steps || workflowSteps || []
      )
        .filter((s: any) => s.stageType === "PAYROLL_APPROVAL")
        .sort((a: any, b: any) => a.stepOrder - b.stepOrder);

      const paymentSteps: ApprovalWorkflowStep[] = (
        workflowConfig?.steps || workflowSteps || []
      )
        .filter((s: any) => s.stageType === "PAYMENT_FILE")
        .sort((a: any, b: any) => a.stepOrder - b.stepOrder);

      // Collect actions per stage type
      const payrollActions = (requests || [])
        .filter((r: any) => r.stageType === "PAYROLL_APPROVAL")
        .flatMap((r: any) => r.approvalActions || []);

      const paymentActions = (requests || [])
        .filter((r: any) => r.stageType === "PAYMENT_FILE")
        .flatMap((r: any) => r.approvalActions || []);

      // Compute current step: PAYROLL_APPROVAL first, then PAYMENT_FILE
      const currentPayrollStep = computeCurrentStep(payrollSteps, payrollActions);
      const currentPaymentStep = computeCurrentStep(paymentSteps, paymentActions);

      const currentStep = currentPayrollStep || currentPaymentStep;

      if (currentStep) {
        // Find the pending request for this stage type — prefer the one with
        // the most approval actions (the "active" request that has been progressed).
        const active = (requests || [])
          .filter(
            (r: any) =>
              r.status === "PENDING" && r.stageType === currentStep.stageType,
          )
          .sort(
            (a: any, b: any) =>
              (b.approvalActions?.length || 0) -
              (a.approvalActions?.length || 0),
          );
        const pendingReq = active[0] || null;

        // Only include actions from requests matching the current step's stage type
        const stageActions = (requests || [])
          .filter((r: any) => r.stageType === currentStep.stageType)
          .flatMap((r: any) => r.approvalActions || []);

        setCurrentApprovalStep({
          stageType: currentStep.stageType,
          requiredRoleId: currentStep.requiredRoleId,
          requiredRoleName: currentStep.requiredRole?.name || `Role#${currentStep.requiredRoleId}`,
          isRequired: currentStep.isRequired,
          requestId: pendingReq?.id || null,
          doneRoleNames: stageActions
            .filter((a: any) => a.action === "APPROVED")
            .map((a: any) => a.actor?.role?.name)
            .filter(Boolean),
          alternateRoleId: currentStep.alternateRoleId,
          alternateRoleName: currentStep.alternateRoleName,
        });
      } else {
        setCurrentApprovalStep(null);
      }
    } catch (err) {
      console.error("Failed to load stage 2:", err);
      setStage2Data(null);
      setCurrentApprovalStep(null);
    } finally {
      setStage2Loading(false);
    }
  }, [selectedPeriod, workflowConfig, workflowSteps]);

  // Actions

  const handleActivateImport = useCallback(async () => {
    if (!selectedImportId) return;
    setActionLoading(true);
    try {
      await attendanceApi.toggleImportActive(selectedImportId);
      toast.success("Import activated successfully");
      await loadStage1();
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to activate import"));
    } finally {
      setActionLoading(false);
    }
  }, [selectedImportId, loadStage1]);

  const handleCalculateOt = useCallback(async () => {
    if (!selectedImportId) return;
    setActionLoading(true);
    try {
      await attendanceApi.calculateOvertime(selectedImportId);
      toast.success("Overtime calculated successfully");
      await loadStage1();
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to calculate overtime"));
    } finally {
      setActionLoading(false);
    }
  }, [selectedImportId, loadStage1]);

  const handleCalculateSummary = useCallback(async () => {
    if (!selectedImportId) return;
    setActionLoading(true);
    try {
      await attendanceApi.calculateSummary(selectedImportId);
      toast.success("Attendance summary calculated successfully");
      await loadStage1();
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to calculate summary"));
    } finally {
      setActionLoading(false);
    }
  }, [selectedImportId, loadStage1]);

  const handleApproveImport = useCallback(async () => {
    if (!selectedImportId) return;
    setActionLoading(true);
    try {
      // Check if the workflow has a PAYROLL_DOCUMENT stage configured
      const hasAttendanceStage = (workflowConfig?.steps || workflowSteps || [])
        .some((s: any) => s.stageType === "PAYROLL_DOCUMENT");

      if (!hasAttendanceStage) {
        // Informational: no attendance approval step configured
        toast.success(
          "Attendance is ready. Stage 1 is informational — no formal approval is configured. Payroll Officer can now run payroll.",
        );
        await loadStage1();
        return;
      }

      try {
        await apiRequestApproval(
          "PAYROLL_DOCUMENT",
          "ATTENDANCE_IMPORT",
          undefined,
          selectedImportId,
        );
      } catch {
        // Backend unavailable — create a local fallback request
        updateLocalApprovals((prev) => [
          ...prev,
          {
            id: localId(),
            stageType: "PAYROLL_DOCUMENT",
            referenceType: "ATTENDANCE_IMPORT",
            status: "PENDING",
            requestedBy: currentRole,
            requestedAt: new Date().toISOString(),
            resolvedAt: null,
            payrollRunId: null,
            attendanceImportId: selectedImportId,
            approvalActions: [],
          },
        ]);
      }
      // Notify the target role from the workflow config
      const targetRoleName = (workflowConfig?.steps || workflowSteps || [])
        .find((s: any) => s.stageType === "PAYROLL_DOCUMENT")
        ?.requiredRole?.name || "HR Manager";
      dispatch(
        notificationActions.addNotification({
          id: localId(),
          title: "Attendance Approval Required",
          message: `Attendance import submitted by ${resolveRoleLabel(currentRole)}. Review and approve to proceed with payroll.`,
          type: "urgent",
          read: false,
          category: "Approval Workflow",
          targetRole: targetRoleName.toUpperCase().replace(/\s+/g, "_"),
          createdAt: new Date().toISOString(),
          link: "/approval-workflow",
        }),
      );
      toast.success("Attendance submitted for approval.");
      await loadStage1();
      setImportsVersion(v => v + 1);
    } finally {
      setActionLoading(false);
    }
  }, [selectedImportId, loadStage1, localId, currentRole, updateLocalApprovals, dispatch, workflowConfig, workflowSteps]);

  const handleApproveStage1 = useCallback(async () => {
    if (!stage1RequestId) return;
    setActionLoading(true);
    try {
      await apiApproveRequest(stage1RequestId);
      toast.success("Attendance import approved. Payroll can now be processed.");
      await loadStage1();
      setImportsVersion(v => v + 1);
    } catch (err: any) {
      const status = err?.response?.status;
      const message = extractErrorMessage(err, "Failed to approve attendance");
      // 409 = already resolved on backend; refresh to show current state
      if (status === 409) {
        toast.info("Attendance request was already resolved. Refreshing status…");
      } else {
        // Backend unavailable — fall back to local state
        updateLocalApprovals((prev) =>
          prev.map((r) =>
            r.id === stage1RequestId
              ? {
                  ...r,
                  status: "APPROVED",
                  approvalActions: [
                    ...(r.approvalActions || []),
                    {
                      id: localId(),
                      actor: { role: { id: authUser?.role?.id, name: authUser?.role?.name } },
                      action: "APPROVED",
                      actedAt: new Date().toISOString(),
                    },
                  ],
                }
              : r,
          ),
        );
        toast.success("Attendance import approved (local). Payroll can now be processed.");
        dispatch(
          notificationActions.addNotification({
            id: localId(),
            title: "Attendance Approved",
            message: `Attendance import was approved by ${resolveRoleLabel(currentRole)}. Payroll can now proceed.`,
            type: "info",
            read: false,
            category: "Approval Workflow",
            targetRole: "PAYROLL_OFFICER",
            createdAt: new Date().toISOString(),
            link: "/approval-workflow",
          }),
        );
      }
      await loadStage1();
      setImportsVersion(v => v + 1);
    } finally {
      setActionLoading(false);
    }
  }, [stage1RequestId, loadStage1, localId, updateLocalApprovals, authUser, dispatch, currentRole]);

  const handleRejectStage1 = useCallback(async (reason: string) => {
    if (!stage1RequestId) return;
    setActionLoading(true);
    try {
      await apiRejectRequest(stage1RequestId, reason);
      toast.success("Attendance import rejected.");
      await loadStage1();
      setImportsVersion(v => v + 1);
    } catch (err: any) {
      const status = err?.response?.status;
      const message = extractErrorMessage(err, "Failed to reject attendance");
      // 409 = already resolved on backend; refresh to show current state
      if (status === 409) {
        toast.info("Attendance request was already resolved. Refreshing status…");
      } else {
        // Backend unavailable — fall back to local state
        updateLocalApprovals((prev) =>
          prev.map((r) =>
            r.id === stage1RequestId
              ? {
                  ...r,
                  status: "REJECTED",
                  approvalActions: [
                    ...(r.approvalActions || []),
                    {
                      id: localId(),
                      actor: { role: { id: authUser?.role?.id, name: authUser?.role?.name } },
                      action: "REJECTED",
                      actedAt: new Date().toISOString(),
                      comment: reason,
                    },
                  ],
                }
              : r,
          ),
        );
        toast.success("Attendance import rejected (local). Resubmit after fixing issues.");
        // Notify the submitter (HR Officer) that their submission was rejected
        dispatch(
          notificationActions.addNotification({
            id: localId(),
            title: "Attendance Rejected",
            message: `Attendance import was rejected by ${resolveRoleLabel(currentRole)}. ${reason ? `Reason: ${reason}` : "Please review and resubmit."}`,
            type: "urgent",
            read: false,
            category: "Approval Workflow",
            targetRole: "HR_OFFICER",
            createdAt: new Date().toISOString(),
            link: "/approval-workflow",
          }),
        );
      }
      await loadStage1();
      setImportsVersion(v => v + 1);
    } finally {
      setActionLoading(false);
    }
  }, [stage1RequestId, loadStage1, localId, updateLocalApprovals, authUser, dispatch, currentRole]);

  const handleRunPayroll = useCallback(async () => {
    if (!selectedPeriod?.id) return;
    setActionLoading(true);
    try {
      const res = await payrollRunApi.runPayroll({
        payrollPeriodId: selectedPeriod.id,
      });
      const newRunId = res.data?.data?.payrollRunId;
      const processedCount = res.data?.data?.processedCount ?? 0;
      toast.success(
        `Payroll run completed — ${processedCount} employees processed`,
      );

      // Refresh the run list so the new run appears
      const runRes = await payrollRunApi.getRuns({
        payrollPeriodId: selectedPeriod.id,
      });
      const runList = Array.isArray(runRes.data?.data) ? runRes.data.data : [];
      setRuns(runList);

      // If the backend returned a run ID, select it directly.
      // Otherwise pick the first run from the refreshed list.
      if (newRunId) {
        setSelectedRunId(newRunId);
      } else if (runList.length > 0) {
        setSelectedRunId(runList[0].id);
      }

      await loadStage2();
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to run payroll"));
    } finally {
      setActionLoading(false);
    }
  }, [selectedPeriod, loadStage2]);

  const handleSubmitForApproval = useCallback(async () => {
    if (!selectedPeriod?.id) return;
    setActionLoading(true);
    try {
      try {
        // Submit ALL processed runs for the period at once (no per-run submission)
        await apiRequestApproval("PAYROLL_APPROVAL", "PAYROLL_RUN", undefined, undefined, selectedPeriod.id);
      } catch {
        // Backend unavailable — create local fallback
        updateLocalApprovals((prev) => [
          ...prev,
          {
            id: localId(),
            stageType: "PAYROLL_APPROVAL",
            referenceType: "PAYROLL_RUN",
            status: "PENDING",
            requestedBy: currentRole,
            requestedAt: new Date().toISOString(),
            resolvedAt: null,
            payrollRunId: null,
            attendanceImportId: null,
            approvalActions: [],
          },
        ]);
      }
      // Notify the HR Manager (first approver in PAYROLL_APPROVAL pipeline)
      dispatch(
        notificationActions.addNotification({
          id: localId(),
          title: "Payroll Approval Required",
          message: `Payroll for ${selectedPeriod.name ?? selectedPeriod.id} submitted by ${resolveRoleLabel(currentRole)}. HR Manager review and approval required.`,
          type: "urgent",
          category: "approval",
          targetRole: "HR_MANAGER",
          link: "/approval",
          read: false,
          createdAt: new Date().toISOString(),
        }),
      );
      toast.success("Payroll submitted for approval");
      await loadStage2();
    } finally {
      setActionLoading(false);
    }
  }, [selectedPeriod, loadStage2, localId, currentRole, currentApprovalStep, updateLocalApprovals, dispatch]);

  const handleApproveRun = useCallback(async () => {
    const isPaymentStep = currentApprovalStep?.stageType === "PAYMENT_FILE";
    if (isPaymentStep) {
      if (!selectedPeriod?.id) return;
    } else {
      if (!selectedRunId) return;
    }
    setActionLoading(true);
    try {
      // ── DEBUG: log params for fetchApprovalStatus ──
      console.log("[handleApproveRun DEBUG]", {
        isPaymentStep,
        selectedPeriodId: selectedPeriod?.id,
        selectedRunId,
        currentApprovalStep: currentApprovalStep
          ? { stageType: currentApprovalStep.stageType, requestId: currentApprovalStep.requestId, requiredRoleId: currentApprovalStep.requiredRoleId }
          : null,
      });

      // Try backend first; fall back to local state
      let pending: any = null;
      try {
        const fetchParams = isPaymentStep
          ? { payrollPeriodId: selectedPeriod?.id }
          : { payrollRunId: selectedRunId, payrollPeriodId: selectedPeriod?.id };
        console.log("[handleApproveRun] fetchApprovalStatus params:", fetchParams);
        const statusRes = await fetchApprovalStatus(fetchParams);
        console.log("[handleApproveRun] fetchApprovalStatus response count:", statusRes?.length);
        if (statusRes?.length > 0) {
          console.log("[handleApproveRun] first item:", {
            id: statusRes[0].id,
            status: statusRes[0].status,
            stageType: statusRes[0].stageType,
            referenceType: statusRes[0].referenceType,
          });
        } else {
          console.log("[handleApproveRun] response EMPTY — backend returned no data or errored");
        }
        pending = ((statusRes || [])
          .filter(
            (r: any) =>
              r.status === "PENDING" && r.referenceType === "PAYROLL_RUN",
          )
          .sort(
            (a: any, b: any) =>
              (b.approvalActions?.length || 0) -
              (a.approvalActions?.length || 0),
          ))[0] || null;
        console.log("[handleApproveRun] pending after filter:", pending ? `found id=${pending.id} stageType=${pending.stageType}` : "null");
      } catch {
        // backend unavailable
        console.log("[handleApproveRun] fetchApprovalStatus threw — backend unavailable");
      }

      if (!pending) {
        // Fallback: find a local pending request from the ref (always up-to-date)
        const localPending = (localApprovalRequestsRef.current).find(
          (r: any) =>
            r.status === "PENDING" &&
            r.referenceType === "PAYROLL_RUN" &&
            (isPaymentStep
              ? r.stageType === "PAYMENT_FILE"
              : (r.payrollRunId === selectedRunId || !r.payrollRunId)),
        );
        if (!localPending) {
          toast.error("No pending approval request found for this run");
          return;
        }
        // Approve locally using updateLocalApprovals (updates both ref and state)
        const userRoleId = authUser?.role?.id;
        const action = {
          id: localId(),
          actor: { role: { id: userRoleId, name: resolveRoleLabel(currentRole) } },
          action: "APPROVED",
          actedAt: new Date().toISOString(),
        };
        updateLocalApprovals((prev) =>
          prev.map((r) =>
            r.id === localPending.id
              ? { ...r, status: "APPROVED", approvalActions: [...(r.approvalActions || []), action] }
              : r,
          ),
        );
        const roleName = resolveRoleLabel(currentRole);
        toast.success(
          currentApprovalStep?.stageType === "PAYMENT_FILE"
            ? `Payment approved by ${roleName}. Payroll complete.`
            : `Run approved by ${roleName}. Next: submit the payment file.`,
        );
        // Notify Finance roles after HR Manager approves
        // Uses dynamic roleNameToId lookup so the check works regardless of the actual DB role ID
        const hrManagerId = roleNameToId["HR_MANAGER"] ?? 14;
        if (currentApprovalStep?.requiredRoleId === hrManagerId) {

          dispatch(
            notificationActions.addNotification({
              id: localId(),
              title: "Payroll Ready for Finance Review",
              message: "HR Manager has approved the payroll. Finance review required.",
              type: "urgent",
              category: "approval",
              targetRole: "FINANCE_MANAGER",
              link: "/approval",
              read: false,
              createdAt: new Date().toISOString(),
            }),
          );
          dispatch(
            notificationActions.addNotification({
              id: localId() + "-fo",
              title: "Payroll Ready for Finance Review",
              message: "HR Manager has approved the payroll. Finance review required.",
              type: "urgent",
              category: "approval",
              targetRole: "FINANCE_OFFICER",
              link: "/approval",
              read: false,
              createdAt: new Date().toISOString(),
            }),
          );
        }
        await loadStage2();
        return;
      }

      // Backend is available — use it
      await apiApproveRequest(pending.id);
      const wasPayrollApproval = pending.stageType === "PAYROLL_APPROVAL" || !pending.stageType;      toast.success(
        wasPayrollApproval
          ? "Run approved. Next: submit the payment file. [Go to Payroll Run Detail →]"
          : "Payroll complete. [View in Reports →] [Download Payroll Report →]",
      );
      // Notify Finance roles after HR Manager approves
      // Uses dynamic roleNameToId lookup so the check works regardless of the actual DB role ID
      const hrManagerId = roleNameToId["HR_MANAGER"] ?? 14;
      if (currentApprovalStep?.requiredRoleId === hrManagerId) {
        dispatch(
          notificationActions.addNotification({
            id: localId(),
            title: "Payroll Ready for Finance Review",
            message: "HR Manager has approved the payroll. Finance review required.",
            type: "urgent",
            category: "approval",
            targetRole: "FINANCE_MANAGER",
            link: "/approval",
            read: false,
            createdAt: new Date().toISOString(),
          }),
        );
        dispatch(
          notificationActions.addNotification({
            id: localId() + "-fo",
            title: "Payroll Ready for Finance Review",
            message: "HR Manager has approved the payroll. Finance review required.",
            type: "urgent",
            category: "approval",
            targetRole: "FINANCE_OFFICER",
            link: "/approval",
            read: false,
            createdAt: new Date().toISOString(),
          }),
        );
      }
      await loadStage2();
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to approve run"));
    } finally {
      setActionLoading(false);
    }
  }, [selectedRunId, selectedPeriod, loadStage2, localId, currentRole, currentApprovalStep, updateLocalApprovals, authUser, roleNameToId]);

  const handleRejectRun = useCallback(
    async (reason: string) => {
      const isPaymentStep = currentApprovalStep?.stageType === "PAYMENT_FILE";
      if (isPaymentStep) {
        if (!selectedPeriod?.id) return;
      } else {
        if (!selectedRunId) return;
      }
      setActionLoading(true);
      try {
        // Try backend first
        let pending: any = null;
        try {
          const statusRes = await fetchApprovalStatus(
            isPaymentStep
              ? { payrollPeriodId: selectedPeriod?.id }
              : { payrollRunId: selectedRunId, payrollPeriodId: selectedPeriod?.id },
          );
          pending = ((statusRes || [])
            .filter(
              (r: any) =>
                r.status === "PENDING" && r.referenceType === "PAYROLL_RUN",
            )
            .sort(
              (a: any, b: any) =>
                (b.approvalActions?.length || 0) -
                (a.approvalActions?.length || 0),
            ))[0] || null;
        } catch {
          // backend unavailable
        }

        if (!pending) {
          // Fallback: find local pending request
          const localPending = (localApprovalRequestsRef.current).find(
            (r: any) =>
              r.status === "PENDING" &&
              r.referenceType === "PAYROLL_RUN" &&
              (isPaymentStep
                ? r.stageType === "PAYMENT_FILE"
                : (r.payrollRunId === selectedRunId || !r.payrollRunId)),
          );
          if (!localPending) {
            toast.error("No pending approval request found for this run");
            return;
          }
          // Reject locally
          const userRoleId = authUser?.role?.id;
          const action = {
            id: localId(),
            actor: { role: { id: userRoleId, name: resolveRoleLabel(currentRole) } },
            action: "REJECTED",
            actedAt: new Date().toISOString(),
            comment: reason,
          };
          updateLocalApprovals((prev) =>
            prev.map((r) =>
              r.id === localPending.id
                ? { ...r, status: "REJECTED", approvalActions: [...(r.approvalActions || []), action] }
                : r,
            ),
          );
          toast.success("Run rejected. Resubmit after fixing issues.");
          // Notify submitter about rejection
          dispatch(
            notificationActions.addNotification({
              id: localId(),
              title: "Payroll Rejected",
              message: `Payroll returned with comment: ${reason}`,
              type: "urgent",
              category: "approval",
              targetRole: "HR_OFFICER",
              link: "/approval",
              read: false,
              createdAt: new Date().toISOString(),
            }),
          );
          await loadStage2();
          return;
        }

        await apiRejectRequest(pending.id, reason);
        toast.success("Rejected. Run reset to DRAFT. [Go to Payroll Run Detail to fix →]");
        // Notify submitter about rejection
        dispatch(
          notificationActions.addNotification({
            id: localId(),
            title: "Payroll Rejected",
            message: `Payroll returned with comment: ${reason}`,
            type: "urgent",
            category: "approval",
            targetRole: "HR_OFFICER",
            link: "/approval",
            read: false,
            createdAt: new Date().toISOString(),
          }),
        );
        await loadStage2();
      } catch (err: any) {
        toast.error(extractErrorMessage(err, "Failed to reject run"));
      } finally {
        setActionLoading(false);
      }
    },
    [selectedRunId, selectedPeriod, loadStage2, localId, currentRole, currentApprovalStep, updateLocalApprovals, authUser],
  );

  const handleSubmitPaymentFile = useCallback(async () => {
    if (!selectedPeriod?.id) return;
    setActionLoading(true);
    try {
      try {
        await apiRequestApproval("PAYMENT_FILE", "PAYROLL_RUN", undefined, undefined, selectedPeriod.id);
      } catch {
        // Backend unavailable — create local fallback
        updateLocalApprovals((prev) => [
          ...prev,
          {
            id: localId(),
            stageType: "PAYMENT_FILE",
            referenceType: "PAYROLL_RUN",
            status: "PENDING",
            requestedBy: currentRole,
            requestedAt: new Date().toISOString(),
            resolvedAt: null,
            payrollRunId: null,
            attendanceImportId: null,
            approvalActions: [],
          },
        ]);
      }
      // Notify the Finance Officer (payment approver)
      dispatch(
        notificationActions.addNotification({
          id: localId(),
          title: "Payment Approval Required",
          message: `Payment file submitted by ${resolveRoleLabel(currentRole)}. Final approval needed to complete payroll.`,
          type: "urgent",
          read: false,
          category: "Approval Workflow",
          targetRole: "FINANCE_OFFICER",
          createdAt: new Date().toISOString(),
          link: "/approval-workflow",
        }),
      );
      toast.success("Payment file submitted. Waiting on Finance Officer to approve. [View on Approval Workflow →]");
      await loadStage2();
    } finally {
      setActionLoading(false);
    }
  }, [selectedPeriod, loadStage2, localId, currentRole, updateLocalApprovals, dispatch]);

  // Stage 1 is "complete" only when the attendance has been formally approved.
  // Payroll pipeline must NOT start until the attendance approval workflow finishes.
  const stage1Complete = stage1ApprovalStatus === "APPROVED";
  const stage2Complete =
    stage2Data?.status === "PENDING_PAYROLL_APPROVAL" ||
    stage2Data?.status === "PENDING_PAYMENT_APPROVAL" ||
    stage2Data?.status === "PENDING" ||
    stage2Data?.status === "APPROVED" ||
    stage2Data?.status === "DONE";

  const stages = useMemo(
    () => [
      {
        id: 1,
        label: "Attendance",
        status: (stage1Complete
          ? "completed"
          : stage1Data
            ? "active"
            : "locked") as PipelineStageStatus,
      },
      {
        id: 2,
        label: "Payroll Run",
        status: (stage2Complete
          ? "completed"
          : stage1Complete
            ? "active"
            : "locked") as unknown as PipelineStageStatus,
      },
      {
        id: 3,
        label: "Payment",
        status: (stage2Data?.status === "APPROVED" ||
        stage2Data?.status === "DONE"
          ? "completed"
          : stage2Complete
            ? "active"
            : "locked") as unknown as PipelineStageStatus,
      },
    ],
    [stage1Complete, stage1Data, stage2Complete, stage2Data?.status],
  );

  const flags = useMemo(
    () => computePipelineFlags(stage1Data, stage2Data, null),
    [stage1Data, stage2Data],
  );

  // load periods/imports/runs
  useEffect(() => {
    loadWorkflow();
    loadWorkflowConfig();
  }, [loadWorkflow, loadWorkflowConfig]);

  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const response = await payrollPeriodApi.getAll();
        const periodList = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        setPeriods(periodList);
        if (periodList.length > 0) {
          const active =
            periodList.find((p: any) => p.status === "ACTIVE") || periodList[0];
          setSelectedPeriod(active);
        }
      } catch (err) {
        console.error("Failed to load periods:", err);
      }
    };
    loadPeriods();
  }, []);

  useEffect(() => {
    if (!selectedPeriod) return;
    const loadImports = async () => {
      setLoading(true);
      try {
        const res = await attendanceApi.listImports({ limit: 100 });
        const imports = (res || []).filter(
          (i: any) => i.payrollPeriodId === selectedPeriod.id,
        );
        setActiveImports(imports);
        const active = imports.find((i: any) => i.isActive) || imports[0];
        if (active) {
          setSelectedImportId(active.id);
        } else {
          setSelectedImportId(null);
          setStage1Data(null);
        }
      } catch (err) {
        console.error("Failed to load imports:", err);
        setActiveImports([]);
      } finally {
        setLoading(false);
      }
    };
    loadImports();
  }, [selectedPeriod, importsVersion]);

  useEffect(() => {
    if (!selectedPeriod) return;
    const loadRuns = async () => {
      try {
        const response = await payrollRunApi.getRuns({
          payrollPeriodId: selectedPeriod.id,
        });
        const runList = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        setRuns(runList);
        setSelectedRunId(runList.length > 0 ? runList[0].id : null);
      } catch (err) {
        console.error("Failed to load runs:", err);
        setRuns([]);
      }
    };
    loadRuns();
  }, [selectedPeriod]);

  useEffect(() => {
    loadStage1();
  }, [loadStage1]);

  useEffect(() => {
    loadStage2();
  }, [loadStage2]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Approval Workflow
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage the 3-stage payroll pipeline — from attendance verification through to payment approval
          </p>
        </div>

        <div
          className="flex items-center gap-2 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200/60 rounded-xl px-4 py-2.5 shadow-sm"
        >
          <ShieldCheck className="w-4 h-4 text-indigo-500" />
          <div className="flex flex-col">
            <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest">
              Current Role
            </span>
            <span className="text-xs font-bold text-indigo-700">
              {resolveRoleLabel(currentRole)}
            </span>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div
        className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 shadow-lg shadow-slate-900/5"
      >
        <StepIndicator stages={stages} />
      </div>

      {/* Filters Row */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            <CalendarDays className="w-3 h-3" />
            Payroll Period
          </label>
          <select
            value={selectedPeriod?.id || ""}
            onChange={(e) => {
              const p = periods.find((p: any) => p.id === e.target.value);
              setSelectedPeriod(p || null);
            }}
            className="w-full px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none transition-all"
          >
            {periods.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.status}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            <FileSpreadsheet className="w-3 h-3" />
            Attendance Import
          </label>
          <select
            value={selectedImportId || ""}
            onChange={(e) => setSelectedImportId(e.target.value || null)}
            className="w-full px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none transition-all"
          >
            <option value="">No import selected</option>
            {activeImports.map((imp: any) => (
              <option key={imp.id} value={imp.id}>
                {imp.periodLabel || imp.source || "Import"} — {imp.isActive ? "Active" : "Inactive"}{imp.processedAt ? " • Processed" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            <Calculator className="w-3 h-3" />
            Payroll Run
          </label>
          <select
            value={selectedRunId || ""}
            onChange={(e) => setSelectedRunId(e.target.value || null)}
            className="w-full px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none transition-all"
          >
            <option value="">Select a payroll run</option>
            {runs.map((r: any, idx: number) => (
              <option key={r.id} value={r.id}>
                {selectedPeriod?.name ? `${selectedPeriod.name} — ` : ""}Run #{idx + 1} — {describeRunStatus(r.status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FlagList flags={flags} />

      <div className="space-y-8">
        <Stage1Card
          data={stage1Data}
          loading={stage1Loading || actionLoading}
          permissions={permissions}
          importId={selectedImportId}
          approvalStatus={stage1ApprovalStatus}
          approvalsSummary={stage1ApprovalsSummary}
          userRoleId={authUser?.role?.id}
          stage1ApprovalStep={stage1ApprovalStep}
          onRefresh={loadStage1}
          onActivate={handleActivateImport}
          onCalculateOt={handleCalculateOt}
          onCalculateSummary={handleCalculateSummary}
          onApproveImport={handleApproveImport}
          onApprove={handleApproveStage1}
          onReject={handleRejectStage1}
          onViewEmployeeStats={handleViewEmployeeStats}
        />

        <Stage2Card
          data={stage2Data}
          loading={stage2Loading || actionLoading}
          permissions={permissions}
          stage1Complete={stage1Complete}
          periodId={selectedPeriod?.id || null}
          currentRole={currentRole}
          currentApprovalStep={currentApprovalStep}
          userRoleId={authUser?.role?.id}
          onRefresh={loadStage2}
          onRunPayroll={handleRunPayroll}
          onSubmitForApproval={handleSubmitForApproval}
          onApprove={handleApproveRun}
          onReject={handleRejectRun}
          onViewEmployeeStats={handleViewPayrollEmployeeStats}
        />

        <Stage3Card
          data={stage2Data}
          loading={stage2Loading || actionLoading}
          permissions={permissions}
          stage2Complete={stage2Complete}
          currentRole={currentRole}
          currentApprovalStep={currentApprovalStep}
          userRoleId={authUser?.role?.id}
          onRefresh={loadStage2}
          onApproveRun={handleApproveRun}
          onRejectRun={handleRejectRun}
          onSubmitPaymentFile={handleSubmitPaymentFile}
          payrollRunId={stage2Data?.runId?.split(",")[0]}
        />
      </div>

      {/* Approval History Timeline */}
      <ApprovalHistoryTimeline
        localApprovalRequests={localApprovalRequests}
        resolveRoleLabel={resolveRoleLabel}
      />

    </div>
  );
};
