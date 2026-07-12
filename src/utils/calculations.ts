import { TaxBracket } from '../features/configuration/types/configuration.types';

/**
 * Ethiopian Employment Income Tax (EIT) Brackets
 * Per Proclamation No. 1395/2025 — effective July 2025
 *
 * These are used as defaults/fallback. The live brackets
 * come from the backend configuration and may be updated.
 */
export const ETHIOPIAN_TAX_BRACKETS: TaxBracket[] = [
  { lowerBound: 0, upperBound: 2000, rate: 0, deductionAmount: 0 },
  { lowerBound: 2001, upperBound: 4000, rate: 0.15, deductionAmount: 300 },
  { lowerBound: 4001, upperBound: 7000, rate: 0.20, deductionAmount: 500 },
  { lowerBound: 7001, upperBound: 10000, rate: 0.25, deductionAmount: 850 },
  { lowerBound: 10001, upperBound: 14000, rate: 0.30, deductionAmount: 1350 },
  { lowerBound: 14001, upperBound: null, rate: 0.35, deductionAmount: 2050 },
];

export const PENSION_RATES = {
  EMPLOYEE: 0.07,
  EMPLOYER: 0.11,
};

export const calculateIncomeTax = (taxableIncome: number): number => {
  const bracket = ETHIOPIAN_TAX_BRACKETS.find(b => 
    taxableIncome >= b.lowerBound && (b.upperBound === null || taxableIncome <= b.upperBound)
  );

  if (!bracket) return 0;
  return (taxableIncome * bracket.rate) - bracket.deductionAmount;
};

export const calculatePension = (basicSalary: number) => {
  return {
    ee: basicSalary * PENSION_RATES.EMPLOYEE,
    er: basicSalary * PENSION_RATES.EMPLOYER,
  };
};

export interface OvertimeRates {
  weekday: number; // 1.25x
  night: number;   // 1.5x
  weekend: number; // 2.0x
  holiday: number; // 2.5x
}

export const OT_MULTIPLIERS = {
  WEEKDAY: 1.25,
  NIGHT: 1.5,
  WEEKEND: 2.0,
  HOLIDAY: 2.5,
};

export const calculateOvertime = (hourlyRate: number, hours: { weekday: number; night: number; weekend: number; holiday: number }) => {
  return (
    (hours.weekday * hourlyRate * OT_MULTIPLIERS.WEEKDAY) +
    (hours.night * hourlyRate * OT_MULTIPLIERS.NIGHT) +
    (hours.weekend * hourlyRate * OT_MULTIPLIERS.WEEKEND) +
    (hours.holiday * hourlyRate * OT_MULTIPLIERS.HOLIDAY)
  );
};
