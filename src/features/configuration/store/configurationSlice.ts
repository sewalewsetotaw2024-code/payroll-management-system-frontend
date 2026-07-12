import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { WritableDraft } from 'immer';
import type {
  FiscalYear,
  TaxBracket,
  PensionRule,
  AllowanceConfig,
  DeductionConfig,
  WorkdaysConfig,
  OvertimeRule,
  PayrollPeriod,
  PayrollBatch,
  PayslipNotificationSettings,
  CurrencyRate,
  PayFrequency,
  SystemCurrency,
  ApiState,
} from '../types/configuration.types';
import { createEntityReducers } from './entityFactory';

/**
 * Root configuration state shape managing all entity API states.
 * Each entity (fiscal years, tax brackets, pension rules, etc.) has its own ApiState.
 */
export interface ConfigurationState {
  fiscalYears: ApiState<FiscalYear[]>;
  taxBrackets: ApiState<TaxBracket[]>;
  pensionRules: ApiState<PensionRule[]>;
  overtimeRules: ApiState<OvertimeRule[]>;
  payrollPeriods: ApiState<PayrollPeriod[]>;
  allowances: ApiState<AllowanceConfig[]>;
  deductions: ApiState<DeductionConfig[]>;
  workdays: ApiState<WorkdaysConfig | null>;
  payrollBatches: ApiState<PayrollBatch[]>;
  payslipNotificationSettings: ApiState<PayslipNotificationSettings | null>;
  currencies: ApiState<SystemCurrency[]>;
  currencyRates: ApiState<CurrencyRate[]>;
  payFrequencies: ApiState<PayFrequency[]>;
}

const defaultListState = <T>(): ApiState<T[]> => ({
  data: [] as T[],
  loading: false,
  saving: false,
  error: null,
});

const initialState: ConfigurationState = {
  fiscalYears: defaultListState<FiscalYear>(),
  taxBrackets: defaultListState<TaxBracket>(),
  pensionRules: defaultListState<PensionRule>(),
  overtimeRules: defaultListState<OvertimeRule>(),
  payrollPeriods: defaultListState<PayrollPeriod>(),
  allowances: defaultListState<AllowanceConfig>(),
  deductions: defaultListState<DeductionConfig>(),
  workdays: { data: null, loading: false, saving: false, error: null },
  payrollBatches: defaultListState<PayrollBatch>(),
  payslipNotificationSettings: { data: null, loading: false, saving: false, error: null },
  currencies: defaultListState<SystemCurrency>(),
  currencyRates: defaultListState<CurrencyRate>(),
  payFrequencies: defaultListState<PayFrequency>(),
};

/** Redux slice for the configuration feature managing all entity states and reducers. */
const configurationSlice = createSlice({
  name: 'configuration',
  initialState,
  reducers: {
    ...(createEntityReducers('fiscalYears', { hasCRUD: true }) as any),
    ...(createEntityReducers('taxBrackets', { hasPagination: true, hasCRUD: true }) as any),
    ...(createEntityReducers('pensionRules') as any),
    ...(createEntityReducers('overtimeRules') as any),
    ...(createEntityReducers('payrollPeriods', { hasPagination: true, hasCRUD: true }) as any),
    ...(createEntityReducers('allowances', { hasPagination: true, hasCRUD: true }) as any),
    ...(createEntityReducers('deductions', { hasPagination: true, hasCRUD: true }) as any),
    ...(createEntityReducers('payrollBatches', { hasPagination: true, hasCRUD: true }) as any),
    ...(createEntityReducers('payslipNotificationSettings', { singularSave: true }) as any),
    ...(createEntityReducers('currencies', { hasCRUD: true }) as any),
    ...(createEntityReducers('currencyRates', { hasPagination: true }) as any),
    ...(createEntityReducers('payFrequencies', { hasPagination: true }) as any),

    fetchWorkdaysRequest(state: WritableDraft<ConfigurationState>) {
      state.workdays.loading = true;
      state.workdays.saving = false;
      state.workdays.error = null;
    },
    fetchWorkdaysSuccess(state: WritableDraft<ConfigurationState>, action: PayloadAction<WorkdaysConfig>) {
      state.workdays.data = action.payload;
      state.workdays.loading = false;
      state.workdays.saving = false;
    },
    fetchWorkdaysFailure(state: WritableDraft<ConfigurationState>, action: PayloadAction<string>) {
      state.workdays.loading = false;
      state.workdays.saving = false;
      state.workdays.error = action.payload;
    },
    saveWorkdaysRequest(state: WritableDraft<ConfigurationState>) {
      state.workdays.saving = true;
      state.workdays.error = null;
    },
    saveWorkdaysSuccess(state: WritableDraft<ConfigurationState>, action: PayloadAction<WorkdaysConfig>) {
      state.workdays.data = action.payload;
      state.workdays.saving = false;
    },
    saveWorkdaysFailure(state: WritableDraft<ConfigurationState>, action: PayloadAction<string>) {
      state.workdays.saving = false;
      state.workdays.error = action.payload;
    },

    // ─── Fiscal Year Transitions ─────────────────────────────────
    activateFiscalYearRequest(state: WritableDraft<ConfigurationState>) {
      state.fiscalYears.saving = true;
      state.fiscalYears.error = null;
    },
    activateFiscalYearFailure(state: WritableDraft<ConfigurationState>, action: PayloadAction<string>) {
      state.fiscalYears.saving = false;
      state.fiscalYears.error = action.payload;
    },
    closeFiscalYearRequest(state: WritableDraft<ConfigurationState>) {
      state.fiscalYears.saving = true;
      state.fiscalYears.error = null;
    },
    closeFiscalYearFailure(state: WritableDraft<ConfigurationState>, action: PayloadAction<string>) {
      state.fiscalYears.saving = false;
      state.fiscalYears.error = action.payload;
    },

    // ─── Payroll Period Transitions ──────────────────────────────
    openPayrollPeriodRequest(state: WritableDraft<ConfigurationState>) {
      state.payrollPeriods.saving = true;
      state.payrollPeriods.error = null;
    },
    openPayrollPeriodFailure(state: WritableDraft<ConfigurationState>, action: PayloadAction<string>) {
      state.payrollPeriods.saving = false;
      state.payrollPeriods.error = action.payload;
    },
    closePayrollPeriodRequest(state: WritableDraft<ConfigurationState>) {
      state.payrollPeriods.saving = true;
      state.payrollPeriods.error = null;
    },
    closePayrollPeriodFailure(state: WritableDraft<ConfigurationState>, action: PayloadAction<string>) {
      state.payrollPeriods.saving = false;
      state.payrollPeriods.error = action.payload;
    },

    // ─── Payroll Batch Transitions ────────────────────────────
    activatePayrollBatchRequest(state: WritableDraft<ConfigurationState>) {
      state.payrollBatches.saving = true;
      state.payrollBatches.error = null;
    },
    activatePayrollBatchFailure(state: WritableDraft<ConfigurationState>, action: PayloadAction<string>) {
      state.payrollBatches.saving = false;
      state.payrollBatches.error = action.payload;
    },
    closePayrollBatchRequest(state: WritableDraft<ConfigurationState>) {
      state.payrollBatches.saving = true;
      state.payrollBatches.error = null;
    },
    closePayrollBatchFailure(state: WritableDraft<ConfigurationState>, action: PayloadAction<string>) {
      state.payrollBatches.saving = false;
      state.payrollBatches.error = action.payload;
    },
    archivePayrollBatchRequest(state: WritableDraft<ConfigurationState>) {
      state.payrollBatches.saving = true;
      state.payrollBatches.error = null;
    },
    archivePayrollBatchFailure(state: WritableDraft<ConfigurationState>, action: PayloadAction<string>) {
      state.payrollBatches.saving = false;
      state.payrollBatches.error = action.payload;
    },
  },
});

/** Configuration slice actions, typed broadly for dynamic entity action dispatch. */
export const configurationActions = configurationSlice.actions as Record<string, any>;
/** Configuration reducer to be combined in the root Redux store. */
export default configurationSlice.reducer;
