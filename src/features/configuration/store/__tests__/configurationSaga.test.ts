import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runSaga } from 'redux-saga';
import {
  activateFiscalYearSaga,
  closeFiscalYearSaga,
  openPayrollPeriodSaga,
  closePayrollPeriodSaga,
} from '../configurationSaga';
import { configurationActions } from '../configurationSlice';
import { fiscalYearApi, payrollPeriodApi } from '../../api/configurationApi';
import { toast } from '../../../../components/ui/Toast';

// ── Mocks ──────────────────────────────────────────────────────
vi.mock('../../api/configurationApi', () => ({
  fiscalYearApi: {
    activate: vi.fn(),
    close: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    saveBatch: vi.fn(),
  },
  taxBracketApi: { getAll: vi.fn(), saveBatch: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  pensionRuleApi: { getAll: vi.fn(), saveBatch: vi.fn() },
  overtimeRuleApi: { getAll: vi.fn(), saveBatch: vi.fn() },
  payrollPeriodApi: {
    open: vi.fn(),
    close: vi.fn(),
    getAll: vi.fn(),
    getCurrent: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    saveConfiguration: vi.fn(),
    preview: vi.fn(),
  },
  allowanceApi: { getAll: vi.fn(), saveBatch: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  deductionApi: { getAll: vi.fn(), saveBatch: vi.fn(), saveBatchSimple: vi.fn(), create: vi.fn(), createSimple: vi.fn(), update: vi.fn(), delete: vi.fn() },
  workdaysApi: { get: vi.fn(), save: vi.fn(), update: vi.fn(), patch: vi.fn() },
  payrollBatchApi: { getAll: vi.fn(), saveBatch: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), activate: vi.fn(), close: vi.fn(), archive: vi.fn() },
  payslipNotificationSettingsApi: { get: vi.fn(), save: vi.fn() },
  currencyApi: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), setBase: vi.fn() },
  currencyRateApi: { getAll: vi.fn(), saveBatch: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  payFrequencyApi: { getAll: vi.fn(), saveBatch: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  employeeApi: { getAll: vi.fn(), getById: vi.fn() },
  syncApi: { triggerSync: vi.fn(), getSyncLogs: vi.fn(), getWebhookEvents: vi.fn() },
  enumApi: { getDeductionTypes: vi.fn(), getEarningTypes: vi.fn() },
  employeeDeductionApi: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), getActiveByEmployee: vi.fn(), recordPayment: vi.fn(), bulkAssign: vi.fn() },
}));

vi.mock('../../../../components/ui/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../entityFactory', () => ({
  getErrorMessage: (error: any) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
      return error.response?.data?.message || error.message || 'An error occurred';
    }
    return 'An unknown error occurred';
  },
  createEntityFetchSaga: vi.fn(() => function* () {}),
  createEntitySaveSaga: vi.fn(() => function* () {}),
  createEntityCRUDSagas: vi.fn(() => ({ create: function* () {}, update: function* () {}, delete: function* () {} })),
  createEntityWatchers: vi.fn(() => []),
  extractData: (res: any) => res.data?.data ?? res.data,
  extractPagination: vi.fn(),
}));

vi.mock('../configurationSlice', () => ({
  configurationActions: {
    fetchFiscalYearsRequest: () => ({ type: 'configuration/fetchFiscalYearsRequest' }),
    activateFiscalYearFailure: (msg: string) => ({ type: 'configuration/activateFiscalYearFailure', payload: msg }),
    closeFiscalYearFailure: (msg: string) => ({ type: 'configuration/closeFiscalYearFailure', payload: msg }),
    fetchPayrollPeriodsRequest: () => ({ type: 'configuration/fetchPayrollPeriodsRequest' }),
    openPayrollPeriodFailure: (msg: string) => ({ type: 'configuration/openPayrollPeriodFailure', payload: msg }),
    closePayrollPeriodFailure: (msg: string) => ({ type: 'configuration/closePayrollPeriodFailure', payload: msg }),
  },
}));

// ── Helper ─────────────────────────────────────────────────────
async function runSagaAndCollect(saga: any, action: any) {
  const dispatched: any[] = [];
  await runSaga(
    {
      dispatch: (act: any) => dispatched.push(act),
      getState: () => ({}),
    },
    saga,
    action,
  ).toPromise();
  return dispatched;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════
//  activateFiscalYearSaga
// ════════════════════════════════════════════════════════════════
describe('activateFiscalYearSaga', () => {
  it('should call API, dispatch fetch, and show success toast on success', async () => {
    (fiscalYearApi.activate as any).mockResolvedValue({ data: { success: true } });

    const dispatched = await runSagaAndCollect(activateFiscalYearSaga, { payload: 'fy-1' } as any);

    expect(fiscalYearApi.activate).toHaveBeenCalledWith('fy-1');
    expect(dispatched).toContainEqual(configurationActions.fetchFiscalYearsRequest());
    expect(toast.success).toHaveBeenCalledWith('Fiscal year activated successfully');
  });

  it('should dispatch failure and show error toast on API error', async () => {
    const error = new Error('Cannot activate fiscal year while another is active');
    (fiscalYearApi.activate as any).mockRejectedValue(error);

    const dispatched = await runSagaAndCollect(activateFiscalYearSaga, { payload: 'fy-1' } as any);

    expect(dispatched).toContainEqual(
      configurationActions.activateFiscalYearFailure('Cannot activate fiscal year while another is active'),
    );
    expect(toast.error).toHaveBeenCalledWith(
      'Failed to activate fiscal year: Cannot activate fiscal year while another is active',
    );
  });

  it('should handle Axios error responses', async () => {
    const axiosError = {
      response: { data: { message: 'CONFLICT: Active fiscal year exists' } },
      message: 'Request failed with status code 409',
    };
    (fiscalYearApi.activate as any).mockRejectedValue(axiosError);

    const dispatched = await runSagaAndCollect(activateFiscalYearSaga, { payload: 'fy-1' } as any);

    expect(dispatched).toContainEqual(
      configurationActions.activateFiscalYearFailure('CONFLICT: Active fiscal year exists'),
    );
    expect(toast.error).toHaveBeenCalledWith(
      'Failed to activate fiscal year: CONFLICT: Active fiscal year exists',
    );
  });
});

// ════════════════════════════════════════════════════════════════
//  closeFiscalYearSaga
// ════════════════════════════════════════════════════════════════
describe('closeFiscalYearSaga', () => {
  it('should call API, dispatch fetch, and show success toast on success', async () => {
    (fiscalYearApi.close as any).mockResolvedValue({ data: { success: true } });

    const dispatched = await runSagaAndCollect(closeFiscalYearSaga, { payload: 'fy-1' } as any);

    expect(fiscalYearApi.close).toHaveBeenCalledWith('fy-1');
    expect(dispatched).toContainEqual(configurationActions.fetchFiscalYearsRequest());
    expect(toast.success).toHaveBeenCalledWith('Fiscal year closed successfully');
  });

  it('should dispatch failure and show error toast on API error', async () => {
    const error = new Error('Cannot close fiscal year in current status');
    (fiscalYearApi.close as any).mockRejectedValue(error);

    const dispatched = await runSagaAndCollect(closeFiscalYearSaga, { payload: 'fy-1' } as any);

    expect(dispatched).toContainEqual(
      configurationActions.closeFiscalYearFailure('Cannot close fiscal year in current status'),
    );
    expect(toast.error).toHaveBeenCalledWith(
      'Failed to close fiscal year: Cannot close fiscal year in current status',
    );
  });
});

// ════════════════════════════════════════════════════════════════
//  openPayrollPeriodSaga
// ════════════════════════════════════════════════════════════════
describe('openPayrollPeriodSaga', () => {
  it('should call API, dispatch fetch, and show success toast on success', async () => {
    (payrollPeriodApi.open as any).mockResolvedValue({ data: { success: true } });

    const dispatched = await runSagaAndCollect(openPayrollPeriodSaga, { payload: 'pp-1' } as any);

    expect(payrollPeriodApi.open).toHaveBeenCalledWith('pp-1');
    expect(dispatched).toContainEqual(configurationActions.fetchPayrollPeriodsRequest());
    expect(toast.success).toHaveBeenCalledWith('Payroll period opened successfully');
  });

  it('should dispatch failure and show error toast on API error', async () => {
    const error = new Error('Cannot open period while another is active');
    (payrollPeriodApi.open as any).mockRejectedValue(error);

    const dispatched = await runSagaAndCollect(openPayrollPeriodSaga, { payload: 'pp-1' } as any);

    expect(dispatched).toContainEqual(
      configurationActions.openPayrollPeriodFailure('Cannot open period while another is active'),
    );
    expect(toast.error).toHaveBeenCalledWith(
      'Failed to open period: Cannot open period while another is active',
    );
  });
});

// ════════════════════════════════════════════════════════════════
//  closePayrollPeriodSaga
// ════════════════════════════════════════════════════════════════
describe('closePayrollPeriodSaga', () => {
  it('should call API, dispatch fetch, and show success toast on success', async () => {
    (payrollPeriodApi.close as any).mockResolvedValue({ data: { success: true } });

    const dispatched = await runSagaAndCollect(closePayrollPeriodSaga, { payload: 'pp-1' } as any);

    expect(payrollPeriodApi.close).toHaveBeenCalledWith('pp-1');
    expect(dispatched).toContainEqual(configurationActions.fetchPayrollPeriodsRequest());
    expect(toast.success).toHaveBeenCalledWith('Payroll period closed successfully');
  });

  it('should dispatch failure and show error toast on API error', async () => {
    const error = new Error('Cannot close period in current status');
    (payrollPeriodApi.close as any).mockRejectedValue(error);

    const dispatched = await runSagaAndCollect(closePayrollPeriodSaga, { payload: 'pp-1' } as any);

    expect(dispatched).toContainEqual(
      configurationActions.closePayrollPeriodFailure('Cannot close period in current status'),
    );
    expect(toast.error).toHaveBeenCalledWith(
      'Failed to close period: Cannot close period in current status',
    );
  });
});
