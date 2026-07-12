export interface LeaveBalance {
    id: string;
    employeeId: string;
    companyId: number;
    leaveType: string;
    fiscalYear: number;
    totalEntitlement: number;
    usedDays: number;
    pendingDays: number;
    remainingDays: number;
    expiryDate?: string;
    employee?: {
        id: string;
        firstName: string;
        lastName: string;
        departmentId?: number | null;
    };
}

export interface LeaveApplication {
    id: string;
    employeeId: string;
    companyId: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    requestedDays: number;
    status: string;
    employee?: {
        id: string;
        firstName: string;
        lastName: string;
        departmentId?: number | null;
    };
}

export interface LeaveDeduction {
    id: string;
    employeeId: string;
    companyId: number;
    payrollPeriodId?: string;
    leaveType: string;
    leaveDays: number;
    deductionAmount: number;
    employee?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    payrollPeriod?: {
        id: string;
        name?: string;
        startDate: string;
        endDate: string;
    };
}

export interface LeaveSyncLog {
    id: string;
    payrollPeriodId?: string;
    employeeCount: number;
    status: string;
    errorDetails?: string;
    syncedAt: string;
}

/**
 * PayrollLeaveItem — Per-leave-type breakdown within a payroll run item.
 * Each record captures the exact days-in-period and deduction for one
 * leave type (e.g. "Annual Leave", "Unpaid Leave") for one employee.
 * Matches the backend Prisma `PayrollLeaveItem` model.
 */
export interface PayrollLeaveItem {
  /** Primary key (UUID). */
  id: string;
  /** FK → PayrollRunItem the leave item belongs to. */
  payrollRunItemId: string;
  /** FK → Employee who took the leave. */
  employeeId: string;
  /** FK → Company that owns the payroll run. */
  companyId: number;
  /** FK → PayrollPeriod this leave falls within. */
  payrollPeriodId: string | null;
  /** Leave type display name (e.g. "Annual Leave", "Unpaid Leave"). */
  leaveType: string;
  /** Short leave type code (e.g. "ANNUAL", "SICK", "UNPAID"). */
  leaveCode: string | null;
  /** Number of leave days that fall within the payroll period (supports 0.5 for half-days). */
  leaveDaysInPeriod: number;
  /** Whether this leave type is paid (true) or unpaid (false). */
  isPaid: boolean;
  /** Computed deduction amount for unpaid leave (0 for paid leave). Formula: days × (basicSalary / 30). */
  deductionAmount: number;
  /** Timestamp of the last sync from the employee management system. */
  syncedAt: string;
  /** Payroll period info — only populated when fetched via the employee-items endpoint. */
  payrollPeriod?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

export interface LeaveFromAttendanceResult {
    totalEmployees: number;
    totalPaidDays: number;
    totalUnpaidDays: number;
    totalDeductionAmount: number;
    items: {
        employeeId: string;
        employeeName: string;
        paidLeaveDays: number;
        unpaidLeaveDays: number;
        deductionAmount: number;
    }[];
}

/**
 * Result of a leave sync operation — either for a single PayrollRunItem
 * (syncLeavePeriod) or for all items in a PayrollRun (syncLeavePeriodByRun).
 * Provides aggregate counts plus a detailed breakdown per employee per leave type.
 */
export interface LeaveSyncResult {
  /** Number of employees who had at least one leave record synced. */
  totalEmployees: number;
  /** Number of distinct leave types found across all employees. */
  totalLeaveTypes: number;
  /** Sum of all deduction amounts (unpaid leave only). */
  totalDeductions: number;
  /** Per-employee, per-leave-type detail rows. */
  details: Array<{
    /** Employee ID (payroll DB, not EMS). */
    employeeId: string;
    /** Employee display name ("First Last"). */
    employeeName: string;
    /** Leave type name (e.g. "Annual Leave"). */
    leaveType: string;
    /** Leave days within the period (supports 0.5 for half-days). */
    days: number;
    /** Whether the leave type is paid. */
    isPaid: boolean;
    /** Computed deduction amount (0 for paid leave). */
    deductionAmount: number;
  }>;
}
