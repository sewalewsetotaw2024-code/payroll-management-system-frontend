import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../store/store';
import type {
  AttendanceImport,
  ImportDetail,
  OtCalculationResult,
  CombinedPeriodSummary,
  EmployeeDailyRecords,
} from '../types/attendance.types';

export interface AttendanceState {
  imports: AttendanceImport[];
  selectedImport: ImportDetail | null;
  employeeDailyRecords: EmployeeDailyRecords | null;
  overtimeResults: OtCalculationResult | null;
  summary: CombinedPeriodSummary | null;
  loading: boolean;
  error: string | null;
  importLoading: boolean;
  calculationLoading: boolean;
}

const initialState: AttendanceState = {
  imports: [],
  selectedImport: null,
  employeeDailyRecords: null,
  overtimeResults: null,
  summary: null,
  loading: false,
  error: null,
  importLoading: false,
  calculationLoading: false,
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    fetchImportsRequest(state, action: PayloadAction<{ limit?: number } | undefined>) {
      state.loading = true;
      state.error = null;
      void action;
    },
    fetchImportsSuccess(state, action: PayloadAction<AttendanceImport[]>) {
      state.imports = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchImportsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchImportByIdRequest(state, action: PayloadAction<string>) {
      state.loading = true;
      state.error = null;
      void action;
    },
    fetchImportByIdSuccess(state, action: PayloadAction<ImportDetail>) {
      state.selectedImport = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchImportByIdFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    importFileRequest(state, action: PayloadAction<{ file: File; sheetName?: string }>) {
      state.importLoading = true;
      state.error = null;
      void action;
    },
    importFileSuccess(state) {
      state.importLoading = false;
      state.error = null;
    },
    importFileFailure(state, action: PayloadAction<string>) {
      state.importLoading = false;
      state.error = action.payload;
    },
    calculateOvertimeRequest(state, action: PayloadAction<string>) {
      state.calculationLoading = true;
      state.error = null;
      void action;
    },
    calculateOvertimeSuccess(state, action: PayloadAction<OtCalculationResult>) {
      state.overtimeResults = action.payload;
      state.calculationLoading = false;
      state.error = null;
    },
    calculateOvertimeFailure(state, action: PayloadAction<string>) {
      state.calculationLoading = false;
      state.error = action.payload;
    },
    calculateSummaryRequest(state, action: PayloadAction<string>) {
      state.calculationLoading = true;
      state.error = null;
      void action;
    },
    calculateSummarySuccess(state, action: PayloadAction<CombinedPeriodSummary>) {
      state.summary = action.payload;
      state.calculationLoading = false;
      state.error = null;
    },
    calculateSummaryFailure(state, action: PayloadAction<string>) {
      state.calculationLoading = false;
      state.error = action.payload;
    },
    fetchEmployeeDailyRecordsRequest(state, action: PayloadAction<{ importId: string; employeeId: string }>) {
      state.loading = true;
      state.error = null;
      void action;
    },
    fetchEmployeeDailyRecordsSuccess(state, action: PayloadAction<EmployeeDailyRecords>) {
      state.employeeDailyRecords = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchEmployeeDailyRecordsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    deleteImportRequest(state, action: PayloadAction<string>) {
      state.loading = true;
      state.error = null;
      void action;
    },
    deleteImportSuccess(state) {
      state.loading = false;
      state.error = null;
    },
    deleteImportFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    toggleImportActiveRequest(state, action: PayloadAction<string>) {
      state.loading = true;
      state.error = null;
      void action;
    },
    toggleImportActiveSuccess(state) {
      state.loading = false;
      state.error = null;
    },
    toggleImportActiveFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    clearSelectedImport(state) {
      state.selectedImport = null;
      state.employeeDailyRecords = null;
      state.overtimeResults = null;
      state.summary = null;
    },
  },
});

export const attendanceActions = attendanceSlice.actions;

export const selectAllImports = (state: RootState) => state.attendance.imports;
export const selectSelectedImport = (state: RootState) => state.attendance.selectedImport;
export const selectEmployeeDailyRecords = (state: RootState) => state.attendance.employeeDailyRecords;
export const selectOvertimeResults = (state: RootState) => state.attendance.overtimeResults;
export const selectAttendanceSummary = (state: RootState) => state.attendance.summary;
export const selectAttendanceLoading = (state: RootState) => state.attendance.loading;
export const selectImportLoading = (state: RootState) => state.attendance.importLoading;
export const selectCalculationLoading = (state: RootState) => state.attendance.calculationLoading;
export const selectAttendanceError = (state: RootState) => state.attendance.error;

export default attendanceSlice.reducer;
