/**
 * Approval Workflow Types
 * 3-stage pipeline: Attendance Import → Payroll Run → Payment Approval
 */

// ── Pipeline Stage ──────────────────────────────────────────────────────────

export type PipelineStageStatus = 'completed' | 'active' | 'locked';

export interface PipelineStage {
  id: number;
  label: string;
  status: PipelineStageStatus;
}

// ── Stage 1: Attendance Import ──────────────────────────────────────────────

export interface AttendanceImportSummary {
  importId: string;
  fileName: string;
  importedAt: string;
  periodName: string;
  periodStart: string;
  periodEnd: string;
  totalEmployees: number;
  totalRecords: number;
  isActive: boolean;
  processedAt: string | null;
  // Summary stats
  regularHours: number;
  absentDays: number;
  paidLeaveDays: number;
  actualDays: number;
  // OT breakdown
  otWeekdayDay: number;
  otWeekdayNight: number;
  otWeekend: number;
  otHoliday: number;
  // Flags
  employeesWithNoAttendance: number;
  importErrors: { row: number; message: string }[];
  summaryCalculated: boolean;
  otCalculated: boolean;
}

// ── Stage 2: Payroll Run ────────────────────────────────────────────────────

export interface PayrollRunSummary {
  runId: string;
  status: string;
  createdAt: string;
  createdBy: number;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalPension: number;
  totalOvertime: number;
  totalCostToCompany: number;
  // Flags
  deductionCapBreached: number;
  midMonthHires: number;
  actingCapHits: number;
  leaveSynced: boolean;
  // Period info
  periodName: string;
  periodStart: string;
  periodEnd: string;
}

// ── Stage 3: Payment Approval ───────────────────────────────────────────────

export interface PaymentApprovalSummary {
  runId: string;
  status: string;
  employeeCount: number;
  totalNet: number;
  totalTax: number;
  totalPension: number;
  employerPension: number;
  totalCostToCompany: number;
  // Flags
  deductionCapBreached: number;
  actingCapHits: number;
  leaveSynced: boolean;
}

// ── Flags ───────────────────────────────────────────────────────────────────

export interface PipelineFlag {
  type: 'warning' | 'info' | 'error';
  message: string;
}

// ── Approval Workflow Config (Builder) ───────────────────────────────────────

export interface ApprovalWorkflowConfig {
  id: string;
  name: string;
  companyId: string;
  isActive: boolean;
  steps: ApprovalWorkflowStep[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApprovalWorkflowStep {
  id: string;
  stageType: 'PAYROLL_APPROVAL' | 'PAYMENT_FILE' | 'ATTENDANCE' | 'PAYROLL_BATCH' | 'PAYROLL_DOCUMENT';
  stepOrder: number;
  requiredRoleId: number;
  requiredRole: { id: number; name: string };
  alternateRoleId?: number | null;
  alternateRoleName?: string;
  isRequired: boolean;
}

// ── Role ────────────────────────────────────────────────────────────────────

/** Legacy role enum — kept for backward compatibility with fallback code.
 *  New roles added in the DB will use their name as the key (uppercased with underscores). */
export type UserRole = 'HR_OFFICER' | 'HR_MANAGER' | 'PAYROLL_OFFICER' | 'FINANCE_MANAGER' | 'FINANCE_OFFICER' | 'DEPARTMENT_MANAGER' | 'ADMIN';

/** Fallback labels for known roles when the API is unavailable. */
export const ROLE_LABELS: Record<string, string> = {
  HR_OFFICER: 'HR Officer',
  HR_MANAGER: 'HR Manager',
  PAYROLL_OFFICER: 'Payroll Officer',
  FINANCE_MANAGER: 'Finance Manager',
  FINANCE_OFFICER: 'Finance Officer',
  DEPARTMENT_MANAGER: 'Department Manager',
  ADMIN: 'Admin',
};

export interface RolePermissions {
  canActivateImport: boolean;
  canCalculateOt: boolean;
  canCalculateSummary: boolean;
  canApproveImport: boolean;
  canRunPayroll: boolean;
  canSyncLeave: boolean;
  canReRunEmployee: boolean;
  canSubmitForApproval: boolean;
  canSubmitPayroll: boolean;
  canApproveRun: boolean;
  canRejectRun: boolean;
  canSubmitPaymentFile: boolean;
  /** Approve / reject the payment file (Stage 3) */
  canApprovePayment: boolean;
  canRejectPayment: boolean;
  canViewEmployeeDetail: boolean;
  /** Approve / reject the attendance import (Stage 1) */
  canApproveAttendance: boolean;
  canRejectAttendance: boolean;
}

/** Default/fallback permission matrix when the API is unavailable.
 *  Dynamically-fetched permissions from the backend will override these. */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  HR_OFFICER: {
    canActivateImport: true,
    canCalculateOt: true,
    canCalculateSummary: true,
    canApproveImport: true,
    canRunPayroll: false,
    canSyncLeave: true,
    canReRunEmployee: true,
    canSubmitForApproval: true,
    canSubmitPayroll: true,
    canApproveRun: false,
    canRejectRun: false,
    canSubmitPaymentFile: false,
    canApprovePayment: false,
    canRejectPayment: false,
    canViewEmployeeDetail: true,
    canApproveAttendance: false,
    canRejectAttendance: false,
  },
  PAYROLL_OFFICER: {
    canActivateImport: false,
    canCalculateOt: true,
    canCalculateSummary: true,
    canApproveImport: false,
    canRunPayroll: true,
    canSyncLeave: true,
    canReRunEmployee: true,
    canSubmitForApproval: true,
    canSubmitPayroll: true,
    canApproveRun: false,
    canRejectRun: false,
    canSubmitPaymentFile: false,
    canApprovePayment: false,
    canRejectPayment: false,
    canViewEmployeeDetail: true,
    canApproveAttendance: false,
    canRejectAttendance: false,
  },
  FINANCE_MANAGER: {
    canActivateImport: false,
    canCalculateOt: false,
    canCalculateSummary: false,
    canApproveImport: false,
    canRunPayroll: false,
    canSyncLeave: false,
    canReRunEmployee: false,
    canSubmitForApproval: false,
    canSubmitPayroll: false,
    canApproveRun: true,
    canRejectRun: true,
    canSubmitPaymentFile: false,
    canApprovePayment: true,
    canRejectPayment: true,
    canViewEmployeeDetail: true,
    canApproveAttendance: false,
    canRejectAttendance: false,
  },
  DEPARTMENT_MANAGER: {
    canActivateImport: false,
    canCalculateOt: false,
    canCalculateSummary: false,
    canApproveImport: false,
    canRunPayroll: false,
    canSyncLeave: false,
    canReRunEmployee: false,
    canSubmitForApproval: false,
    canSubmitPayroll: false,
    canApproveRun: false,
    canRejectRun: false,
    canSubmitPaymentFile: false,
    canApprovePayment: false,
    canRejectPayment: false,
    canViewEmployeeDetail: true,
    canApproveAttendance: true,
    canRejectAttendance: true,
  },
  FINANCE_OFFICER: {
    canActivateImport: false,
    canCalculateOt: false,
    canCalculateSummary: false,
    canApproveImport: false,
    canRunPayroll: false,
    canSyncLeave: false,
    canReRunEmployee: false,
    canSubmitForApproval: false,
    canSubmitPayroll: false,
    canApproveRun: true,
    canRejectRun: true,
    canSubmitPaymentFile: true,
    canApprovePayment: false,
    canRejectPayment: false,
    canViewEmployeeDetail: true,
    canApproveAttendance: false,
    canRejectAttendance: false,
  },
  HR_MANAGER: {
    canActivateImport: false,
    canCalculateOt: false,
    canCalculateSummary: false,
    canApproveImport: false,
    canRunPayroll: false,
    canSyncLeave: false,
    canReRunEmployee: false,
    canSubmitForApproval: false,
    canSubmitPayroll: true,
    canApproveRun: true,
    canRejectRun: true,
    canSubmitPaymentFile: false,
    canApprovePayment: false,
    canRejectPayment: false,
    canViewEmployeeDetail: true,
    canApproveAttendance: true,
    canRejectAttendance: true,
  },
  ADMIN: {
    canActivateImport: true,
    canCalculateOt: true,
    canCalculateSummary: true,
    canApproveImport: true,
    canRunPayroll: true,
    canSyncLeave: true,
    canReRunEmployee: true,
    canSubmitForApproval: true,
    canSubmitPayroll: true,
    canApproveRun: true,
    canRejectRun: true,
    canSubmitPaymentFile: true,
    canApprovePayment: true,
    canRejectPayment: true,
    canViewEmployeeDetail: true,
    canApproveAttendance: true,
    canRejectAttendance: true,
  },
};
