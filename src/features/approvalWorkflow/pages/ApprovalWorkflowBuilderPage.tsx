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
  { id: 13, name: "HR Officer", permissions: null },
  { id: 14, name: "HR Manager", permissions: null },
  { id: 15, name: "Finance Officer", permissions: null },
  { id: 16, name: "Finance Manager", permissions: null },
  { id: 7, name: "HR", permissions: null },
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
    PAYROLL_APPROVAL: "bg-blue-500",
    PAYMENT_FILE: "bg-emerald-500",
    ATTENDANCE: "bg-amber-500",
    PAYROLL_DOCUMENT: "bg-violet-500",
    PAYROLL_BATCH: "bg-slate-500",
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
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
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
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center border-2 border-emerald-200">
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
        type: "info",
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
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 flex items-center gap-1">
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
              className="w-full px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
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
              className="w-full px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
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
              className="w-full px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
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
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
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
              className="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl text-white bg-[#047857] hover:bg-[#036246] shadow-lg shadow-emerald-900/10 transition-all flex items-center justify-center gap-2"
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
};// ── Permission Editor Component ────────────────────────────────────────────

interface PermissionEditorProps {
  roles: DynamicRole[];
  onRolesUpdated: (roles: DynamicRole[]) => void;
}

const PermissionEditor: React.FC<PermissionEditorProps> = ({
  roles,
  onRolesUpdated,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(
    roles.length > 0 ? roles[0].id : null,
  );
  const [localPerms, setLocalPerms] = useState<Record<string, boolean> | null>(
    null,
  );
  const [savingPerm, setSavingPerm] = useState<string | null>(null);

  // Build a fallback permissions object with all known keys set to false
  const defaultPerms: Record<string, boolean> = {};
  PERMISSION_GROUPS.forEach((g) =>
    g.keys.forEach((k) => {
      defaultPerms[k.key] = false;
    }),
  );

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;
  const effectivePerms =
    localPerms ?? selectedRole?.permissions ?? defaultPerms;

  const handleToggle = async (key: string) => {
    if (!selectedRole) return;

    const newValue = !effectivePerms[key];
    // Optimistic update
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
        // Sync local state with server response
        setLocalPerms(updated.permissions);
        // Also update the roles list so other components reflect the change
        onRolesUpdated(
          roles.map((r) =>
            r.id === selectedRole.id
              ? { ...r, permissions: updated.permissions }
              : r,
          ),
        );
      }
      toast.success(`${key.replace(/^can/, "").replace(/([A-Z])/g, " $1").trim()} → ${newValue ? "✅ Enabled" : "❌ Disabled"}`);
    } catch (err: any) {
      // Revert optimistic update on failure
      setLocalPerms(selectedRole.permissions ?? defaultPerms);
      toast.error(extractErrorMessage(err, "Failed to update permission"));
    } finally {
      setSavingPerm(null);
    }
  };

  if (roles.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl">
        <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-200" />
        <p className="text-sm font-medium text-slate-400">No roles available</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 uppercase tracking-wider text-sm">
                Role Permissions
              </h3>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                Each role's capabilities in the payroll pipeline
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Admin Only
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* Role Summary Cards */}
        <div className="mb-6">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 block">
            Role Overview
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {roles.map((r) => {
              const perms = r.permissions as Record<string, boolean> | null;
              const totalKeys = PERMISSION_GROUPS.flatMap((g) => g.keys).length;
              const enabledCount = perms
                ? Object.entries(perms).filter(([, v]) => v === true).length
                : 0;
              const isSelected = r.id === selectedRoleId;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRoleId(r.id);
                    setLocalPerms(null);
                  }}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    isSelected
                      ? "bg-indigo-50 border-indigo-200 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm",
                  )}
                >
                  <p className="text-[11px] font-bold text-slate-800 truncate">
                    {r.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={cn(
                        "text-[10px] font-extrabold",
                        enabledCount > totalKeys / 2
                          ? "text-emerald-600"
                          : "text-slate-400",
                      )}
                    >
                      {enabledCount}/{totalKeys}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[40px]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          enabledCount === 0
                            ? "bg-slate-200"
                            : enabledCount > totalKeys / 2
                              ? "bg-emerald-400"
                              : "bg-amber-400",
                        )}
                        style={{
                          width: `${(enabledCount / totalKeys) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 block">
            Selected Role
          </label>
          <select
            value={selectedRoleId ?? ""}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              setSelectedRoleId(id);
              setLocalPerms(null); // reset local edits when switching roles
            }}
            className="w-full max-w-xs px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {selectedRole && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PERMISSION_GROUPS.map((group) => {
              const groupPerms = group.keys.filter((k) =>
                k.key in effectivePerms,
              );
              if (groupPerms.length === 0) return null;

              return (
                <div
                  key={group.label}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-100"
                >
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                    {group.label}
                  </h4>
                  <div className="space-y-2">
                    {groupPerms.map(({ key, label }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-semibold text-slate-700">
                          {label}
                        </span>
                        <button
                          onClick={() => handleToggle(key)}
                          disabled={savingPerm === key}
                          className={cn(
                            "relative w-10 h-5 rounded-full transition-all flex items-center flex-shrink-0",
                            effectivePerms[key]
                              ? "bg-emerald-500"
                              : "bg-slate-300",
                            savingPerm === key && "opacity-60",
                          )}
                        >
                          <span
                            className={cn(
                              "block w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all mx-0.5",
                              effectivePerms[key]
                                ? "translate-x-[18px]"
                                : "translate-x-0",
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ApprovalWorkflowStep | null>(
    null,
  );

  // Delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Approval Workflow Builder
          </h1>
          <p className="text-slate-500 text-sm">
            Configure approval steps, roles, and requirements
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Dirty state indicator */}
          {dirtyCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 flex items-center gap-1 animate-pulse">
              <AlertCircle className="w-3 h-3" /> Unsaved
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Admin Only
          </span>
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
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
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
                    : "text-emerald-600 border border-emerald-200 hover:bg-emerald-50",
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
                className="px-4 py-2.5 text-xs font-bold rounded-xl text-white bg-[#047857] hover:bg-[#036246] shadow-lg shadow-emerald-900/10 transition-all flex items-center gap-2 disabled:opacity-40"
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
                className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-[#047857] hover:bg-[#036246] shadow-lg shadow-emerald-900/10 transition-all flex items-center gap-2"
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

      {/* Role Permissions Editor */}
      {selectedWorkflow && (
        <PermissionEditor roles={roles} onRolesUpdated={setRoles} />
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
    </div>
    </ErrorBoundary>
  );
};
