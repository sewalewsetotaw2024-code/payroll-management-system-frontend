import { call, put, select, fork, all, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import { configurationActions } from './configurationSlice';
import {
  fiscalYearApi,
  taxBracketApi,
  pensionRuleApi,
  overtimeRuleApi,
  payrollPeriodApi,
  allowanceApi,
  deductionApi,
  workdaysApi,
  payrollBatchApi,
  payslipNotificationSettingsApi,
  currencyApi,
  currencyRateApi,
  payFrequencyApi,
} from '../api/configurationApi';
import { toast } from '../../../components/ui/Toast';
import type {
  PayrollPeriod,
  DeductionConfig,
  WorkdaysConfig,
  PayslipNotificationSettings,
} from '../types/configuration.types';
import {
  createEntityFetchSaga,
  createEntitySaveSaga,
  createEntityCRUDSagas,
  createEntityWatchers,
  getErrorMessage,
  extractData,
  extractPagination,
} from './entityFactory';

// ─── Fiscal Years ──────────────────────────────────────────────
/** Saga collection for fiscal years fetch, save, and CRUD operations. */
const fiscalYearsSagas = {
  fetch: createEntityFetchSaga('fiscalYears', fiscalYearApi, {}, configurationActions),
  save: createEntitySaveSaga('fiscalYears', fiscalYearApi, {}, configurationActions),
  ...createEntityCRUDSagas('fiscalYears', fiscalYearApi, {}, configurationActions),
};

// ─── Tax Brackets ──────────────────────────────────────────────
/** Saga collection for tax brackets fetch, save, and CRUD operations with pagination. */
const taxBracketsSagas = {
  fetch: createEntityFetchSaga('taxBrackets', taxBracketApi, { hasPagination: true }, configurationActions),
  save: createEntitySaveSaga('taxBrackets', taxBracketApi, { hasPagination: true }, configurationActions),
  ...createEntityCRUDSagas('taxBrackets', taxBracketApi, { hasPagination: true }, configurationActions),
};

// ─── Pension Rules ─────────────────────────────────────────────
/** Saga collection for pension rules fetch and save operations. */
const pensionRulesSagas = {
  fetch: createEntityFetchSaga('pensionRules', pensionRuleApi, {}, configurationActions),
  save: createEntitySaveSaga('pensionRules', pensionRuleApi, {}, configurationActions),
};

// ─── Overtime Rules ────────────────────────────────────────────
/** Saga collection for overtime rules fetch and save operations. */
const overtimeRulesSagas = {
  fetch: createEntityFetchSaga('overtimeRules', overtimeRuleApi, {}, configurationActions),
  save: createEntitySaveSaga('overtimeRules', overtimeRuleApi, {}, configurationActions),
};

// ─── Payroll Periods ───────────────────────────────────────────
/** Saga collection for payroll periods: fetch (paginated), save, create, update, delete. */
const payrollPeriodsSagas = {
  fetch: createEntityFetchSaga('payrollPeriods', payrollPeriodApi, { hasPagination: true }, configurationActions),
  save: createEntitySaveSaga('payrollPeriods', payrollPeriodApi, { hasPagination: true, singularSave: false }, configurationActions),
  ...createEntityCRUDSagas('payrollPeriods', payrollPeriodApi, { hasPagination: true }, configurationActions),
};



// ─── Fiscal Year Transitions ───────────────────────────────────
/**
 * Saga to activate a fiscal year by ID.
 * Dispatches a re-fetch after successful activation.
 *
 * @param action - Redux action containing the fiscal year ID.
 * @yields API call and fetch trigger effects.
 */
export function* activateFiscalYearSaga(action: PayloadAction<string>): Generator {
  try {
    yield call(fiscalYearApi.activate, action.payload);
    yield put(configurationActions.fetchFiscalYearsRequest());
    yield call([toast, 'success'], 'Fiscal year activated successfully');
  } catch (error) {
    const msg = getErrorMessage(error);
    yield put(configurationActions.activateFiscalYearFailure(msg));
    yield call([toast, 'error'], `Failed to activate fiscal year: ${msg}`);
  }
}

/**
 * Saga to close a fiscal year by ID.
 * Dispatches a re-fetch after successful closure.
 *
 * @param action - Redux action containing the fiscal year ID.
 * @yields API call and fetch trigger effects.
 */
export function* closeFiscalYearSaga(action: PayloadAction<string>): Generator {
  try {
    yield call(fiscalYearApi.close, action.payload);
    yield put(configurationActions.fetchFiscalYearsRequest());
    yield call([toast, 'success'], 'Fiscal year closed successfully');
  } catch (error) {
    const msg = getErrorMessage(error);
    yield put(configurationActions.closeFiscalYearFailure(msg));
    yield call([toast, 'error'], `Failed to close fiscal year: ${msg}`);
  }
}

// ─── Payroll Period Transitions ────────────────────────────────
/**
 * Saga to open a payroll period by ID.
 * Dispatches a re-fetch after successful open.
 *
 * @param action - Redux action containing the payroll period ID.
 * @yields API call and fetch trigger effects.
 */
export function* openPayrollPeriodSaga(action: PayloadAction<string>): Generator {
  try {
    yield call(payrollPeriodApi.open, action.payload);
    yield put(configurationActions.fetchPayrollPeriodsRequest());
    yield call([toast, 'success'], 'Payroll period opened successfully');
  } catch (error) {
    const msg = getErrorMessage(error);
    yield put(configurationActions.openPayrollPeriodFailure(msg));
    yield call([toast, 'error'], `Failed to open period: ${msg}`);
  }
}

/**
 * Saga to close a payroll period by ID.
 * Dispatches a re-fetch after successful closure.
 *
 * @param action - Redux action containing the payroll period ID.
 * @yields API call and fetch trigger effects.
 */
export function* closePayrollPeriodSaga(action: PayloadAction<string>): Generator {
  try {
    yield call(payrollPeriodApi.close, action.payload);
    yield put(configurationActions.fetchPayrollPeriodsRequest());
    yield call([toast, 'success'], 'Payroll period closed successfully');
  } catch (error) {
    const msg = getErrorMessage(error);
    yield put(configurationActions.closePayrollPeriodFailure(msg));
    yield call([toast, 'error'], `Failed to close period: ${msg}`);
  }
}

// ─── Allowances ────────────────────────────────────────────────
/** Saga collection for allowance configs fetch, save, and CRUD operations with pagination. */
const allowancesSagas = {
  fetch: createEntityFetchSaga('allowances', allowanceApi, { hasPagination: true }, configurationActions),
  save: createEntitySaveSaga('allowances', allowanceApi, { hasPagination: true }, configurationActions),
  ...createEntityCRUDSagas('allowances', allowanceApi, { hasPagination: true }, configurationActions),
};

// ─── Deductions ────────────────────────────────────────────────
/** Fetch saga for deductions with pagination support. */
const deductionsFetchSaga = createEntityFetchSaga('deductions', deductionApi, { hasPagination: true }, configurationActions);
/** CRUD saga collection for deductions with pagination support. */
const deductionCRUD = createEntityCRUDSagas('deductions', deductionApi, { hasPagination: true }, configurationActions);

/**
 * Saga to save deduction configurations in batch.
 * Strips transient fields, calls the bulk save API, then silently re-fetches.
 *
 * @param action - Redux action containing salaryStructureId and deductions array.
 * @yields API call and state update effects.
 */
function* saveDeductionsSaga(action: PayloadAction<{ salaryStructureId: string; deductions: DeductionConfig[] }>): Generator {
  try {
    const { deductions } = action.payload;
    const clean = (deductions as any[]).map(
      ({ id, salaryStructureId: _sid, isActive, createdAt, updatedAt, ...rest }) => rest,
    );
    const res: any = yield call(deductionApi.saveBatchSimple, clean);
    const saved = extractData(res);

    try {
      const fetchResponse: any = yield call(deductionApi.getAll, { page: 1, limit: 100 });
      const data = extractData(fetchResponse);
      const pagination = extractPagination(fetchResponse);
      yield put(configurationActions.fetchDeductionsSuccess({ data: Array.isArray(data) ? data : [], pagination }));
    } catch {
      yield put(configurationActions.saveDeductionsSuccess(saved));
    }
  } catch (error) {
    yield put(configurationActions.saveDeductionsFailure(getErrorMessage(error)));
  }
}

/**
 * Saga to create a deduction configuration.
 * Supports both salary-structure-scoped and simple creation, then silently re-fetches.
 *
 * @param action - Redux action containing optional salaryStructureId and the deduction data.
 * @yields API call and state update effects.
 */
function* createDeductionSaga(action: PayloadAction<{ salaryStructureId?: string; data: Omit<DeductionConfig, 'id'> }>): Generator {
  try {
    let newItem: any;
    if (action.payload.salaryStructureId) {
      const response: any = yield call(deductionApi.create, action.payload.salaryStructureId, action.payload.data);
      newItem = extractData(response);
    } else {
      const response: any = yield call(deductionApi.createSimple, action.payload.data);
      newItem = extractData(response);
    }

    try {
      const fetchResponse: any = yield call(deductionApi.getAll, { page: 1, limit: 100 });
      const data = extractData(fetchResponse);
      const pagination = extractPagination(fetchResponse);
      yield put(configurationActions.fetchDeductionsSuccess({ data: Array.isArray(data) ? data : [], pagination }));
    } catch {
      const current: DeductionConfig[] = yield select((s: any) => s.configuration.deductions.data);
      yield put(configurationActions.saveDeductionsSuccess([...current, newItem]));
    }
  } catch (error) {
    yield put(configurationActions.saveDeductionsFailure(getErrorMessage(error)));
  }
}

/** Saga collection for deductions including fetch, save, create, update, and delete. */
const deductionsSagas = {
  fetch: deductionsFetchSaga,
  save: saveDeductionsSaga,
  create: createDeductionSaga,
  update: deductionCRUD.update,
  delete: deductionCRUD.delete,
};

// ─── Workdays ──────────────────────────────────────────────────
/**
 * Saga to fetch the workdays configuration.
 * Calls the workdays API and dispatches success or failure.
 *
 * @yields API call and state update effects.
 */
function* fetchWorkdaysSaga(): Generator {
  try {
    const response: any = yield call(workdaysApi.get);
    const data = extractData(response);
    yield put(configurationActions.fetchWorkdaysSuccess(data));
  } catch (error) {
    yield put(configurationActions.fetchWorkdaysFailure(getErrorMessage(error)));
  }
}

/**
 * Saga to save the workdays configuration.
 * Calls the workdays save API and dispatches success or failure.
 *
 * @param action - Redux action containing the WorkdaysConfig payload.
 * @yields API call and state update effects.
 */
function* saveWorkdaysSaga(action: PayloadAction<WorkdaysConfig>): Generator {
  try {
    const response: any = yield call(workdaysApi.save, action.payload);
    const data = extractData(response);
    yield put(configurationActions.saveWorkdaysSuccess(data));
    yield put(configurationActions.fetchPayrollPeriodsRequest({ page: 1, limit: 12 })); // Re-fetch to sync computed fields
  } catch (error) {
    yield put(configurationActions.saveWorkdaysFailure(getErrorMessage(error)));
  }
}

/** Saga collection for workdays configuration fetch and save operations. */
const workdaysSagas = { fetch: fetchWorkdaysSaga, save: saveWorkdaysSaga };

// ─── Payroll Batches ──────────────────────────────────────────
/** Saga collection for payroll batches fetch, save, and CRUD operations with pagination. */
const payrollBatchesSagas = {
  fetch: createEntityFetchSaga('payrollBatches', payrollBatchApi, { hasPagination: true }, configurationActions),
  save: createEntitySaveSaga('payrollBatches', payrollBatchApi, { hasPagination: true }, configurationActions),
  ...createEntityCRUDSagas('payrollBatches', payrollBatchApi, { hasPagination: true }, configurationActions),
};

/** Saga to activate a payroll batch by ID. */
function* activatePayrollBatchSaga(action: PayloadAction<string>): Generator {
  try {
    yield call(payrollBatchApi.activate, action.payload);
    yield put(configurationActions.fetchPayrollBatchesRequest());
  } catch (error) {
    yield put(configurationActions.activatePayrollBatchFailure(getErrorMessage(error)));
  }
}

/** Saga to close a payroll batch by ID. */
function* closePayrollBatchSaga(action: PayloadAction<string>): Generator {
  try {
    yield call(payrollBatchApi.close, action.payload);
    yield put(configurationActions.fetchPayrollBatchesRequest());
  } catch (error) {
    yield put(configurationActions.closePayrollBatchFailure(getErrorMessage(error)));
  }
}

/** Saga to archive a payroll batch by ID. */
function* archivePayrollBatchSaga(action: PayloadAction<string>): Generator {
  try {
    yield call(payrollBatchApi.archive, action.payload);
    yield put(configurationActions.fetchPayrollBatchesRequest());
  } catch (error) {
    yield put(configurationActions.archivePayrollBatchFailure(getErrorMessage(error)));
  }
}

// ─── Payslip Notification Settings ───────────────────────────
/** Saga to fetch payslip notification settings (singleton get). */
function* fetchPayslipNotificationSettingsSaga(): Generator {
  try {
    const response: any = yield call(payslipNotificationSettingsApi.get);
    const data = extractData(response);
    yield put(configurationActions.fetchPayslipNotificationSettingsSuccess(data));
  } catch (error) {
    yield put(configurationActions.fetchPayslipNotificationSettingsFailure(getErrorMessage(error)));
  }
}

/** Saga to save (upsert) payslip notification settings. */
function* savePayslipNotificationSettingsSaga(action: PayloadAction<PayslipNotificationSettings>): Generator {
  try {
    const response: any = yield call(payslipNotificationSettingsApi.save, action.payload);
    const data = extractData(response);
    yield put(configurationActions.savePayslipNotificationSettingsSuccess(data));
  } catch (error) {
    yield put(configurationActions.savePayslipNotificationSettingsFailure(getErrorMessage(error)));
  }
}

/** Saga collection for payslip notification settings fetch and save. */
const payslipNotificationSettingsSagas = { fetch: fetchPayslipNotificationSettingsSaga, save: savePayslipNotificationSettingsSaga };

// ─── Currencies ────────────────────────────────────────────
/** Saga collection for currencies fetch, save, and CRUD. */
const currenciesSagas = {
  fetch: createEntityFetchSaga('currencies', currencyApi, {}, configurationActions),
  save: createEntitySaveSaga('currencies', currencyApi, {}, configurationActions),
  ...createEntityCRUDSagas('currencies', currencyApi, {}, configurationActions),
};

// ─── Currency Rates ──────────────────────────────────────────
/** Saga collection for currency rates fetch and save. */
const currencyRatesSagas = {
  fetch: createEntityFetchSaga('currencyRates', currencyRateApi, { hasPagination: true }, configurationActions),
  save: createEntitySaveSaga('currencyRates', currencyRateApi, { hasPagination: true }, configurationActions),
};

// ─── Pay Frequencies ─────────────────────────────────────────
/** Saga collection for pay frequencies fetch and save. */
const payFrequenciesSagas = {
  fetch: createEntityFetchSaga('payFrequencies', payFrequencyApi, { hasPagination: true }, configurationActions),
  save: createEntitySaveSaga('payFrequencies', payFrequencyApi, { hasPagination: true }, configurationActions),
};

// ─── Root Configuration Saga ───────────────────────────────────
/**
 * Root saga for the configuration feature.
 * Forks all entity watchers and transition watchers in parallel.
 *
 * @yields Forked watcher sagas for all entity types and status transitions.
 */
export default function* configurationSaga() {
  yield all([
    ...createEntityWatchers('fiscalYears', { hasCRUD: true }, fiscalYearsSagas, configurationActions).map(fork),
    ...createEntityWatchers('taxBrackets', { hasPagination: true, hasCRUD: true }, taxBracketsSagas, configurationActions).map(fork),
    ...createEntityWatchers('pensionRules', {}, pensionRulesSagas, configurationActions).map(fork),
    ...createEntityWatchers('overtimeRules', {}, overtimeRulesSagas, configurationActions).map(fork),
    ...createEntityWatchers('payrollPeriods', { hasPagination: true, hasCRUD: true }, payrollPeriodsSagas, configurationActions).map(fork),
    ...createEntityWatchers('allowances', { hasPagination: true, hasCRUD: true }, allowancesSagas, configurationActions).map(fork),
    ...createEntityWatchers('deductions', { hasPagination: true, hasCRUD: true }, deductionsSagas, configurationActions).map(fork),
    ...createEntityWatchers('workdays', {}, workdaysSagas, configurationActions).map(fork),
    ...createEntityWatchers('payrollBatches', { hasPagination: true, hasCRUD: true }, payrollBatchesSagas, configurationActions).map(fork),
    ...createEntityWatchers('payslipNotificationSettings', { singularSave: true }, payslipNotificationSettingsSagas, configurationActions).map(fork),
    ...createEntityWatchers('currencies', { hasCRUD: true }, currenciesSagas, configurationActions).map(fork),
    ...createEntityWatchers('currencyRates', { hasPagination: true }, currencyRatesSagas, configurationActions).map(fork),
    ...createEntityWatchers('payFrequencies', { hasPagination: true }, payFrequenciesSagas, configurationActions).map(fork),

    // Transition watchers
    fork(function* () { yield takeLatest(configurationActions.activateFiscalYearRequest.type, activateFiscalYearSaga); }),
    fork(function* () { yield takeLatest(configurationActions.closeFiscalYearRequest.type, closeFiscalYearSaga); }),
    fork(function* () { yield takeLatest(configurationActions.openPayrollPeriodRequest.type, openPayrollPeriodSaga); }),
    fork(function* () { yield takeLatest(configurationActions.closePayrollPeriodRequest.type, closePayrollPeriodSaga); }),
    fork(function* () { yield takeLatest(configurationActions.activatePayrollBatchRequest.type, activatePayrollBatchSaga); }),
    fork(function* () { yield takeLatest(configurationActions.closePayrollBatchRequest.type, closePayrollBatchSaga); }),
    fork(function* () { yield takeLatest(configurationActions.archivePayrollBatchRequest.type, archivePayrollBatchSaga); }),
  ]);
}
