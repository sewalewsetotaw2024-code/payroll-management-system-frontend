export enum EmployeeStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  ON_LEAVE = 'On Leave',
  TERMINATED = 'Terminated',
}

export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  jobGrade: string;
  role: string;
  status: EmployeeStatus;
  basicSalary: number;
  startDate: string;
  email: string;
  allowances: {
    name: string;
    amount: number;
    isTaxable: boolean;
  }[];
}

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
  deduction: number;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  frequency: 'Monthly' | 'Weekly';
  days: number;
  hours: number;
  paymentDate: string;
}

export interface BonusRule {
  id: string;
  name: string;
  description: string;
  pmsScale: { rating: number; percentage: number }[];
  eligibility: {
    minTenureMonths: number;
    departments: string[];
    jobGrades: string[];
  };
  taxTreatment: 'Taxable' | 'Non-taxable' | 'Partial';
  partialTaxLimit?: number;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  periodId: string;
  basicSalary: number;
  allowancesSum: number;
  grossSalary: number;
  taxableIncome: number;
  incomeTax: number;
  pensionEE: number;
  pensionER: number;
  netSalary: number;
  overtime: {
    weekday: number;
    night: number;
    weekend: number;
    holiday: number;
  };
  actingAllowance: number;
  deductions: number;
}

export interface Batch {
  id: string;
  name: string;
  periodId: string;
  status: 'Draft' | 'Approved' | 'Paid';
  records: PayrollRecord[];
  createdAt: string;
}
