import { call, put, select, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { PaginationMeta, PaginationParams } from '../types/configuration.types';

// ─── Response Helpers ───────────────────────────────────────────
/**
 * Extracts a human-readable error message from an unknown error value.
 * Handles Error instances, Axios error responses, and generic errors.
 *
 * @param error - The unknown error value to extract a message from.
 * @returns A string representation of the error message.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const axiosErr = error as any;
    return axiosErr.response?.data?.message || axiosErr.message || 'An error occurred';
  }
  return 'An unknown error occurred';
}

/**
 * Extracts the data payload from an API response.
 * Handles both nested `response.data.data` and flat `response.data` structures.
 *
 * @param response - The raw API response object.
 * @returns The extracted data payload.
 */
export function extractData(response: any): any {
  return response.data?.data ?? response.data;
}

/**
 * Extracts pagination metadata from an API response.
 *
 * @param response - The raw API response object.
 * @returns PaginationMeta if present, otherwise undefined.
 */
export function extractPagination(response: any): PaginationMeta | undefined {
  return response.data?.pagination;
}

// ─── Slice Reducer Factory ──────────────────────────────────────

/** Options for customizing entity reducer generation behavior. */
export interface EntityReducersOptions {
  hasPagination?: boolean;
  hasCRUD?: boolean;
  singularSave?: boolean;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function singular(name: string): string {
  return name.endsWith('s') ? name.slice(0, -1) : name;
}

/**
 * Creates a set of Redux slice reducer functions for a named entity.
 * Generates fetch request/success/failure, save request/success/failure,
 * and optionally CRUD (create/update/delete) request reducers.
 *
 * @param name - The entity name (e.g., "fiscalYears") used for action naming.
 * @param options - Optional flags for pagination, CRUD, and singular save mode.
 * @returns A record of reducer functions keyed by action name.
 */
export function createEntityReducers(
  name: string,
  options?: EntityReducersOptions,
): Record<string, (state: any, action: any) => void> {
  const { hasPagination = false, hasCRUD = false, singularSave = false } = options ?? {};

  const Cap = capitalize(name);
  const Sing = capitalize(singular(name));
  const saveCap = singularSave ? Sing : Cap;
  const key = name;

  const r: Record<string, (state: any, action: any) => void> = {};

  r[`fetch${Cap}Request`] = (state: any) => {
    state[key].loading = true;
    state[key].saving = false;
    state[key].error = null;
  };

  if (hasPagination) {
    r[`fetch${Cap}Success`] = (
      state: any,
      action: PayloadAction<{ data: any[]; pagination?: PaginationMeta }>,
    ) => {
      state[key].data = action.payload.data;
      state[key].pagination = action.payload.pagination;
      state[key].loading = false;
      state[key].saving = false;
    };
  } else {
    r[`fetch${Cap}Success`] = (state: any, action: PayloadAction<any[]>) => {
      state[key].data = action.payload;
      state[key].loading = false;
      state[key].saving = false;
    };
  }

  r[`fetch${Cap}Failure`] = (state: any, action: PayloadAction<string>) => {
    state[key].loading = false;
    state[key].saving = false;
    state[key].error = action.payload;
  };

  r[`save${saveCap}Request`] = (state: any) => {
    state[key].saving = true;
    state[key].error = null;
  };

  r[`save${saveCap}Success`] = (state: any, action: PayloadAction<any[]>) => {
    state[key].data = action.payload;
    state[key].saving = false;
  };

  r[`save${saveCap}Failure`] = (state: any, action: PayloadAction<string>) => {
    state[key].saving = false;
    state[key].error = action.payload;
  };

  if (hasCRUD) {
    r[`create${Sing}Request`] = (state: any) => {
      state[key].saving = true;
    };
    r[`update${Sing}Request`] = (state: any) => {
      state[key].saving = true;
    };
    r[`delete${Sing}Request`] = (state: any) => {
      state[key].saving = true;
    };
  }

  return r as any;
}

// ─── Saga Factory ───────────────────────────────────────────────

/** Expected shape of an API client object used by entity sagas. */
export interface EntitySagaApi {
  getAll: (params?: any) => Promise<any>;
  saveBatch?: (...args: any[]) => Promise<any>;
  create?: (...args: any[]) => Promise<any>;
  update?: (id: string, data: any) => Promise<any>;
  delete?: (id: string) => Promise<any>;
}

/** Options for customizing entity saga generation behavior. */
export interface EntitySagaOptions {
  hasPagination?: boolean;
  hasCRUD?: boolean;
  singularSave?: boolean;
  extractFetchData?: (res: any) => any;
  preprocessSavePayload?: (payload: any) => any;
  customSaveSaga?: (action: any) => Generator;
  customCreateSaga?: (action: any) => Generator;
  customUpdateSaga?: (action: any) => Generator;
  customDeleteSaga?: (action: any) => Generator;
}

function getSingularActions(name: string, singularSave: boolean, actions: any) {
  const Cap = capitalize(name);
  const Sing = capitalize(singular(name));
  const saveCap = singularSave ? Sing : Cap;
  return { Cap, Sing, saveCap, actions };
}

/**
 * Creates a generator saga function that fetches entity data from an API.
 * Handles paginated and non-paginated responses, dispatching appropriate success actions.
 *
 * @param name - The entity name (e.g., "fiscalYears") used for action naming.
 * @param api - The API client object with a getAll method.
 * @param options - Options including hasPagination and extractFetchData.
 * @param actions - The Redux actions object for dispatching fetch results.
 * @returns A generator saga function that accepts optional pagination params.
 */
export function createEntityFetchSaga(
  name: string,
  api: EntitySagaApi,
  options: EntitySagaOptions,
  actions: any,
): () => Generator {
  const { hasPagination = false } = options;
  const { Cap } = getSingularActions(name, false, actions);
  const extract = options.extractFetchData ?? extractData;

  return function* fetchSaga(action?: PayloadAction<PaginationParams | undefined>): Generator {
    try {
      const params = action?.payload;
      const res: any = yield call(api.getAll, params);
      const pagination = hasPagination ? extractPagination(res) : undefined;
      const data = extract(res);

      if (hasPagination) {
        yield put(actions[`fetch${Cap}Success`]({
          data: Array.isArray(data) ? data : [],
          pagination,
        }));
      } else {
        yield put(actions[`fetch${Cap}Success`](Array.isArray(data) ? data : []));
      }
    } catch (error) {
      yield put(actions[`fetch${Cap}Failure`](getErrorMessage(error)));
    }
  };
}

/**
 * Creates a generator saga function that saves entity data in batch.
 * Attempts a silent background re-fetch after saving to keep state in sync.
 *
 * @param name - The entity name (e.g., "fiscalYears") used for action naming.
 * @param api - The API client object with saveBatch and getAll methods.
 * @param options - Options including hasPagination, singularSave, and preprocessSavePayload.
 * @param actions - The Redux actions object for dispatching save results.
 * @returns A generator saga function that accepts the save payload.
 */
export function createEntitySaveSaga(
  name: string,
  api: EntitySagaApi,
  options: EntitySagaOptions,
  actions: any,
): (action: any) => Generator {
  const { hasPagination = false, singularSave = false } = options;
  const { Cap, saveCap } = getSingularActions(name, singularSave, actions);
  const extract = options.extractFetchData ?? extractData;

  return function* saveSaga(action: any): Generator {
    try {
      const payload = options.preprocessSavePayload
        ? options.preprocessSavePayload(action.payload)
        : action.payload;
      const response: any = yield call(api.saveBatch!, payload);
      const saved = extract(response);

      try {
        const fetchParams = hasPagination ? { page: 1, limit: 100 } : undefined;
        const fetchResponse: any = yield call(api.getAll, fetchParams);
        const fetchData = extract(fetchResponse);
        const pagination = hasPagination ? extractPagination(fetchResponse) : undefined;

        if (hasPagination) {
          yield put(actions[`fetch${Cap}Success`]({
            data: Array.isArray(fetchData) ? fetchData : [],
            pagination,
          }));
        } else {
          yield put(actions[`fetch${Cap}Success`](Array.isArray(fetchData) ? fetchData : []));
        }
      } catch {
        yield put(actions[`save${saveCap}Success`](Array.isArray(saved) ? saved : []));
      }
    } catch (error) {
      yield put(actions[`save${saveCap}Failure`](getErrorMessage(error)));
    }
  };
}

function* silentRefetch<T>(
  api: EntitySagaApi,
  actions: any,
  fetchSuccessAction: string,
  fallbackAction: string,
  fallbackData: any,
  hasPagination: boolean,
  extract: (res: any) => any,
): Generator {
  try {
    const fetchParams = hasPagination ? { page: 1, limit: 100 } : undefined;
    const fetchResponse: any = yield call(api.getAll, fetchParams);
    const fetchData = extract(fetchResponse);
    const pagination = hasPagination ? extractPagination(fetchResponse) : undefined;

    if (hasPagination) {
      yield put(actions[fetchSuccessAction]({
        data: Array.isArray(fetchData) ? fetchData : [],
        pagination,
      }));
    } else {
      yield put(actions[fetchSuccessAction](Array.isArray(fetchData) ? fetchData : []));
    }
  } catch {
    yield put(actions[fallbackAction](fallbackData));
  }
}

/**
 * Creates create, update, and delete generator sagas with silent background re-fetch.
 * Each saga calls the respective API method, then silently re-fetches the full entity list.
 *
 * @param name - The entity name (e.g., "fiscalYears") used for action naming.
 * @param api - The API client object with create, update, and delete methods.
 * @param options - Options including hasPagination and extractFetchData.
 * @param actions - The Redux actions object for dispatching results.
 * @returns An object with create, update, and delete generator functions.
 */
export function createEntityCRUDSagas(
  name: string,
  api: EntitySagaApi,
  options: EntitySagaOptions,
  actions: any,
): {
  create: (action: any) => Generator;
  update: (action: any) => Generator;
  delete: (action: any) => Generator;
} {
  const { hasPagination = false } = options;
  const { Cap, Sing, saveCap } = getSingularActions(name, false, actions);
  const extract = options.extractFetchData ?? extractData;

  function* createSaga(action: any): Generator {
    try {
      const response: any = yield call(api.create!, action.payload);
      const newItem = extract(response);

      yield* silentRefetch(
        api, actions,
        `fetch${Cap}Success`,
        `save${saveCap}Success`,
        [...(yield select((s: any) => s.configuration[name].data)), newItem],
        hasPagination,
        extract,
      );
    } catch (error) {
      yield put(actions[`save${saveCap}Failure`](getErrorMessage(error)));
    }
  }

  function* updateSaga(action: PayloadAction<{ id: string; data: any }>): Generator {
    try {
      const response: any = yield call(api.update!, action.payload.id, action.payload.data);
      const updatedItem = extract(response);

      yield* silentRefetch(
        api, actions,
        `fetch${Cap}Success`,
        `save${saveCap}Success`,
        (yield select((s: any) => s.configuration[name].data)).map(
          (item: any) => item.id === updatedItem.id ? updatedItem : item,
        ),
        hasPagination,
        extract,
      );
    } catch (error) {
      yield put(actions[`save${saveCap}Failure`](getErrorMessage(error)));
    }
  }

  function* deleteSaga(action: PayloadAction<string>): Generator {
    try {
      yield call(api.delete!, action.payload);

      yield* silentRefetch(
        api, actions,
        `fetch${Cap}Success`,
        `save${saveCap}Success`,
        (yield select((s: any) => s.configuration[name].data)).filter(
          (item: any) => item.id !== action.payload,
        ),
        hasPagination,
        extract,
      );
    } catch (error) {
      yield put(actions[`save${saveCap}Failure`](getErrorMessage(error)));
    }
  }

  return { create: createSaga, update: updateSaga, delete: deleteSaga };
}

/**
 * Creates watcher generator functions for an entity.
 * Each watcher listens for the corresponding request action and forks the saga handler.
 * Use `all([...watchers.map(fn => fn())])` in the root saga.
 *
 * @param name - The entity name (e.g., "fiscalYears") used for action naming.
 * @param options - Options including hasCRUD, hasPagination, and singularSave.
 * @param sagas - An object containing fetch, save, and optional CRUD saga functions.
 * @param actions - The Redux actions object for action type lookups.
 * @returns An array of watcher generator functions.
 */
export function createEntityWatchers(
  name: string,
  options: { hasPagination?: boolean; hasCRUD?: boolean; singularSave?: boolean },
  sagas: {
    fetch: () => Generator;
    save: (action: any) => Generator;
    create?: (action: any) => Generator;
    update?: (action: any) => Generator;
    delete?: (action: any) => Generator;
  },
  actions: any,
): Array<() => Generator> {
  const { hasCRUD = false, singularSave = false } = options;
  const { Cap, Sing, saveCap } = getSingularActions(name, singularSave, actions);

  const watchers: Array<() => Generator> = [];

  function* watchFetch(): Generator {
    yield takeLatest(actions[`fetch${Cap}Request`].type, sagas.fetch);
  }

  function* watchSave(): Generator {
    yield takeLatest(actions[`save${saveCap}Request`].type, sagas.save);
  }

  watchers.push(watchFetch, watchSave);

  if (hasCRUD && sagas.create) {
    function* watchCreate(): Generator {
      yield takeLatest(actions[`create${Sing}Request`].type, sagas.create!);
    }
    function* watchUpdate(): Generator {
      yield takeLatest(actions[`update${Sing}Request`].type, sagas.update!);
    }
    function* watchDelete(): Generator {
      yield takeLatest(actions[`delete${Sing}Request`].type, sagas.delete!);
    }
    watchers.push(watchCreate, watchUpdate, watchDelete);
  }

  return watchers;
}
