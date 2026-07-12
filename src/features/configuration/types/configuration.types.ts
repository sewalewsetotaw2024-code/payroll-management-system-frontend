/**
 * Represents the status of a fiscal year within the system.
 * DRAFT - Not yet active; ACTIVE - Currently in use; CLOSED - No longer active.
 */
export type FiscalStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

/**
 * Represents the status of a payroll period.
 * DRAFT - Not yet open; ACTIVE - Currently accepting entries; DONE - Finalized/closed.
 */
export type PayrollPeriodStatus = 'DRAFT' | 'ACTIVE' | 'DONE';


// ─── Fiscal Year ───────────────────────────────────────────────
/** Fiscal year entity representing an annual payroll period. */
export interface FiscalYear {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  status?: FiscalStatus;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Tax Bracket ───────────────────────────────────────────────
/** Tax bracket entity defining progressive income tax bands. */
export interface TaxBracket {
  id?: string;
  lowerBound: number;
  upperBound: number | null;
  rate: number;
  deductionAmount: number;
  effectiveDate?: string;
  expiryDate?: string | null;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Pension Rule ──────────────────────────────────────────────
/** Pension rule entity defining employee/employer contribution rates and basis. */
export interface PensionRule {
  id?: string;
  employeeRate: number;
  employerRate: number;
  basis: 'BASIC' | 'GROSS';
  mandatoryForForeigners: boolean;
  remittanceDeadlineDays: number;
  effectiveDate: string;
  companyId?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Allowance Config ──────────────────────────────────────────
/** Earning type categories representing all possible earnings components. */
export type EarningType =
  | 'BASIC_SALARY' | 'RESPONSIBILITY_ALLOWANCE' | 'HOUSING_ALLOWANCE'
  | 'TELEPHONE_ALLOWANCE' | 'MEAL_ALLOWANCE' | 'HARDSHIP_ALLOWANCE'
  | 'ACTING_ALLOWANCE' | 'RELOCATION_ALLOWANCE' | 'PD_ALLOWANCE'
  | 'TRANSPORT_TAXABLE' | 'TRANSPORT_NON_TAXABLE' | 'OVERTIME'
  | 'BONUS' | 'INCENTIVE' | 'GIFT' | 'PROFIT_SHARING' | 'OTHER';

  /** Allowance (earning type) configuration entity. */
export interface AllowanceConfig {
  id?: string;
  earningType: string;
  label: string;
  isTaxable: boolean;
  isExempt?: boolean;
  exemptPercent?: number | null;
  isActive?: boolean;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Deduction Type ────────────────────────────────────────────
/** Union of all possible deduction type categories. */
export type DeductionType =
  | 'EMPLOYMENT_INCOME_TAX'
  | 'PENSION_EMPLOYEE'
  | 'COST_SHARING'
  | 'LOAN_REPAYMENT'
  | 'ADVANCE_RECOVERY'
  | 'UNPAID_LEAVE'
  | 'LATENESS'
  | 'COURT_ORDER'
  | 'UNION_DUES'
  | 'SAVINGS_AND_CREDIT'
  | 'HEALTH_INSURANCE'
  | 'LIFE_INSURANCE'
  | 'FINE_PENALTY'
  | 'OVERPAYMENT_RECOVERY'
  | 'CHILD_SUPPORT'
  | 'GARNISHMENT'
  | 'OTHER';

// ─── Deduction Config ──────────────────────────────────────────
/**
 * DeductionConfig is a TEMPLATE/DEFINITION of a deduction type (e.g., "Loan Repayment", "Cost Sharing").
 * It can have calculationType + amount/percent (Type A - fixed value for all employees)
 * or calculationType without amount/percent (Type B - per-employee values at assignment time).
 */
export interface DeductionConfig {
  id?: string;
  salaryStructureId?: string;
  deductionType: string;
  label: string;
  isMandatory?: boolean;
  isStatutory?: boolean;
  calculationType?: DeductionCalculationType | null;
  calculationBasis?: CalculationBasis | null;
  amount?: number | null;
  percent?: number | null;
  isActive?: boolean;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Employee Deduction Status ─────────────────────────────────
/** Status of a per-employee deduction assignment. */
export type EmployeeDeductionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

// ─── Deduction Calculation Type ────────────────────────────────
/** Calculation method used for determining deduction amounts. */
export type DeductionCalculationType = 
  | 'FIXED_AMOUNT'
  | 'PERCENTAGE_OF_BASIC'
  | 'PERCENTAGE_OF_GROSS'
  | 'REMAINING_BALANCE';

/** Value rule for deductions (simplified UX choice). */
export type ValueRule = 'FIXED_AMOUNT' | 'PERCENTAGE';

/** Calculation basis for deductions (which salary component it applies to). */
export type CalculationBasis = 'BASIC' | 'GROSS';

// ─── Employee Deduction ────────────────────────────────────────
/**
 * EmployeeDeduction stores PER-EMPLOYEE deduction assignments.
 * This is where specific amounts are stored (e.g., "Employee A has a loan of 100,000 ETB").
 */
export interface EmployeeDeduction {
  id?: string;
  employeeId: string;
  deductionItemId?: string;
  deductionType: string;
  label: string;
  calculationType: DeductionCalculationType;
  amount?: number | null;
  percent?: number | null;
  status?: EmployeeDeductionStatus;
  startDate?: string | null;
  endDate?: string | null;
  effectivePeriodId?: string;
  description?: string;
  refNo?: string;
  priority?: number;
  prorated?: boolean;
  isActive?: boolean;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;

  // Payment plan fields (from DeductionPaymentPlan relation)
  paymentPlan?: {
    totalAmount?: number | null;
    paidAmount?: number;
    remaining?: number | null;
    numInstallments?: number | null;
    paidInstallments?: number;
  };

  // Related data (from API include)
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    jobPosition?: string;
    departmentName?: string;
    basicSalary?: number;
    grossSalary?: number;
  };
}

// ─── Workdays Config ───────────────────────────────────────────
/** Workdays configuration entity defining standard working days and hours. */
export interface WorkdaysConfig {
  id?: string;
  defaultMonthlyWorkdays: number;
  weeklyWorkingDays: number;
  dailyWorkingHours: number;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Overtime Rule ─────────────────────────────────────────────
/** Overtime rule entity defining pay multipliers by category. */
export interface OvertimeRule {
  id?: string;
  category: 'WEEKDAY_DAY' | 'WEEKDAY_NIGHT' | 'WEEKEND' | 'PUBLIC_HOLIDAY';
  rate: number;
  calculationBase?: 'BASIC' | 'GROSS';
  isTaxable?: boolean;
  weeklyCapHours?: number;
  monthlyCapHours?: number | null;
  effectiveDate: string;
  companyId?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Payroll Period ────────────────────────────────────────────
/** Payroll period entity defining a specific payroll cycle timeframe. */
export interface PayrollPeriod {
  id?: string;
  fiscalYearId: string;
  name?: string | null;
  cycle: 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'HOURLY';
  startDate: string;
  endDate: string;
  dateOfPayment?: string | null;
  status?: PayrollPeriodStatus;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;

  // Computed fields from WorkdaysConfiguration
  defaultMonthlyWorkdays?: number;
  dailyWorkingHours?: number;
  calendarDays?: number;
  workHours?: number;
}

// ─── Salary Structure ─────────────────────────────────────────
/** Salary structure entity grouping deduction configurations. */
export interface SalaryStructure {
  id?: string;
  name: string;
  description?: string;
  isActive?: boolean;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Pagination Meta ──────────────────────────────────────────
/** Pagination metadata returned by paginated API endpoints. */
export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

// ─── Generic API State ────────────────────────────────────────
/** Generic Redux API state slice structure. */
export interface ApiState<T> {
  data: T;
  loading: boolean;
  saving: boolean;
  error: string | null;
  pagination?: PaginationMeta;
}

// ─── Pagination Params for fetch actions ─────────────────────
/** Pagination query parameters for list API requests. */
export interface PaginationParams {
  page: number;
  limit: number;
}

// ─── Paginated Response Envelope ──────────────────────────────
/** Standard paginated API response wrapper. */
export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  pagination?: PaginationMeta;
}

/** Standard single-entity API response wrapper. */
export interface SingleResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ─── Payroll Batch ──────────────────────────────────────────
/** Status of a payroll batch. */
export type BatchStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

/** Payroll batch entity representing a batch of payroll processing. */
export interface PayrollBatch {
  id?: string;
  batchType: string;
  description?: string | null;
  status?: BatchStatus;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Payslip Notification Settings ─────────────────────────
/** Frequency of digest email notifications. */
export type DigestFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

/** Format for payslip delivery. */
export type PayslipFormat = 'PDF' | 'HTML';

/** Events that trigger a payslip notification. */
export type DeliveryTrigger = 'PAYSLIP_GENERATED' | 'PAYSLIP_VIEWED' | 'PAYSLIP_APPROVED' | 'PAYSLIP_REJECTED' | 'MONTHLY_DIGEST';

/** Payslip notification settings entity (singleton per company). */
export interface PayslipNotificationSettings {
  id?: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  digestFrequency: DigestFrequency;
  payslipFormat: PayslipFormat;
  emailTemplate?: string | null;
  deliveryTriggers?: DeliveryTrigger[] | string | null;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Rounding Rule ──────────────────────────────────────────
/** Rounding rule for currency calculations. */
export type RoundingRule = 'ROUND_HALF_UP' | 'ROUND_HALF_DOWN' | 'ROUND_HALF_EVEN' | 'TRUNCATE';

// ─── Rate Source ───────────────────────────────────────────
/** Source of a currency exchange rate. */
export type RateSource = 'MANUAL' | 'AUTO_FETCH';

// ─── System Currency ───────────────────────────────────────
/** System currency entity managed per company. */
export interface SystemCurrency {
  id?: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  roundingRule: RoundingRule;
  isBase: boolean;
  isActive: boolean;
  autoFetchRate: boolean;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: { ratesFrom: number };
}

// ─── Currency Rate ──────────────────────────────────────────
/** Currency exchange rate entity. */
export interface CurrencyRate {
  id?: string;
  fromCurrencyId: string;
  toCurrencyId: string;
  rate: number;
  source: RateSource;
  overrideReason?: string | null;
  effectiveDate: string;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;
  // Related data (from API include)
  fromCurrency?: SystemCurrency;
  toCurrency?: SystemCurrency;
}

// ─── Pay Frequency Enums ────────────────────────────────────
/** Rule for determining the pay day within a period. */
export type PayDayRule = 'FIXED_DATE' | 'OFFSET_FROM_PERIOD_END';

/** Rollover behaviour when pay day falls on a weekend or public holiday. */
export type WeekendRollover = 'PAY_FRIDAY_BEFORE' | 'PAY_MONDAY_AFTER';

/** Basis for deriving a daily wage rate. */
export type DailyRateBasis = 'ANNUAL_SALARY_DIVIDED_BY_WORKING_DAYS' | 'FIXED_DAILY_RATE';

// ─── Pay Frequency ──────────────────────────────────────────
/** Pay frequency configuration entity. */
export interface PayFrequency {
  id?: string;
  name: string;
  frequency: 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'HOURLY';
  periodsPerYear: number;
  isActive?: boolean;
  companyId?: number;
  createdAt?: string;
  updatedAt?: string;

  // Pay day rules
  payDayRule?: PayDayRule | null;
  fixedPayDate?: number | null;
  offsetDays?: number | null;
  weekendRollover?: WeekendRollover | null;
  holidayRollover?: WeekendRollover | null;

  // Employee group assignment
  applicableEmployeeGroup?: string | null;
  autoGeneratePeriods?: boolean;

  // Daily-pay specifics
  dailyRateBasis?: DailyRateBasis | null;
  workingDaysPerYear?: number | null;
  minimumPayableDays?: number | null;
  overtimeEligible?: boolean;
}
