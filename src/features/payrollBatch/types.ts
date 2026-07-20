export interface PeriodOption {
  id: string;
  name: string | null;
  startDate: string;
  endDate: string;
}

export interface PayrollBatch {
  id: string;
  name: string;
  payrollPeriodId: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  _count: { employees: number };
  employees?: Array<{ id: string; firstName?: string; lastName?: string }>;
}

export interface PayrollBatchEmployeeItem {
  id: string;
  employeeId: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    externalId: string;
    department?: { name: string };
    position?: { title: string };
  };
}

export interface GenerateBatchesResponse {
  batches: PayrollBatch[];
  totalEmployees: number;
  batchCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
}
