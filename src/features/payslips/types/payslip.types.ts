// ──────────────────────────────────────────────
// Payslip Feature Types
// Types for employee-facing payslip views.
// ──────────────────────────────────────────────

export type GenerationStatus = 'NOT_READY' | 'GENERATING' | 'COMPLETED' | 'FAILED';
export type VisibilityStatus = 'DRAFT' | 'DONE';

/** A payroll period with payslip availability flag */
export interface PayslipPeriodInfo {
  id: string;
  name: string | null;
  cycle: string;
  startDate: string;
  endDate: string;
  status: string;
  generationStatus: GenerationStatus;
  payslipId: string | null;
}

/** A fiscal year with nested payroll periods */
export interface FiscalYearWithPeriods {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  periods: PayslipPeriodInfo[];
}

/** Response from GET /payslips/periods */
export interface MyPeriodsResponse {
  employeeId: string;
  employeeName: string;
  fiscalYears: FiscalYearWithPeriods[];
}

/** Single earning line item on payslip */
export interface PayslipEarning {
  id: string;
  label: string;
  earningType: string;
  amount: number;
  isTaxable: boolean;
}

/** Single deduction line item on payslip */
export interface PayslipDeductionItem {
  id: string;
  label: string;
  deductionType: string;
  amount: number;
  isOverridden: boolean;
}

/** Tax breakdown on payslip */
export interface PayslipTax {
  grossTaxableIncome: number;
  appliedRate: number;
  appliedDeduction: number;
  taxAmount: number;
}

/** Pension breakdown on payslip */
export interface PayslipPension {
  basis: string;
  baseSalary: number;
  employeeContribution: number;
  employerContribution: number;
}

/** Overtime breakdown on payslip */
export interface PayslipOvertime {
  category: string;
  hours: number;
  rate: number;
  hourlyRate: number;
  amount: number;
  isTaxable: boolean;
}

/** Allowance line item on payslip */
export interface PayslipAllowance {
  label: string;
  amount: number;
  isTaxable: boolean;
}

/** Full payslip detail response */
export interface PayslipDetail {
  id: string;          // PayrollRunItem ID
  payslipId: string | null;      // Payslip record ID (null = not yet generated)
  payslipPdfUrl: string | null;  // PDF URL from Cloudinary (null = not yet generated)
  payrollRunId: string;
  generationStatus: GenerationStatus;  // Current generation state
  visibilityStatus: VisibilityStatus;  // Draft vs finalized visibility
  errorMessage: string | null;         // Error detail when generationStatus === 'FAILED'
  periodName: string | null;
  periodStart: string;
  periodEnd: string;
  employeeId: string;
  employeeName: string;
  companyName: string | null;
  paymentDate: string | null;
  departmentName: string | null;
  jobPosition: string | null;
  tinNumber: string | null;
  workDays: number;
  basicSalary: number;
  proratedSalary: number;
  grossSalary: number;
  grossTaxableIncome: number;
  totalDeductions: number;
  netSalary: number;
  costToCompany: number;
  currency: string;
  earnings: PayslipEarning[];
  deductions: PayslipDeductionItem[];
  allowances: PayslipAllowance[];
  overtime: PayslipOvertime[];
  tax: PayslipTax | null;
  pension: PayslipPension | null;
}
