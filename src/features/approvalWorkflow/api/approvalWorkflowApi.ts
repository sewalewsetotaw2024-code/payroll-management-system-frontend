import axios from "axios";
import { tokenStorage } from "../../../lib/token";
import type {
  AttendanceImportSummary,
  PayrollRunSummary,
  PaymentApprovalSummary,
  PipelineFlag,
} from "../types/approvalWorkflow.types";

// Timeout ensures requests don't hang indefinitely when the backend is unavailable.
const API_TIMEOUT = 10000; // 10 seconds
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://payroll-management-system-backend-d2y9.onrender.com/api/v1";

const attendanceAxios = axios.create({ baseURL: `${API_BASE_URL}/attendance`, timeout: API_TIMEOUT });
const payrollAxios = axios.create({ baseURL: `${API_BASE_URL}/payroll`, timeout: API_TIMEOUT });
const approvalAxios = axios.create({ baseURL: `${API_BASE_URL}/approval`, timeout: API_TIMEOUT });

[attendanceAxios, payrollAxios, approvalAxios].forEach((instance) => {
  instance.interceptors.request.use((config) => {
    const token = tokenStorage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const safeNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ── Stage 1: Attendance Import ──────────────────────────────────────────────

export async function fetchAttendanceImportSummary(
  importId: string,
): Promise<AttendanceImportSummary> {
  const { data: importRes } = await attendanceAxios.get(`/imports/${importId}`);
  const importData = importRes.data;

  // Fetch OT results
  let otData: any = null;
  try {
    const { data: otRes } = await attendanceAxios.get(
      `/imports/${importId}/overtime`,
    );
    otData = otRes.data;
  } catch {
    // OT not calculated yet
  }

  // Fetch period summary
  let summaryData: any = null;
  try {
    const { data: sumRes } = await attendanceAxios.get(
      `/imports/${importId}/summary`,
    );
    summaryData = sumRes.data;
  } catch {
    // Summary not calculated yet
  }

  const periodSummaries = importData.attendancePeriodSummaries || [];
  const otCategoryMap: Record<string, number> = {};
  if (otData?.byCategory) {
    otData.byCategory.forEach((c: any) => {
      otCategoryMap[c.category] = safeNum(c.totalHours);
    });
  }

  const employeesWithNoAttendance = periodSummaries.filter(
    (s: any) => safeNum(s.actualDays) === 0 && safeNum(s.absenceHours) > 0,
  ).length;

  return {
    importId: importData.id,
    fileName: importData.fileReference || importData.source || "Unknown",
    importedAt: importData.importedAt,
    periodName: importData.payrollPeriod?.name || "",
    periodStart: importData.payrollPeriod?.startDate || "",
    periodEnd: importData.payrollPeriod?.endDate || "",
    totalEmployees: importData.totalEmployees || 0,
    totalRecords: importData.totalRecords || 0,
    isActive: importData.isActive || false,
    processedAt: importData.processedAt || null,
    regularHours: periodSummaries.reduce(
      (sum: number, s: any) => sum + safeNum(s.regularHours),
      0,
    ),
    absentDays: periodSummaries.reduce(
      (sum: number, s: any) => sum + safeNum(s.absentDays),
      0,
    ),
    paidLeaveDays: periodSummaries.reduce(
      (sum: number, s: any) => sum + safeNum(s.paidLeaveDays),
      0,
    ),
    actualDays: periodSummaries.reduce(
      (sum: number, s: any) => sum + safeNum(s.actualDays),
      0,
    ),
    otWeekdayDay: otCategoryMap["WEEKDAY_DAY"] || 0,
    otWeekdayNight: otCategoryMap["WEEKDAY_NIGHT"] || 0,
    otWeekend: otCategoryMap["WEEKEND"] || 0,
    otHoliday: otCategoryMap["PUBLIC_HOLIDAY"] || 0,
    employeesWithNoAttendance,
    importErrors: importData.errorDetails
      ? JSON.parse(
          typeof importData.errorDetails === "string"
            ? importData.errorDetails
            : "[]",
        )
      : [],
    summaryCalculated: !!summaryData,
    otCalculated: !!otData,
  };
}

// ── Stage 2: Payroll Run ────────────────────────────────────────────────────

export async function fetchPayrollRunSummary(
  runId: string,
): Promise<PayrollRunSummary> {
  const runRes = await payrollAxios.get(`/runs/${runId}`);
  const run = runRes.data?.data;

  // Fetch items to count flags
  const itemsRes = await payrollAxios.get(`/runs/${runId}/items`, {
    params: { page: 1, limit: 1000 },
  });
  const items = itemsRes.data?.data?.items || itemsRes.data?.data || [];

  const deductionCapBreached = items.filter(
    (i: any) => i.deductionCapBreached,
  ).length;
  const midMonthHires = items.filter((i: any) => i.isMidMonthHire).length;

  return {
    runId: run.id,
    status: run.status,
    createdAt: run.createdAt,
    createdBy: run.createdBy,
    employeeCount: run.employeeCount || items.length,
    totalGross: safeNum(run.totalGross),
    totalNet: safeNum(run.totalNet),
    totalTax: safeNum(run.totalTax),
    totalPension: safeNum(run.totalPension),
    totalOvertime: safeNum(run.totalOvertime),
    totalCostToCompany: safeNum(run.totalCostToCompany),
    deductionCapBreached,
    midMonthHires,
    actingCapHits: 0, // TODO: compute from acting allowance data
    leaveSynced: false, // TODO: check leave sync status
    periodName: run.payrollPeriod?.name || "",
    periodStart: run.payrollPeriod?.startDate || "",
    periodEnd: run.payrollPeriod?.endDate || "",
  };
}

// ── Stage 3: Payment Approval ───────────────────────────────────────────────

export async function fetchPaymentApprovalSummary(
  runId: string,
): Promise<PaymentApprovalSummary> {
  const { data: runRes } = await payrollAxios.get(`/runs/${runId}`);
  const run = runRes.data;

  const employerPension =
    safeNum(run.totalCostToCompany) - safeNum(run.totalGross);

  return {
    runId: run.id,
    status: run.status,
    employeeCount: run.employeeCount || 0,
    totalNet: safeNum(run.totalNet),
    totalTax: safeNum(run.totalTax),
    totalPension: safeNum(run.totalPension),
    employerPension: Math.max(0, employerPension),
    totalCostToCompany: safeNum(run.totalCostToCompany),
    deductionCapBreached: 0,
    actingCapHits: 0,
    leaveSynced: false,
  };
}

// ── Flags ───────────────────────────────────────────────────────────────────

export function computePipelineFlags(
  attendance: AttendanceImportSummary | null,
  payrollRun: PayrollRunSummary | null,
  payment: PaymentApprovalSummary | null,
): PipelineFlag[] {
  const flags: PipelineFlag[] = [];

  if (attendance) {
    if (!attendance.otCalculated) {
      flags.push({
        type: "warning",
        message: "OT has not been calculated for this import",
      });
    }
    if (!attendance.summaryCalculated) {
      flags.push({
        type: "warning",
        message: "Attendance summary has not been calculated",
      });
    }
    if (attendance.employeesWithNoAttendance > 0) {
      flags.push({
        type: "error",
        message: `${attendance.employeesWithNoAttendance} employees have no attendance data — will be excluded from payroll`,
      });
    }
    if (attendance.processedAt) {
      flags.push({
        type: "info",
        message: `Import already processed on ${new Date(attendance.processedAt).toLocaleDateString()}`,
      });
    }
  }

  if (payrollRun) {
    if (payrollRun.deductionCapBreached > 0) {
      flags.push({
        type: "warning",
        message: `${payrollRun.deductionCapBreached} employees have deduction cap breached (deductions > basic/3)`,
      });
    }
    if (payrollRun.midMonthHires > 0) {
      flags.push({
        type: "info",
        message: `${payrollRun.midMonthHires} mid-month hires included in this run`,
      });
    }
    if (payrollRun.actingCapHits > 0) {
      flags.push({
        type: "warning",
        message: `${payrollRun.actingCapHits} employees have acting allowance at 6-month cap`,
      });
    }
    if (!payrollRun.leaveSynced) {
      flags.push({
        type: "warning",
        message: "Leave sync has not been performed",
      });
    }
  }

  if (payment) {
    if (!payment.leaveSynced) {
      flags.push({
        type: "warning",
        message: "Leave deductions have not been synced",
      });
    }
  }

  return flags;
}

// ── Dynamic Roles API ───────────────────────────────────────────────────────

const rolesAxios = axios.create({ baseURL: `${API_BASE_URL}/roles`, timeout: API_TIMEOUT });
rolesAxios.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface DynamicRole {
  id: number;
  name: string;
  permissions: Record<string, boolean> | null;
}

/**
 * Fetches all roles from the backend (dynamic replacement for hardcoded ROLES array).
 * Falls back to null if the API is unavailable.
 */
export async function fetchRoles(): Promise<DynamicRole[] | null> {
  try {
    const res = await rolesAxios.get("/");
    return res.data?.data || null;
  } catch {
    return null;
  }
}

/**
 * Fetches the role permissions map from the backend.
 * Returns a map like { "HR_MANAGER": { canActivateImport: false, ... }, "ADMIN": { ... } }
 * Falls back to null if the API is unavailable.
 */
export async function fetchRolePermissions(): Promise<Record<string, any> | null> {
  try {
    const res = await rolesAxios.get("/permissions");
    return res.data?.data || null;
  } catch {
    return null;
  }
}

/**
 * Fetches the role labels map from the backend.
 * Returns a map like { "HR_MANAGER": "HR Manager", "FINANCE_MANAGER": "Finance Manager" }
 * Falls back to null if the API is unavailable.
 */
export async function fetchRoleLabels(): Promise<Record<string, string> | null> {
  try {
    const res = await rolesAxios.get("/labels");
    return res.data?.data || null;
  } catch {
    return null;
  }
}

/**
 * Updates the permissions for a specific role via PATCH /roles/:roleId/permissions.
 * Sends a partial permissions object; only the provided keys are updated.
 * Returns the updated role with merged permissions on success.
 */
export async function updateRolePermissions(
  roleId: number,
  permissions: Record<string, boolean>,
): Promise<{ id: number; name: string; permissions: Record<string, boolean> } | null> {
  try {
    const res = await rolesAxios.patch(`/${roleId}/permissions`, permissions);
    return res.data?.data || null;
  } catch (err: any) {
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Failed to update role permissions";
    throw new Error(message);
  }
}

// ── Approval Workflow API ────────────────────────────────────────────────────

export interface ApprovalWorkflowConfig {
  id: string;
  name: string;
  companyId?: string;
  isActive?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  steps: {
    id: string;
    stageType: string;
    stepOrder: number;
    requiredRoleId: number;
    isRequired: boolean;
    requiredRole: { id: number; name: string };
  }[];
}

export interface ApprovalRequestData {
  id: string;
  stageType: string;
  referenceType: string;
  status: string;
  requestedBy: string;
  requestedAt: string;
  resolvedAt: string | null;
  payrollRunId: string | null;
  attendanceImportId: string | null;
  approvalActions?: {
    id: string;
    actor?: { role?: { name?: string } };
    action: string;
    actedAt: string;
    comment?: string | null;
  }[];
}

export async function fetchApprovalWorkflow(): Promise<ApprovalWorkflowConfig | null> {
  try {
    const res = await approvalAxios.get("/workflow");
    return res.data?.data || null;
  } catch {
    return null;
  }
}

export async function fetchApprovalStatus(params: {
  payrollRunId?: string;
  attendanceImportId?: string;
  payrollPeriodId?: string;
}): Promise<ApprovalRequestData[]> {
  try {
    const res = await approvalAxios.get("/status", { params });
    return res.data?.data || [];
  } catch {
    return [];
  }
}

export async function requestApproval(
  stageType: string,
  referenceType: string,
  payrollRunId?: string,
  attendanceImportId?: string,
  payrollPeriodId?: string,
): Promise<ApprovalRequestData> {
  const res = await approvalAxios.post("/request", {
    stageType,
    referenceType,
    payrollRunId,
    attendanceImportId,
    payrollPeriodId,
  });
  return res.data.data;
}

export async function approveRequest(
  requestId: string,
  comment?: string,
): Promise<ApprovalRequestData> {
  const res = await approvalAxios.post(`/${requestId}/approve`, { comment });
  return res.data.data;
}

export async function rejectRequest(
  requestId: string,
  comment?: string,
): Promise<ApprovalRequestData> {
  const res = await approvalAxios.post(`/${requestId}/reject`, { comment });
  return res.data.data;
}

// ── Workflow Builder APIs ────────────────────────────────────────────────────

export async function fetchWorkflowForCompany(
  companyId: string,
): Promise<ApprovalWorkflowConfig | null> {
  try {
    const res = await approvalAxios.get(`/workflow/company/${companyId}`);
    return res.data?.data || null;
  } catch {
    return null;
  }
}

export async function updateWorkflow(
  workflowId: string,
  data: { name?: string; isActive?: boolean },
): Promise<ApprovalWorkflowConfig | null> {
  const res = await approvalAxios.patch(`/workflow/${workflowId}`, data);
  return res.data.data;
}

export async function activateWorkflow(
  workflowId: string,
): Promise<ApprovalWorkflowConfig | null> {
  const res = await approvalAxios.post(`/workflow/${workflowId}/activate`);
  return res.data.data;
}

export async function deactivateWorkflow(
  workflowId: string,
): Promise<ApprovalWorkflowConfig | null> {
  const res = await approvalAxios.post(`/workflow/${workflowId}/deactivate`);
  return res.data.data;
}

export async function addWorkflowStep(
  workflowId: string,
  data: {
    stageType: string;
    stepOrder: number;
    requiredRoleId: number;
    isRequired: boolean;
    alternateRoleId?: number | null;
  },
): Promise<ApprovalWorkflowConfig | null> {
  const res = await approvalAxios.post(`/workflow/${workflowId}/steps`, data);
  return res.data.data;
}

export async function updateWorkflowStep(
  stepId: string,
  data: {
    stageType?: string;
    stepOrder?: number;
    requiredRoleId?: number;
    isRequired?: boolean;
    alternateRoleId?: number | null;
  },
): Promise<ApprovalWorkflowConfig | null> {
  const res = await approvalAxios.patch(`/workflow/steps/${stepId}`, data);
  return res.data.data;
}

export async function deleteWorkflowStep(
  stepId: string,
): Promise<void> {
  await approvalAxios.delete(`/workflow/steps/${stepId}`);
}
