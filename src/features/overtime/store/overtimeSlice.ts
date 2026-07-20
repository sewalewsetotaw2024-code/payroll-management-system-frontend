import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../store/store';
import type { AttendanceImport, AttendanceMonthlySummary, ImportDetail, OtCalculationResult } from '../../attendance/types/attendance.types';
import type { OvertimeRule, WorkdaysConfig } from '../../configuration/types/configuration.types';

export interface OvertimeState {
  imports: AttendanceImport[];
  selectedImport: AttendanceImport | null;
  importDetail: ImportDetail | null;
  otResult: OtCalculationResult | null;
  otRules: OvertimeRule[];
  workdaysConfig: WorkdaysConfig | null;
  loading: boolean;
  calculating: boolean;
  error: string | null;
}

const initialState: OvertimeState = {
  imports: [],
  selectedImport: null,
  importDetail: null,
  otResult: null,
  otRules: [],
  workdaysConfig: null,
  loading: false,
  calculating: false,
  error: null,
};

const overtimeSlice = createSlice({
  name: 'overtime',
  initialState,
  reducers: {
    fetchOvertimeDataRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchOvertimeDataSuccess(state, action: PayloadAction<{ imports: AttendanceImport[]; rules: OvertimeRule[]; workdaysConfig: WorkdaysConfig | null }>) {
      state.imports = action.payload.imports;
      state.otRules = action.payload.rules;
      state.workdaysConfig = action.payload.workdaysConfig;
      state.loading = false;
      state.error = null;
    },
    fetchOvertimeDataFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    setSelectedImport(state, action: PayloadAction<AttendanceImport | null>) {
      state.selectedImport = action.payload;
    },
    setImportDetail(state, action: PayloadAction<ImportDetail | null>) {
      state.importDetail = action.payload;
    },
    setOtResult(state, action: PayloadAction<OtCalculationResult | null>) {
      state.otResult = action.payload;
    },
    calculateOvertimeRequest(state) {
      state.calculating = true;
      state.error = null;
    },
    calculateOvertimeSuccess(state, action: PayloadAction<OtCalculationResult>) {
      state.otResult = action.payload;
      state.calculating = false;
      state.error = null;
    },
    calculateOvertimeFailure(state, action: PayloadAction<string>) {
      state.calculating = false;
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const overtimeActions = overtimeSlice.actions;

export const selectOvertimeImports = (state: RootState) => state.overtime.imports;
export const selectSelectedOvertimeImport = (state: RootState) => state.overtime.selectedImport;
export const selectOvertimeImportDetail = (state: RootState) => state.overtime.importDetail;
export const selectOvertimeResult = (state: RootState) => state.overtime.otResult;
export const selectOvertimeRules = (state: RootState) => state.overtime.otRules;
export const selectWorkdaysConfig = (state: RootState) => state.overtime.workdaysConfig;
export const selectOvertimeLoading = (state: RootState) => state.overtime.loading;
export const selectOvertimeCalculating = (state: RootState) => state.overtime.calculating;
export const selectOvertimeError = (state: RootState) => state.overtime.error;

export default overtimeSlice.reducer;
