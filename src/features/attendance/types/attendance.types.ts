/**
 * Represents a single attendance import (biometric Excel upload).
 * Each import is tied to a payroll period and contains processed records
 * and monthly summaries.
 */
export interface AttendanceImport {
    id: string;
    payrollPeriodId: string;
    source: string;
    importedBy: string;
    importedAt: string;
    status?: string;
    isActive?: boolean;
    processedAt?: string | null; // Set when used in a payroll run — prevents re-processing
    fileReference?: string;
    sizeBytes?: number;
    recordCount?: number;
    errorDetails?: string;
    periodLabel: string;
    totalEmployees: number;
    totalRecords: number;
    exportData?: string | null;  // Base64-encoded XLSX snapshot generated on submit-for-approval
    payrollPeriod?: {
        id: string;
        startDate: string;
        endDate: string;
        name?: string;
    };
    _count?: {
        attendanceRecords: number;
        monthlySummaries: number;
    };
}

/**
 * A single attendance record for one employee on a given date,
 * including worked hours, lateness, and absence flags.
 */
export interface AttendanceRecord {
    id: string;
    attendanceImportId: string;
    employeeId: string;
    date: string;
    regularHours: number;
    lateMinutes: number;
    isAbsent: boolean;
    employee?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

/**
 * Monthly summary of attendance and leave for a single employee,
 * aggregating regular hours, overtime by category, and all leave types.
 */
export interface AttendanceMonthlySummary {
    id: string;
    attendanceImportId: string;
    employeeId: string;
    employeeName: string;
    department: string;
    regularHours: number;
    lateMinutes: number;
    earlyOutMinutes: number;
    absenceHours: number;
    normalOtHours: number;
    weekendOtHours: number;
    holidayOtHours: number;
    ot1Hours: number;
    annualLeaveHours: number;
    sickLeaveHours: number;
    casualLeaveHours: number;
    maternityLeaveHours: number;
    compassionateLeaveHours: number;
    businessTripHours: number;
    compensatoryHours: number;
    employee?: {
        id: string;
        firstName: string;
        lastName: string;
        compensation?: {
            basicSalary: number;
            grossSalary: number;
        };
        allowances?: {
            allowanceType: string;
            amount: number;
        }[];
    };
}

/**
 * Result returned after a biometric Excel file has been imported,
 * including row-level errors encountered during processing.
 */
export interface ImportResult {
    importId: string;
    totalEmployees: number;
    totalRecords: number;
    periodLabel: string;
    errors: { row: number; message: string }[];
}

/**
 * Result returned after overtime calculation has been completed
 * for a given import, with hours broken down by category.
 */
export interface OtCalculationResult {
    importId: string;
    totalEmployees: number;
    totalOtRecords: number;
    byCategory: { category: string; totalHours: number }[];
    byEmployee?: {
        summaryId: string;
        categories: { category: string; hours: number }[];
    }[];
}

/**
 * Period-level attendance summary with actualDays for proration.
 * Linked to an AttendanceImport and Employee.
 */
export interface AttendancePeriodSummary {
    employeeId: string;
    actualDays?: number | null;
    workingDays?: number | null;
    totalHours: number;
    regularHours: number;
    paidLeaveHours: number;
    absenceHours?: number | null;
}

/**
 * Full import detail including all associated attendance records,
 * monthly summaries, and period summaries.
 */
export interface ImportDetail extends AttendanceImport {
    attendanceRecords: AttendanceRecord[];
    monthlySummaries: AttendanceMonthlySummary[];
    attendancePeriodSummaries: AttendancePeriodSummary[];
}

/**
 * A single day entry returned from the daily-records endpoint.
 * Pre-structured for direct rendering in the heatmap.
 */
export interface DailyRecordEntry {
    day: number;
    date: string;
    hours: number;
    isAbsent: boolean;
}

/**
 * A month group returned from the daily-records endpoint.
 * Contains all daily records for a given month, already sorted.
 */
export interface MonthGroup {
    key: string;
    monthName: string;
    year: number;
    days: DailyRecordEntry[];
}

/**
 * Response from GET /attendance/imports/:importId/employees/:employeeId/daily-records.
 */
export interface EmployeeDailyRecords {
    employeeId: string;
    importId: string;
    months: MonthGroup[];
}

// ─── Attendance Summary Types ─────────────────────────────────────────

export interface AttendanceSummaryItem {
    employeeId: string;
    employeeName: string;
    department: string;
    regularHours: number;
    paidLeaveHours: number;
    absenceHours?: number;
    totalHours: number;
    absentDays?: number;
    paidLeaveDays?: number;
    actualDays?: number;
    workingDays?: number;
    // Payroll-related fields
    basicSalary?: number;
    grossSalary?: number;
    totalAllowances?: number;
}

export interface CombinedPeriodSummary {
    importId: string;
    payrollPeriod: {
        id: string;
        startDate: string;
        endDate: string;
        name: string | null;
    };
    employees: AttendanceSummaryItem[];
    calculatedAt: string;
}

export interface AttendanceNotification {
    id: string;
    recipientId: number;
    type: 'ATTENDANCE_SUBMITTED' | 'ATTENDANCE_APPROVED' | 'ATTENDANCE_REJECTED';
    title: string;
    message?: string | null;
    attendanceImportId?: string | null;
    rejectionNote?: string | null;
    read: boolean;
    createdAt: string;
}
