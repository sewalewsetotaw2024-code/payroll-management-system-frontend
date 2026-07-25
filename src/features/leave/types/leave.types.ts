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

export interface LeaveSyncLog {
    id: string;
    payrollPeriodId?: string;
    employeeCount: number;
    status: string;
    errorDetails?: string;
    syncedAt: string;
}
