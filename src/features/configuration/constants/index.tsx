import React from 'react';
import {
  Banknote,
  Percent,
  Wallet,
  HandCoins,
  Handshake,
  ClipboardList,
  Gavel,
  Landmark,
  PiggyBank,
  BarChart3,
  Calendar,
  Clock,
  Tag,
  Heart,
  Shield,
  Scale,
  BadgeAlert,
  Users,
} from 'lucide-react';
import type {
  DeductionCalculationType,
  EmployeeDeductionStatus,
  DeductionType,
  OvertimeRule,
  ValueRule,
  CalculationBasis,
} from '../types/configuration.types';

/**
 * Fiscal status badge color map.
 * Maps DRAFT, ACTIVE, and CLOSED statuses to their respective badge color tokens.
 */
export const FISCAL_STATUS_BADGE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  DRAFT: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  CLOSED: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
};

/** Payroll period status badge color map for DRAFT, OPEN, and CLOSED statuses. */
export const PAYROLL_STATUS_BADGE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  DRAFT: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  OPEN: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  CLOSED: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
};

/** Options for deduction value rules (simplified UX - Fixed Amount or Percent). */
export const VALUE_RULE_OPTIONS: { value: ValueRule; label: string; icon: React.ReactNode }[] = [
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount', icon: <Banknote className="w-4 h-4" /> },
  { value: 'PERCENTAGE', label: 'Percent', icon: <Percent className="w-4 h-4" /> },
];

/** Options for deduction calculation basis (which salary component). */
export const BASIS_OPTIONS: { value: CalculationBasis; label: string }[] = [
  { value: 'BASIC', label: 'Basic Salary' },
  { value: 'GROSS', label: 'Gross Salary' },
];

/** Options for deduction calculation types with display labels and icons. */
export const CALCULATION_TYPE_OPTIONS: { value: DeductionCalculationType; label: string; icon: React.ReactNode }[] = [
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount', icon: <Banknote className="w-4 h-4" /> },
  { value: 'PERCENTAGE_OF_BASIC', label: '% of Basic Salary', icon: <Percent className="w-4 h-4" /> },
  { value: 'PERCENTAGE_OF_GROSS', label: '% of Gross Salary', icon: <Percent className="w-4 h-4" /> },
  { value: 'REMAINING_BALANCE', label: 'Remaining Balance (Loan)', icon: <Wallet className="w-4 h-4" /> },
];

/** Status filter options for employee deductions. */
export const STATUS_OPTIONS: { value: EmployeeDeductionStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/** Badge color tokens mapped by employee deduction status. */
export const STATUS_BADGE: Record<EmployeeDeductionStatus, { bg: string; text: string; border: string; dot: string }> = {
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  PAUSED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  COMPLETED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  CANCELLED: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
};

/** Metadata lookup for deduction types including accent color and icon. */
export const DEDUCTION_TYPE_META: Record<string, { accent: string; icon: React.ReactNode }> = {
  LOAN_REPAYMENT: { accent: 'text-violet-600', icon: <HandCoins className="w-4 h-4" /> },
  COST_SHARING: { accent: 'text-blue-600', icon: <Handshake className="w-4 h-4" /> },
  ADVANCE_RECOVERY: { accent: 'text-amber-600', icon: <ClipboardList className="w-4 h-4" /> },
  COURT_ORDER: { accent: 'text-rose-600', icon: <Gavel className="w-4 h-4" /> },
  UNION_DUES: { accent: 'text-cyan-600', icon: <Landmark className="w-4 h-4" /> },
  PENSION_EMPLOYEE: { accent: 'text-emerald-600', icon: <PiggyBank className="w-4 h-4" /> },
  EMPLOYMENT_INCOME_TAX: { accent: 'text-red-600', icon: <BarChart3 className="w-4 h-4" /> },
  UNPAID_LEAVE: { accent: 'text-slate-600', icon: <Calendar className="w-4 h-4" /> },
  LATENESS: { accent: 'text-yellow-600', icon: <Clock className="w-4 h-4" /> },
  SAVINGS_AND_CREDIT: { accent: 'text-teal-600', icon: <PiggyBank className="w-4 h-4" /> },
  HEALTH_INSURANCE: { accent: 'text-pink-600', icon: <Heart className="w-4 h-4" /> },
  LIFE_INSURANCE: { accent: 'text-rose-600', icon: <Shield className="w-4 h-4" /> },
  FINE_PENALTY: { accent: 'text-orange-600', icon: <BadgeAlert className="w-4 h-4" /> },
  OVERPAYMENT_RECOVERY: { accent: 'text-indigo-600', icon: <Banknote className="w-4 h-4" /> },
  CHILD_SUPPORT: { accent: 'text-purple-600', icon: <Users className="w-4 h-4" /> },
  GARNISHMENT: { accent: 'text-slate-700', icon: <Scale className="w-4 h-4" /> },
  OTHER: { accent: 'text-slate-500', icon: <Tag className="w-4 h-4" /> },
};

/** Empty form template for employee deduction creation forms. */
export const emptyDeductionForm = {
  employeeId: '',
  deductionType: 'OTHER' as string,
  label: '',
  calculationType: 'FIXED_AMOUNT' as DeductionCalculationType,
  amount: null as number | null,
  percent: null as number | null,
  totalAmount: null as number | null,
  numInstallments: null as number | null,
  refNo: '',
  description: '',
  priority: 0,
  deductionItemId: undefined as string | undefined,
};

/** Currency selection options (ETB and USD). */
export const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'ETB', label: 'ETB (Ethiopian Birr)' },
  { value: 'USD', label: 'USD (US Dollar)' },
];

/** Empty form template for deduction configuration creation forms. */
export const emptyDeductionConfigForm = {
  label: '',
  deductionType: 'OTHER' as DeductionType,
  isMandatory: false,
  isStatutory: false,
  calculationType: null as DeductionCalculationType | null,
  calculationBasis: 'BASIC' as CalculationBasis,
  valueRule: 'FIXED_AMOUNT' as ValueRule,
  amount: null as number | null,
  percent: null as number | null,
};



/** Empty form template for allowance configuration creation forms. */
export const emptyAllowanceForm: { earningType: string; label: string; isTaxable: boolean; isExempt: boolean; exemptPercent: number | null } = {
  earningType: 'OTHER',
  label: '',
  isTaxable: false,
  isExempt: false,
  exemptPercent: null,
};

/** Metadata lookup for overtime categories with labels, descriptions, icons, and colors. */
export const CATEGORY_META: Record<string, { label: string; desc: string; icon: React.ReactNode; color: string }> = {
  WEEKDAY_DAY: { label: 'Weekday Day OT', desc: 'Regular weekday overtime (daytime hours)', icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
  WEEKDAY_NIGHT: { label: 'Weekday Night OT', desc: 'Nighttime overtime on regular weekdays', icon: <Clock className="w-4 h-4" />, color: 'text-indigo-600 bg-indigo-50' },
  WEEKEND: { label: 'Weekend OT', desc: 'Overtime worked on weekends', icon: <Clock className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50' },
  PUBLIC_HOLIDAY: { label: 'Public Holiday OT', desc: 'Overtime on public holidays', icon: <Clock className="w-4 h-4" />, color: 'text-rose-600 bg-rose-50' },
};

/** Empty form template for overtime rule editing. */
export const emptyOvertimeFormTemplate: Partial<OvertimeRule> = {
  category: 'WEEKDAY_DAY' as OvertimeRule['category'],
  rate: 1.5,
  calculationBase: 'BASIC',
  isTaxable: true,
  weeklyCapHours: 12,
  monthlyCapHours: null,
};

/**
 * Returns the default set of overtime rules for all four categories.
 *
 * @returns An array of OvertimeRule objects with default multipliers.
 */
export const getDefaultOvertimeRules = (): OvertimeRule[] => {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { category: 'WEEKDAY_DAY', rate: 1.5, calculationBase: 'BASIC', isTaxable: true, weeklyCapHours: 12, monthlyCapHours: null, effectiveDate: today },
    { category: 'WEEKDAY_NIGHT', rate: 1.75, calculationBase: 'BASIC', isTaxable: true, weeklyCapHours: 12, monthlyCapHours: null, effectiveDate: today },
    { category: 'WEEKEND', rate: 2.0, calculationBase: 'BASIC', isTaxable: true, weeklyCapHours: 12, monthlyCapHours: null, effectiveDate: today },
    { category: 'PUBLIC_HOLIDAY', rate: 2.5, calculationBase: 'BASIC', isTaxable: true, weeklyCapHours: 12, monthlyCapHours: null, effectiveDate: today },
  ];
};

/** Payroll batch status badge color map for DRAFT, ACTIVE, CLOSED, and ARCHIVED statuses. */
export const BATCH_STATUS_BADGE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  DRAFT: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  CLOSED: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
  ARCHIVED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
};

/** Options for digest frequency selection with display labels and icons. */
export const DIGEST_FREQUENCY_OPTIONS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'DAILY', label: 'Daily', icon: <Calendar className="w-4 h-4" /> },
  { value: 'WEEKLY', label: 'Weekly', icon: <Calendar className="w-4 h-4" /> },
  { value: 'MONTHLY', label: 'Monthly', icon: <Calendar className="w-4 h-4" /> },
];

/** Options for payslip format selection. */
export const PAYSLIP_FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: 'PDF', label: 'PDF Document' },
  { value: 'HTML', label: 'HTML (Browser View)' },
];

/** Options for delivery trigger selection with labels. */
export const DELIVERY_TRIGGER_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: 'PAYSLIP_GENERATED', label: 'Payslip Generated', description: 'When a payslip is first created' },
  { value: 'PAYSLIP_VIEWED', label: 'Payslip Viewed', description: 'When employee views the payslip' },
  { value: 'PAYSLIP_APPROVED', label: 'Payslip Approved', description: 'When payslip is approved' },
  { value: 'PAYSLIP_REJECTED', label: 'Payslip Rejected', description: 'When payslip is rejected' },
  { value: 'MONTHLY_DIGEST', label: 'Monthly Digest', description: 'Monthly summary notification' },
];

/** Options for pay frequency selection with display labels and icons. */
export const PAY_FREQUENCY_OPTIONS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'MONTHLY', label: 'Monthly (12 periods/year)', icon: <Calendar className="w-4 h-4" /> },
  { value: 'WEEKLY', label: 'Weekly (52 periods/year)', icon: <Calendar className="w-4 h-4" /> },
  { value: 'DAILY', label: 'Daily', icon: <Calendar className="w-4 h-4" /> },
  { value: 'HOURLY', label: 'Hourly', icon: <Clock className="w-4 h-4" /> },
];

/** Options for pay day rule selection. */
export const PAY_DAY_RULE_OPTIONS: { value: string; label: string }[] = [
  { value: 'FIXED_DATE', label: 'Fixed Date (e.g. 28th of month)' },
  { value: 'OFFSET_FROM_PERIOD_END', label: 'Offset from Period End (e.g. 3 days after)' },
];

/** Options for weekend / holiday rollover selection. */
export const WEEKEND_ROLLOVER_OPTIONS: { value: string; label: string }[] = [
  { value: 'PAY_FRIDAY_BEFORE', label: 'Pay Friday Before' },
  { value: 'PAY_MONDAY_AFTER', label: 'Pay Monday After' },
];

/** Options for daily rate basis selection. */
export const DAILY_RATE_BASIS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ANNUAL_SALARY_DIVIDED_BY_WORKING_DAYS', label: 'Annual Salary ÷ Working Days' },
  { value: 'FIXED_DAILY_RATE', label: 'Fixed Daily Rate' },
];

/** Common employee group options for pay frequency assignment. */
export const EMPLOYEE_GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: 'Permanent', label: 'Permanent Staff' },
  { value: 'Contract', label: 'Contract Staff' },
  { value: 'Daily Wage', label: 'Daily Wage Workers' },
  { value: 'Intern', label: 'Interns' },
  { value: 'Probation', label: 'Probationary' },
];

/** Currency selection options for exchange rate configuration. */
export const CURRENCY_LIST: { value: string; label: string }[] = [
  { value: 'ETB', label: 'ETB (Ethiopian Birr)' },
  { value: 'USD', label: 'USD (US Dollar)' },
  { value: 'GBP', label: 'GBP (British Pound)' },
  { value: 'EUR', label: 'EUR (Euro)' },
  { value: 'AED', label: 'AED (UAE Dirham)' },
];

/** Options for rounding rule selection. */
export const ROUNDING_RULE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ROUND_HALF_UP', label: 'Round Half Up (Standard)' },
  { value: 'ROUND_HALF_DOWN', label: 'Round Half Down' },
  { value: 'ROUND_HALF_EVEN', label: 'Round Half Even (Banker)' },
  { value: 'TRUNCATE', label: 'Truncate (Always Round Down)' },
];

/** Options for rate source selection. */
export const RATE_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'MANUAL', label: 'Manual Entry' },
  { value: 'AUTO_FETCH', label: 'Auto-Fetched' },
];
