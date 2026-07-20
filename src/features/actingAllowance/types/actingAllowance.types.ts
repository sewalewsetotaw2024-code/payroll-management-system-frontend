/**
 * Acting Allowance — TypeScript Types
 * =====================================
 *
 * Data shapes used across the frontend for the acting allowance feature.
 * The backend serialises Prisma Decimal fields as JSON numbers, so fields
 * like `actingPositionSalary` and `salaryDiff` are typed as `number`.
 *
 * Supports three calculation methods:
 *  - PERCENTAGE: Tiered percentage of salary difference
 *  - FIXED_AMOUNT: Fixed amount per assignment
 *  - RULE_FIXED_AMOUNT: Fixed amount defined at rule level
 *
 * @module actingAllowanceTypes
 */

/** Supported calculation methods for acting allowance rules. */
export type CalculationMethod = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'RULE_FIXED_AMOUNT';

/** Human-readable labels for calculation methods */
export const CALCULATION_METHOD_LABELS: Record<CalculationMethod, string> = {
    PERCENTAGE: 'Percentage (Tiered)',
    FIXED_AMOUNT: 'Fixed Amount (Per Assignment)',
    RULE_FIXED_AMOUNT: 'Fixed Amount (Rule)',
};

/** A single percentage bracket within an acting allowance rule (PERCENTAGE method). */
export interface Tier {
    startMonth: number;
    endMonth: number;
    percent: number;
}

/** An acting allowance rule — defines calculation method, basis, and tier brackets. */
export interface ActingAllowanceRule {
    id: string;
    companyId: number;
    /** Calculation method (3 calculation methods: PERCENTAGE, FIXED_AMOUNT, RULE_FIXED_AMOUNT). */
    calculationMethod: CalculationMethod;
    /** Fixed amount for the rule (used when calculationMethod is RULE_FIXED_AMOUNT). */
    fixedAmount: number | null;
    /** Basis for the salary difference calculation (only for PERCENTAGE method). */
    basis: 'BASIC_DIFF' | 'GROSS_DIFF';
    /** Ordered tier brackets (ascending by startMonth). Only for PERCENTAGE. */
    tiers: Tier[];
    effectiveDate: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

/** An acting assignment — links an employee to an acting position under a rule. */
export interface ActingAssignment {
    id: string;
    employeeId: string;
    replacedEmployeeId: string | null;
    companyId: number;
    actingPositionId: string;
    actingAllowanceRuleId: string;
    /** Basic salary of the acting position. */
    actingPositionBasicSalary: number | null;
    /** Gross salary of the acting position (incl. benefits). */
    actingPositionGrossSalary: number | null;
    /** Legacy single salary field (maps to actingPositionBasicSalary for backward compat). */
    actingPositionSalary: number;
    /** Computed salary difference based on the rule's basis. */
    salaryDiff: number;
    /** Current monthly allowance amount (fixed amount for AMOUNT, tier-computed for PERCENTAGE). */
    monthlyAllowance: number;
    startDate: string;
    endDate: string | null;
    expectedEndDate: string | null;
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
    extensionApprovedBy: string | null;
    createdAt: string;
    updatedAt: string;
    employee?: {
        id: string;
        firstName: string;
        lastName: string;
        departmentId: number | null;
        compensation?: {
            basicSalary: number | null;
            grossSalary: number | null;
        };
    };
    replacedEmployee?: {
        id: string;
        firstName: string;
        lastName: string;
        compensation?: {
            basicSalary: number | null;
            grossSalary: number | null;
        };
    };
    actingPosition?: {
        id: string;
        title: string;
    };
    actingAllowanceRule?: {
        id: string;
        calculationMethod: CalculationMethod;
        fixedAmount: number | null;
        basis: string;
        tiers: Tier[];
    };
}

/** Result of a preview calculation — not persisted. */
export interface PreviewResult {
    monthsElapsed: number;
    matchedTier: Tier | null;
    salaryDiff: number;
    allowanceAmount: number;
    monthBreakdown: { month: number; percent: number; amount: number }[];
}

/** Payload for creating a new acting assignment. */
export interface CreateAssignmentPayload {
    employeeId: string;
    replacedEmployeeId?: string;
    actingPositionId?: string;
    actingPositionTitle?: string;
    actingAllowanceRuleId: string;
    actingPositionBasicSalary?: number;
    actingPositionGrossSalary?: number | null;
    fixedAmount?: number | null;
    startDate: string;
    expectedEndDate?: string | null;
    notes?: string;
}

/** Payload for previewing an acting allowance. */
export interface PreviewPayload {
    employeeId: string;
    replacedEmployeeId?: string;
    actingAllowanceRuleId: string;
    actingPositionBasicSalary?: number;
    actingPositionGrossSalary?: number | null;
    calculationMethod?: CalculationMethod;
    fixedAmount?: number | null;
    startDate: string;
    payrollPeriodEndDate: string;
}
