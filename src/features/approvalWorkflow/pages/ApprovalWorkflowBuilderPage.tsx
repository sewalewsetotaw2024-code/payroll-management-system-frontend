import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Trash2,
  Power,
  PowerOff,
  ShieldCheck,
  Settings2,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  X,
  Pencil,
  RefreshCw,
  LayoutList,
  User,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { toast } from "../../../components/ui/Toast";
import {
  fetchApprovalWorkflow,
  updateWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  addWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  fetchRoles,
  updateRolePermissions,
  type ApprovalWorkflowConfig,
  type DynamicRole,
} from "../api/approvalWorkflowApi";
import type { ApprovalWorkflowStep } from "../types/approvalWorkflow.types";
import {
  fetchRoleUsers,
  fetchUnassignedEmployees,
  assignUserToRole,
  removeUserFromRole,
  createRole,
  updateRole,
  deleteRole,
  type RoleUser,
  type UnassignedEmployee,
} from "../api/approvalWorkflowApi";

// ── Permission Labels ───────────────────────────────────────────────────────-

const PERMISSION_GROUPS: { label: string; keys: { key: string; label: string }[] }[] = [
  {
    label: "Import",
    keys: [
      { key: "canActivateImport", label: "Activate Import" },
      { key: "canApproveImport", label: "Submit Import for Approval" },
    ],
  },
  {
    label: "Calculations",
    keys: [
      { key: "canCalculateOt", label: "Calculate Overtime" },
      { key: "canCalculateSummary", label: "Calculate Summary" },
    ],
  },
  {
    label: "Payroll",
    keys: [
      { key: "canRunPayroll", label: "Run Payroll" },
      { key: "canSubmitForApproval", label: "Submit Payroll for Approval" },
      { key: "canSubmitPayroll", label: "Submit Payroll" },
      { key: "canSyncLeave", label: "Sync Leave" },
      { key: "canReRunEmployee", label: "Re-run Employee" },
    ],
  },
  {
    label: "Approval",
    keys: [
      { key: "canApproveRun", label: "Approve Payroll Run" },
      { key: "canRejectRun", label: "Reject Payroll Run" },
      { key: "canApproveAttendance", label: "Approve Attendance" },
      { key: "canRejectAttendance", label: "Reject Attendance" },
    ],
  },
  {
    label: "Payment",
    keys: [
      { key: "canSubmitPaymentFile", label: "Submit Payment File" },
    ],
  },
  {
    label: "View",
    keys: [
      { key: "canViewEmployeeDetail", label: "View Employee Detail" },
    ],
  },
];

// ── Constants ────────────────────────────────────────────────────────────────

const STAGE_TYPE_OPTIONS = [
  { value: "PAYROLL_APPROVAL", label: "Payroll Approval" },
  { value: "PAYMENT_FILE", label: "Payment File" },
  { value: "ATTENDANCE", label: "Attendance" },
] as const;

/** Fallback roles used when the backend roles API is unavailable. */
const FALLBACK_ROLES: DynamicRole[] = [
  { id: 13, name: "HR Generalist", permissions: null },
  { id: 14, name: "HR CS Manager", permissions: null },
  { id: 15, name: "HR CS Director", permissions: null },
  { id: 16, name: "Finance Officer", permissions: null },
  { id: 17, name: "Finance Manager", permissions: null },
  { id: 6, name: "Admin", permissions: null },
];

// ── Helper ───────────────────────────────────────────────────────────────────

const stageTypeLabel = (type: string): string =>
  STAGE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;

const roleName = (roleId: number, roles: DynamicRole[]): string =>
  roles.find((r) => r.id === roleId)?.name ?? `Role#${roleId}`;

const extractErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.response?.data?.msg ||
  err?.message ||
  fallback;

// ── Error Boundary ─────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, fallback }) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handler = (e: ErrorEvent) => {
      setHasError(true);
      setError(e.error);
      e.preventDefault();
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  if (hasError) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-rose-400" />
        <h3 className="text-sm font-extrabold text-rose-700 mb-1">Something went wrong</h3>
        <p className="text-xs text-rose-500 mb-3">{error?.message ?? "An unexpected error occurred"}</p>
        <button
          onClick={() => { setHasError(false); setError(null); }}
          className="px-4 py-2 text-xs font-bold rounded-xl text-rose-600 border border-rose-200 hover:bg-rose-100 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

// ── Pipeline Visualization ─────────────────────────────────────────────────────

interface PipelineVisualizationProps {
  steps: ApprovalWorkflowStep[];
  roles: DynamicRole[];
}

const PipelineVisualization: React.FC<PipelineVisualizationProps> = ({ steps, roles }) => {
  if (steps.length === 0) return null;

  const stageColors: Record<string, string> = {
    PAYROLL_APPROVAL: "bg-emerald-500",
    PAYMENT_FILE: "bg-emerald-600",
    ATTENDANCE: "bg-emerald-400",
    PAYROLL_DOCUMENT: "bg-emerald-700",
    PAYROLL_BATCH: "bg-emerald-300",
  };

  const stageLabels: Record<string, string> = {
    PAYROLL_DOCUMENT: "Document Review",
    PAYROLL_APPROVAL: "Payroll Approval",
    PAYMENT_FILE: "Payment Release",
    ATTENDANCE: "Attendance",
    PAYROLL_BATCH: "Batch",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-transparent">
        <div className="flex items-center gap-2">
          <LayoutList className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            Pipeline Flow
          </h3>
        </div>
      </div>
      <div className="px-6 py-5 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {steps.map((step, index) => {
            const stepColor = stageColors[step.stageType] ?? "bg-slate-500";
            const stageLabel = stageLabels[step.stageType] ?? step.stageType;
            const roleDisplay = roleName(step.requiredRoleId, roles);
            const altDisplay = step.alternateRoleId
              ? roleName(step.alternateRoleId, roles)
              : null;

            return (
              <React.Fragment key={step.id}>
                {/* Step Node */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-2xl ${stepColor} bg-opacity-15 flex items-center justify-center shadow-sm border border-slate-200`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${stepColor}`} />
                  </div>
                  <div className="text-center max-w-[120px]">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider truncate">
                      {stageLabel}
                    </p>
                    <p className="text-[11px] font-bold text-slate-800 truncate">
                      {roleDisplay}
                    </p>
                    {altDisplay && (
                      <p className="text-[9px] font-medium text-slate-400 truncate">
                        or {altDisplay}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {step.isRequired ? (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-brand-100 text-emerald-700">
                        Required
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400">
                        Opt
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-300">
                      Step {index + 1}
                    </span>
                  </div>
                </div>

                {/* Arrow connector */}
                {index < steps.length - 1 && (
                  <div className="flex items-center mx-3">
                    <div className="w-8 h-0.5 bg-slate-200 relative">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 absolute -right-1.5 -top-1.5" />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Terminal node */}
          <div className="flex flex-col items-center gap-2 ml-2">
            <div className="w-10 h-10 rounded-2xl bg-brand-100 flex items-center justify-center border-2 border-brand-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-center max-w-[100px]">
              <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">
                Complete
              </p>
              <p className="text-[11px] font-bold text-emerald-700">
                Payroll Done
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Validation Warnings ────────────────────────────────────────────────────────

interface ValidationWarning {
  type: "warning" | "error";
  message: string;
}

function useValidationWarnings(steps: ApprovalWorkflowStep[], roles: DynamicRole[]): ValidationWarning[] {
  return useMemo(() => {
    const warnings: ValidationWarning[] = [];
    if (steps.length === 0) return warnings;

    const stageTypes = steps.map((s) => s.stageType);

    // Check: PAYROLL_APPROVAL steps exist when PAYMENT_FILE exists
    if (stageTypes.includes("PAYMENT_FILE") && !stageTypes.includes("PAYROLL_APPROVAL")) {
      warnings.push({
        type: "error",
        message: "Payment File step requires at least one Payroll Approval step before it.",
      });
    }

    // Check: PAYROLL_DOCUMENT steps exist as the first step
    if (steps.length > 0 && !steps.some(s => s.stageType === "PAYROLL_DOCUMENT")) {
      warnings.push({
        type: "warning",
        message: "Consider adding a document review step (PAYROLL_DOCUMENT) as the first step.",
      });
    }

    // Check for duplicate required roles within same stage type
    steps
      .filter((s) => s.isRequired)
      .reduce((acc, s) => {
        const existing = acc.get(s.stageType) ?? [];
        existing.push(s.requiredRoleId);
        acc.set(s.stageType, existing);
        return acc;
      }, new Map<string, number[]>())
      .forEach((roleIds, stage) => {
        const dupes = roleIds.filter((id, i) => roleIds.indexOf(id) !== i);
        if (dupes.length > 0) {
          warnings.push({
            type: "warning",
            message: `Duplicate required role "${roleName(dupes[0], roles)}" in "${stage}" stage. A role can only approve one step per stage.`,
          });
        }
      });

    // Check: steps should have an alternate role if possible
    const singleApproverSteps = steps.filter(
      (s) => s.isRequired && !s.alternateRoleId,
    );
    if (singleApproverSteps.length === steps.filter((s) => s.isRequired).length && steps.length > 1) {
      warnings.push({
        type: "warning",
        message: "No step has an alternate approver. Consider adding alternate roles to prevent approval bottlenecks.",
      });
    }

    return warnings;
  }, [steps, roles]);
}

// ── Step Card ────────────────────────────────────────────────────────────────

interface StepCardProps {
  step: ApprovalWorkflowStep;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  roles: DynamicRole[];
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  roles,
}) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {/* Step Order Badge */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-black text-slate-600">
            {index + 1}
          </div>
          <div className="flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="w-5 h-4 flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              title="Move up"
            >
              <ArrowUp className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="w-5 h-4 flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              title="Move down"
            >
              <ArrowDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Step Details */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
              {stageTypeLabel(step.stageType)}
            </span>
            {step.isRequired ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Required
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                Optional
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-700">
              {roleName(step.requiredRoleId, roles)}
            </span>
            {step.alternateRoleId && (
              <span className="text-[10px] font-bold text-slate-400 ml-1">
                (or {roleName(step.alternateRoleId, roles)})
              </span>
            )}
            <span className="text-slate-300">—</span>
            <span className="text-slate-500 text-xs">
              {step.isRequired
                ? "Blocks final approval if not completed"
                : "Informational — does not block"}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-600"
          title="Edit step"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-50 transition-all text-slate-400 hover:text-rose-500"
          title="Delete step"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);

// ── Add/Edit Step Modal ──────────────────────────────────────────────────────

interface StepFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    stageType: string;
    requiredRoleId: number;
    isRequired: boolean;
    alternateRoleId: number | null;
  }) => void;
  initial?: {
    stageType: string;
    requiredRoleId: number;
    isRequired: boolean;
    alternateRoleId: number | null;
  };
  title: string;
  /** Dynamic role list fetched from the API. */
  roles: DynamicRole[];
}

const StepFormModal: React.FC<StepFormModalProps> = ({
  open,
  onClose,
  onSave,
  initial,
  title,
  roles,
}) => {
  const [stageType, setStageType] = useState(
    initial?.stageType ?? "PAYROLL_APPROVAL",
  );
  const [requiredRoleId, setRequiredRoleId] = useState(
    initial?.requiredRoleId ?? 3,
  );
  const [isRequired, setIsRequired] = useState(initial?.isRequired ?? true);
  const [alternateRoleId, setAlternateRoleId] = useState<number | null>(
    initial?.alternateRoleId ?? null,
  );

  useEffect(() => {
    if (open) {
      setStageType(initial?.stageType ?? "PAYROLL_APPROVAL");
      setRequiredRoleId(initial?.requiredRoleId ?? 3);
      setIsRequired(initial?.isRequired ?? true);
      setAlternateRoleId(initial?.alternateRoleId ?? null);
    }
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-all text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              Stage Type
            </label>
            <select
              value={stageType}
              onChange={(e) => setStageType(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
            >
              {STAGE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              Required Role
            </label>
            <select
              value={requiredRoleId}
              onChange={(e) => setRequiredRoleId(Number(e.target.value))}
              className="w-full px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              Alternate Role (optional)
            </label>
            <select
              value={alternateRoleId ?? ""}
              onChange={(e) =>
                setAlternateRoleId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className="w-full px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
            >
              <option value="">None</option>
              {roles.filter((r) => r.id !== requiredRoleId).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isRequired"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-brand-200"
            />
            <label
              htmlFor="isRequired"
              className="text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Required step — blocks final approval if not completed
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() =>
                onSave({ stageType, requiredRoleId, isRequired, alternateRoleId })
              }
              className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl text-white bg-primary hover:bg-brand-800 shadow-lg shadow-brand-900/10 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              Save Step
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Modal for creating a new role. */
const CreateRoleModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}> = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createRole(name.trim());
      toast.success(`Role "${name.trim()}" created`);
      setName("");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create role");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 border border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800 text-sm">Create Role</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-all text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">
            Role Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HR Generalist"
            className="w-full px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          />
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-primary hover:bg-brand-800 shadow-lg shadow-brand-900/10 transition-all flex items-center gap-2 disabled:opacity-40"
          >
            {creating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Create Role
          </button>
        </div>
      </div>
    </div>
  );
};

/** Modal for renaming an existing role. */
const RenameRoleModal: React.FC<{
  open: boolean;
  role: DynamicRole | null;
  onClose: () => void;
  onRenamed: () => void;
}> = ({ open, role, onClose, onRenamed }) => {
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (role) setName(role.name);
  }, [role]);

  if (!open || !role) return null;

  const handleRename = async () => {
    if (!name.trim()) return;
    setRenaming(true);
    try {
      await updateRole(role.id, { name: name.trim() });
      toast.success(`Role renamed to "${name.trim()}"`);
      onRenamed();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to rename role");
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 border border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800 text-sm">Rename Role</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-all text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">
            Role Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Role name"
            className="w-full px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
          />
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleRename}
            disabled={renaming || !name.trim()}
            className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-primary hover:bg-brand-800 shadow-lg shadow-brand-900/10 transition-all flex items-center gap-2 disabled:opacity-40"
          >
            {renaming ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Pencil className="w-3.5 h-3.5" />
            )}
            Rename
          </button>
        </div>
      </div>
    </div>
  );
};

/** Modal for managing users of a specific role — assign & remove employees. */
const RoleUsersModal: React.FC<{
  open: boolean;
  role: DynamicRole | null;
  onClose: () => void;
}> = ({ open, role, onClose }) => {
  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);

  const loadRoleUsers = useCallback(async (roleId: number) => {
    setLoading(true);
    try {
      const users = await fetchRoleUsers(roleId);
      setRoleUsers(users);
    } catch {
      setRoleUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUnassigned = useCallback(async (roleId: number) => {
    try {
      // Pass the current role ID so employees already in OTHER roles still show up
      const emps = await fetchUnassignedEmployees(roleId);
      setUnassigned(emps);
    } catch {
      setUnassigned([]);
    }
  }, []);

  useEffect(() => {
    if (open && role) {
      loadRoleUsers(role.id);
      loadUnassigned(role.id);
      setSelectedEmployeeId(null);
      setRemovingUserId(null);
    }
  }, [open, role, loadRoleUsers, loadUnassigned]);

  const handleAssign = async () => {
    if (!role || !selectedEmployeeId) return;
    setAssigning(true);
    try {
      await assignUserToRole(role.id, selectedEmployeeId);
      toast.success(`User assigned to "${role.name}"`);
      setSelectedEmployeeId(null);
      await loadRoleUsers(role.id);
      await loadUnassigned(role.id);
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to assign user"));
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (userId: number) => {
    if (!role) return;
    setRemovingUserId(userId);
    try {
      await removeUserFromRole(role.id, userId);
      toast.success("User removed from role");
      await loadRoleUsers(role.id);
      await loadUnassigned(role.id);
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to remove user"));
    } finally {
      setRemovingUserId(null);
    }
  };

  if (!open || !role) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 border border-slate-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">
                Manage Users — {role.name}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                Assign or remove employees from this role
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-all text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Users */}
            <div>
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Assigned Users ({roleUsers.length})
              </h4>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                </div>
              ) : roleUsers.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
                  <User className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium text-slate-400">No users assigned</p>
                  <p className="text-[10px] text-slate-300 mt-1">
                    Assign employees from the panel on the right
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {roleUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">
                            {u.employee
                              ? `${u.employee.firstName} ${u.employee.lastName}`
                              : `User #${u.id}`}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {u.employee?.externalId ?? u.email ?? ""}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(u.id)}
                        disabled={removingUserId === u.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50 transition-all text-slate-400 hover:text-rose-500 disabled:opacity-40 flex-shrink-0"
                        title="Remove from role"
                      >
                        {removingUserId === u.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign Employee */}
            <div>
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                Assign Employee
              </h4>
              {unassigned.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
                  <User className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium text-slate-400">No unassigned employees</p>
                  <p className="text-[10px] text-slate-300 mt-1">
                    All employees already have a role
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedEmployeeId ?? ""}
                    onChange={(e) =>
                      setSelectedEmployeeId(e.target.value || null)
                    }
                    className="w-full px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
                  >
                    <option value="">Select an employee…</option>
                    {unassigned.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.externalId || `#${emp.id}`})
                        {emp.departmentName ? ` — ${emp.departmentName}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={assigning || !selectedEmployeeId}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-xl text-white bg-primary hover:bg-brand-800 shadow-lg shadow-brand-900/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    {assigning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Assign to Role
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────

export const ApprovalWorkflowBuilderPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<ApprovalWorkflowConfig[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null,
  );
  const [roles, setRoles] = useState<DynamicRole[]>(FALLBACK_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(
    roles.length > 0 ? roles[0].id : null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ApprovalWorkflowStep | null>(
    null,
  );

  // Delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Role management states (hoisted from UserManagement)
  const [modalRole, setModalRole] = useState<DynamicRole | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DynamicRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DynamicRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Permission Toggle State (inlined from PermissionEditor) ──
  const [localPerms, setLocalPerms] = useState<Record<string, boolean> | null>(null);
  const [savingPerm, setSavingPerm] = useState<string | null>(null);

  // Reset localPerms when switching roles to prevent stale permission data
  useEffect(() => {
    setLocalPerms(null);
    setSavingPerm(null);
  }, [selectedRoleId]);

  const defaultPerms: Record<string, boolean> = {};
  PERMISSION_GROUPS.forEach((g) =>
    g.keys.forEach((k) => { defaultPerms[k.key] = false; }),
  );

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  const effectivePerms = {
    ...defaultPerms,
    ...(selectedRole?.permissions ?? {}),
    ...(localPerms ?? {})
  };

  const handleToggle = async (key: string) => {
    if (!selectedRole) return;
    const newValue = !effectivePerms[key];
    setLocalPerms((prev) => ({
      ...(prev ?? selectedRole.permissions ?? {}),
      [key]: newValue,
    }));
    setSavingPerm(key);
    try {
      const updated = await updateRolePermissions(selectedRole.id, {
        [key]: newValue,
      });
      if (updated) {
        setLocalPerms(updated.permissions);
        setRoles(
          roles.map((r) =>
            r.id === selectedRole.id
              ? { ...r, permissions: updated.permissions }
              : r,
          ),
        );
      }
      toast.success(`${key.replace(/^can/, "").replace(/([A-Z])/g, " $1").trim()} → ${newValue ? "Enabled" : "Disabled"}`);
    } catch (err: any) {
      setLocalPerms(selectedRole.permissions ?? defaultPerms);
      toast.error(err.message || "Failed to update permission");
    } finally {
      setSavingPerm(null);
    }
  };

  // ── Role Users State ──
  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);

  const loadRoleUsers = useCallback(async (roleId: number) => {
    setUsersLoading(true);
    try {
      const users = await fetchRoleUsers(roleId);
      setRoleUsers(users);
    } catch {
      setRoleUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      loadRoleUsers(selectedRoleId);
      setRoleUsers([]);
    } else {
      setRoleUsers([]);
    }
  }, [selectedRoleId, loadRoleUsers]);

  const handleRemoveUser = async (userId: number) => {
    setRemovingUserId(userId);
    try {
      await removeUserFromRole(selectedRoleId!, userId);
      toast.success("User removed from role");
      await loadRoleUsers(selectedRoleId!);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove user");
    } finally {
      setRemovingUserId(null);
    }
  };

  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  // Dirty state tracking — tracks modifications since last explicit save
  const [dirtyCount, setDirtyCount] = useState(0);
  const [pendingReorder, setPendingReorder] = useState<ApprovalWorkflowStep[] | null>(null);

  const selectedWorkflow = workflows.find(
    (w) => w.id === selectedWorkflowId,
  ) ?? null;

  const sortedSteps = useMemo(
    () =>
      selectedWorkflow
        ? [...selectedWorkflow.steps].sort((a, b) => a.stepOrder - b.stepOrder)
        : [],
    [selectedWorkflow],
  );

  const warnings = useValidationWarnings(sortedSteps, roles);

  // Dirty state: warn before leaving if there are unsaved changes
  useEffect(() => {
    if (dirtyCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyCount]);

  // Track dirty state for step modifications
  const markDirty = useCallback(() => {
    setDirtyCount((c) => c + 1);
  }, []);

  const resetDirty = useCallback(() => {
    setDirtyCount(0);
    setPendingReorder(null);
  }, []);

  const loadRoles = useCallback(async () => {
    const fetched = await fetchRoles();
    if (fetched && fetched.length > 0) {
      setRoles(fetched);
    }
  }, []);

  const handleDeleted = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRole(deleteTarget.id);
      toast.success(`Role "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      loadRoles();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete role");
    } finally {
      setDeleting(false);
    }
  };

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch the active workflow for the user's company (resolved from JWT)
      const wf = await fetchApprovalWorkflow();
      if (wf) {
        setWorkflows([wf]);
        setSelectedWorkflowId(wf.id);
        resetDirty();
      }
    } catch (err) {
      console.error("Failed to load workflows:", err);
    } finally {
      setLoading(false);
    }
  }, [resetDirty]);

  useEffect(() => {
    loadRoles();
    loadWorkflows();
  }, [loadRoles, loadWorkflows]);

  const handleAddStep = () => {
    setEditingStep(null);
    setModalOpen(true);
  };

  const handleEditStep = (step: ApprovalWorkflowStep) => {
    setEditingStep(step);
    setModalOpen(true);
  };

  const handleSaveStep = async (data: {
    stageType: string;
    requiredRoleId: number;
    isRequired: boolean;
    alternateRoleId: number | null;
  }) => {
    if (!selectedWorkflowId) return;
    setSaving(true);
    try {
      if (editingStep) {
        const updated = await updateWorkflowStep(editingStep.id, {
          stageType: data.stageType as any,
          requiredRoleId: data.requiredRoleId,
          isRequired: data.isRequired,
          alternateRoleId: data.alternateRoleId,
        });
        if (updated) {
          toast.success("Step updated successfully");
          setWorkflows((prev) =>
            prev.map((w) => (w.id === selectedWorkflowId ? updated : w)),
          );
          markDirty();
        }
      } else {
        const nextOrder = sortedSteps.length > 0
          ? sortedSteps[sortedSteps.length - 1].stepOrder + 1
          : 1;
        const updated = await addWorkflowStep(selectedWorkflowId, {
          stageType: data.stageType,
          stepOrder: nextOrder,
          requiredRoleId: data.requiredRoleId,
          isRequired: data.isRequired,
          alternateRoleId: data.alternateRoleId,
        });
        if (updated) {
          toast.success("Step added successfully");
          setWorkflows((prev) =>
            prev.map((w) => (w.id === selectedWorkflowId ? updated : w)),
          );
          markDirty();
        }
      }
      setModalOpen(false);
      setEditingStep(null);
    } catch (err: any) {
      toast.error(
        extractErrorMessage(err, "Failed to save step. Check that the workflow API endpoints are available."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async () => {
    if (!deleteTargetId) return;
    setSaving(true);
    try {
      await deleteWorkflowStep(deleteTargetId);
      toast.success("Step removed");
      // Re-fetch to get updated step order
      await loadWorkflows();
      markDirty();
    } catch (err: any) {
      toast.error(
        extractErrorMessage(err, "Failed to delete step"),
      );
    } finally {
      setSaving(false);
      setDeleteTargetId(null);
    }
  };

  const handleMoveStep = async (index: number, direction: -1 | 1) => {
    if (!selectedWorkflow) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sortedSteps.length) return;

    const steps = [...sortedSteps];
    const temp = steps[index].stepOrder;
    steps[index] = { ...steps[index], stepOrder: steps[newIndex].stepOrder };
    steps[newIndex] = { ...steps[newIndex], stepOrder: temp };
    steps.sort((a, b) => a.stepOrder - b.stepOrder);

    // Optimistic local update
    setPendingReorder(steps);

    setSaving(true);
    try {
      // Update both swapped steps
      await updateWorkflowStep(steps[index].id, {
        stepOrder: steps[index].stepOrder,
      });
      await updateWorkflowStep(steps[newIndex].id, {
        stepOrder: steps[newIndex].stepOrder,
      });
      await loadWorkflows();
      markDirty();
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to reorder steps"));
      await loadWorkflows();
    } finally {
      setSaving(false);
      setPendingReorder(null);
    }
  };

  // ── Inline Name Editing ──────────────────────────────────

  const handleStartEditName = () => {
    if (!selectedWorkflow) return;
    setNameDraft(selectedWorkflow.name);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!selectedWorkflow || !nameDraft.trim()) return;
    setSaving(true);
    try {
      const updated = await updateWorkflow(selectedWorkflow.id, {
        name: nameDraft.trim(),
      });
      if (updated) {
        toast.success("Workflow name updated");
        setWorkflows((prev) =>
          prev.map((w) => (w.id === selectedWorkflow.id ? updated : w)),
        );
        resetDirty();
      }
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to update workflow name"));
    } finally {
      setSaving(false);
      setEditingName(false);
    }
  };

  const handleCancelEditName = () => {
    setEditingName(false);
    setNameDraft("");
  };

  // ── Batch Save Order ──────────────────────────────────────

  const handleSaveOrder = async () => {
    if (!selectedWorkflow || !pendingReorder) return;
    setSaving(true);
    try {
      // Save each step's order individually
      for (const step of pendingReorder) {
        const originalStep = selectedWorkflow.steps.find((s) => s.id === step.id);
        if (originalStep && originalStep.stepOrder !== step.stepOrder) {
          await updateWorkflowStep(step.id, { stepOrder: step.stepOrder });
        }
      }
      await loadWorkflows();
      toast.success("Step order saved");
      resetDirty();
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to save step order"));
      await loadWorkflows();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedWorkflow) return;
    setSaving(true);
    try {
      if (selectedWorkflow.isActive) {
        const updated = await deactivateWorkflow(selectedWorkflow.id);
        if (updated) {
          toast.success("Workflow deactivated");
          setWorkflows((prev) =>
            prev.map((w) => (w.id === selectedWorkflow.id ? updated : w)),
          );
        }
      } else {
        const updated = await activateWorkflow(selectedWorkflow.id);
        if (updated) {
          toast.success("Workflow activated");
          setWorkflows((prev) =>
            prev.map((w) => (w.id === selectedWorkflow.id ? updated : w)),
          );
        }
      }
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to toggle workflow status"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!selectedWorkflow) return;
    setSaving(true);
    try {
      const updated = await updateWorkflow(selectedWorkflow.id, {
        name: selectedWorkflow.name,
      });
      if (updated) {
        toast.success("Workflow saved");
        setWorkflows((prev) =>
          prev.map((w) => (w.id === selectedWorkflow.id ? updated : w)),
        );
        resetDirty();
      }
    } catch (err: any) {
      toast.error(
        extractErrorMessage(err, "Failed to save workflow"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-brand-800 rounded-2xl p-6 sm:p-8 text-white">
        <div className="absolute -top-1/2 -right-10 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-1/2 right-20 w-48 h-48 rounded-full bg-white/3" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">
                Approval Workflow Builder
              </h1>
              <p className="text-sm text-emerald-100/80 max-w-2xl">
                Configure approval steps, roles, and requirements
              </p>
            </div>
            <div className="flex items-center gap-2">
              {dirtyCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" /> Unsaved
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Admin Only
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-bold mb-1">⚠️ Changes affect pending requests immediately</p>
          <p className="text-amber-700">
            Adding, removing, or reordering steps takes effect on all currently
            pending approval requests. Only one workflow can be active per company.
          </p>
        </div>
      </div>

      {/* Workflow Selector + Inline Name */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            Workflow
          </label>
          <select
            value={selectedWorkflowId ?? ""}
            onChange={(e) => setSelectedWorkflowId(e.target.value || null)}
            className="w-full px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl"
          >
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.name} {wf.isActive ? "(Active)" : "(Inactive)"}
              </option>
            ))}
            {workflows.length === 0 && (
              <option value="">No workflows configured</option>
            )}
          </select>
        </div>

        {selectedWorkflow && (
          <>
            {/* Inline Workflow Name Editor */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Workflow Name
              </label>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") handleCancelEditName();
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
                    autoFocus
                    placeholder="Workflow name"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving || !nameDraft.trim()}
                    className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center disabled:opacity-40 transition-all"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={handleCancelEditName}
                    className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-400 flex items-center justify-center transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={handleStartEditName}
                  className="w-full px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all group"
                >
                  <span>{selectedWorkflow.name}</span>
                  <Pencil className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all flex-shrink-0" />
                </div>
              )}
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handleToggleActive}
                disabled={saving}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
                  selectedWorkflow.isActive
                    ? "text-rose-600 border border-rose-200 hover:bg-rose-50"
                    : "text-emerald-600 border border-brand-200 hover:bg-brand-50",
                )}
              >
                {selectedWorkflow.isActive ? (
                  <>
                    <PowerOff className="w-3.5 h-3.5" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5" />
                    Activate
                  </>
                )}
              </button>
              <button
                onClick={handleSaveWorkflow}
                disabled={saving || dirtyCount === 0}
                className="px-4 py-2.5 text-xs font-bold rounded-xl text-white bg-primary hover:bg-brand-800 shadow-lg shadow-brand-900/10 transition-all flex items-center gap-2 disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </div>
          </>
        )}
      </div>

      {/* Pipeline Visualization */}
      {selectedWorkflow && sortedSteps.length > 0 && (
        <PipelineVisualization steps={sortedSteps} roles={roles} />
      )}

      {/* Validation Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl p-4 flex items-start gap-3 border",
                w.type === "error"
                  ? "bg-rose-50 border-rose-200"
                  : w.type === "warning"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-blue-50 border-blue-200",
              )}
            >
              {w.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              ) : w.type === "warning" ? (
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={cn(
                  "text-xs font-semibold",
                  w.type === "error"
                    ? "text-rose-700"
                    : w.type === "warning"
                      ? "text-amber-700"
                      : "text-blue-700",
                )}
              >
                {w.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Left Panel — Roles & Right Panel (placeholder) */}
      {selectedWorkflow && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel — Roles */}
          <div className="w-full lg:w-[340px] flex-shrink-0">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden sticky top-0 self-start max-h-[calc(100vh-12rem)] flex flex-col">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-brand-50/50 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Roles
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-brand-100 text-emerald-700">
                      {roles.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="px-3 py-1.5 text-[10px] font-bold rounded-xl text-white bg-primary hover:bg-brand-800 shadow-lg shadow-brand-900/10 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    Create Role
                  </button>
                </div>
              </div>

              {/* Role Cards */}
              <div className="p-4 overflow-y-auto flex-1 space-y-2">
                {roles.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={cn(
                      "relative group p-3 rounded-xl border transition-all cursor-pointer",
                      selectedRoleId === r.id
                        ? "border-brand-300 bg-brand-50/50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/30",
                    )}
                  >
                    {/* Hover actions: rename & delete */}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenameTarget(r); }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center bg-white border border-slate-200 shadow-sm hover:bg-brand-50 hover:border-brand-300 transition-all text-slate-400 hover:text-emerald-600"
                        title="Rename role"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center bg-white border border-slate-200 shadow-sm hover:bg-rose-50 hover:border-rose-300 transition-all text-slate-400 hover:text-rose-500"
                        title="Delete role"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldCheck className={cn(
                          "w-4 h-4 flex-shrink-0",
                          selectedRoleId === r.id ? "text-emerald-600" : "text-slate-400",
                        )} />
                        <p className={cn(
                          "text-sm font-bold truncate",
                          selectedRoleId === r.id ? "text-emerald-800" : "text-slate-700",
                        )}>
                          {r.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setModalRole(r); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-brand-100 transition-all text-slate-400 hover:text-emerald-600"
                          title="Manage users"
                        >
                          <User className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel — Permissions + Users */}
          <div className="flex-1 min-w-0">
            {!selectedRole ? (
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-12 text-center">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-medium text-slate-400">Select a role to view its permissions and members</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Permissions Section */}
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-brand-50/50 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                          Permissions — {selectedRole.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Toggle capabilities for this role
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-5">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.label}>
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">
                          {group.label}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {group.keys.map((perm) => (
                            <button
                              key={perm.key}
                              onClick={() => handleToggle(perm.key)}
                              disabled={savingPerm === perm.key}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all text-xs font-bold",
                                effectivePerms[perm.key]
                                  ? "bg-brand-50 border-brand-200 text-emerald-700 hover:bg-brand-100"
                                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300",
                              )}
                            >
                              {savingPerm === perm.key ? (
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                              ) : (
                                <div className={cn(
                                  "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                                  effectivePerms[perm.key]
                                    ? "bg-emerald-500 border-brand-500"
                                    : "border-slate-300",
                                )}>
                                  {effectivePerms[perm.key] && (
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                  )}
                                </div>
                              )}
                              {perm.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users Section */}
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-brand-50/50 to-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                          <User className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                            Users ({roleUsers.length})
                          </h3>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            Employees assigned to this role
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setModalRole(selectedRole)}
                        className="px-3 py-1.5 text-[10px] font-bold rounded-xl text-emerald-600 border border-brand-200 hover:bg-brand-50 transition-all flex items-center gap-1.5"
                      >
                        <User className="w-3 h-3" />
                        Assign Employee
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    {usersLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                      </div>
                    ) : roleUsers.length === 0 ? (
                      <div className="text-center py-8">
                        <User className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                        <p className="text-sm font-medium text-slate-400">No users assigned</p>
                        <button
                          onClick={() => setModalRole(selectedRole)}
                          className="mt-3 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-all"
                        >
                          + Assign an employee
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {roleUsers.map((ru) => (
                          <div
                            key={ru.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-emerald-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-700 truncate">
                                  {ru.employee ? `${ru.employee.firstName} ${ru.employee.lastName}` : `User #${ru.id}`}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  ID: {ru.employee?.externalId || `#${ru.id}`}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveUser(ru.id)}
                              disabled={removingUserId === ru.id}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50 transition-all text-slate-400 hover:text-rose-500 disabled:opacity-40 flex-shrink-0"
                              title="Remove user"
                            >
                              {removingUserId === ru.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Steps List */}
      {selectedWorkflow && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Steps ({sortedSteps.length})
            </h2>
            <div className="flex items-center gap-2">
              {pendingReorder && (
                <button
                  onClick={handleSaveOrder}
                  disabled={saving}
                  className="px-3 py-2 text-xs font-bold rounded-xl text-amber-600 border border-amber-200 hover:bg-amber-50 transition-all flex items-center gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Save Order
                </button>
              )}
              <button
                onClick={handleAddStep}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-primary hover:bg-brand-800 shadow-lg shadow-brand-900/10 transition-all flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Step
              </button>
            </div>
          </div>

          {sortedSteps.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
              <Settings2 className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">
                No steps configured yet
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Add your first approval step to define the workflow
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(pendingReorder ?? sortedSteps).map((step, index) => {
                const steps = pendingReorder ?? sortedSteps;
                return (
                  <StepCard
                    key={step.id}
                    step={step as ApprovalWorkflowStep}
                    index={index}
                    total={steps.length}
                    roles={roles}
                    onMoveUp={() => handleMoveStep(index, -1)}
                    onMoveDown={() => handleMoveStep(index, 1)}
                    onEdit={() => handleEditStep(step as ApprovalWorkflowStep)}
                    onDelete={() => setDeleteTargetId(step.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* No workflow selected */}
      {!selectedWorkflow && workflows.length === 0 && !loading && (
        <div className="text-center py-24 bg-white border border-slate-200 rounded-3xl">
          <Settings2 className="w-16 h-16 mx-auto mb-4 text-slate-200" />
          <p className="text-lg font-bold text-slate-400">
            No workflows found
          </p>
          <p className="text-sm text-slate-300 mt-1">
            Workflows are configured in the database. Contact development team to
            seed an initial workflow.
          </p>
        </div>
      )}

      {/* Add/Edit Step Modal */}
      <StepFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingStep(null);
        }}
        onSave={handleSaveStep}
        roles={roles}
        initial={
          editingStep
            ? {
                stageType: editingStep.stageType,
                requiredRoleId: editingStep.requiredRoleId,
                isRequired: editingStep.isRequired,
                alternateRoleId: editingStep.alternateRoleId ?? null,
              }
            : undefined
        }
        title={editingStep ? "Edit Step" : "Add Step"}
      />

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setDeleteTargetId(null)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  Delete Step
                </h3>
                <p className="text-xs text-slate-500">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Removing this step affects all currently pending approval requests.
              Are you sure?
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteStep}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2.5 text-xs font-bold rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role modals (hoisted from UserManagement) */}
      <RoleUsersModal
        open={!!modalRole}
        role={modalRole}
        onClose={() => setModalRole(null)}
      />

      <CreateRoleModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => loadRoles()}
      />

      <RenameRoleModal
        open={!!renameTarget}
        role={renameTarget}
        onClose={() => setRenameTarget(null)}
        onRenamed={() => loadRoles()}
      />

      {/* Delete Role confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Delete Role</h3>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-1">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            </p>
            <p className="text-[11px] text-slate-400 mb-6">
              Users assigned to this role will be unassigned. If this role is used in any workflow step, deletion will be blocked.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleted}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-900/10 transition-all flex items-center gap-2 disabled:opacity-40"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
};
