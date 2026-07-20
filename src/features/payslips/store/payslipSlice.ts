import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../store/store';
import type { MyPeriodsResponse, PayslipDetail, GenerationStatus } from '../types/payslip.types';
import type { GeneratePayslipResult, BatchGenerateResult } from '../../payslipTemplates/types/payslipTemplate.types';

export interface PayslipState {
  myPeriods: MyPeriodsResponse | null;
  selectedPayslip: PayslipDetail | null;
  generationStatus: GenerationStatus | null;
  payslipPdfUrl: string | null;
  errorMessage: string | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
}

const initialState: PayslipState = {
  myPeriods: null,
  selectedPayslip: null,
  generationStatus: null,
  payslipPdfUrl: null,
  errorMessage: null,
  loading: false,
  generating: false,
  error: null,
};

const payslipSlice = createSlice({
  name: 'payslips',
  initialState,
  reducers: {
    fetchMyPeriodsRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchMyPeriodsSuccess(state, action: PayloadAction<MyPeriodsResponse>) {
      state.myPeriods = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchMyPeriodsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchMyPayslipDetailRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchMyPayslipDetailSuccess(state, action: PayloadAction<PayslipDetail>) {
      state.selectedPayslip = action.payload;
      state.generationStatus = action.payload.generationStatus;
      state.payslipPdfUrl = action.payload.payslipPdfUrl;
      state.errorMessage = action.payload.errorMessage;
      state.loading = false;
      state.error = null;
    },
    fetchMyPayslipDetailFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    generateMyPayslipRequest(state) {
      state.generating = true;
      state.error = null;
    },
    generateMyPayslipSuccess(state, action: PayloadAction<GeneratePayslipResult>) {
      state.generating = false;
      state.error = null;
    },
    generateMyPayslipFailure(state, action: PayloadAction<string>) {
      state.generating = false;
      state.error = action.payload;
    },
    batchGeneratePayslipsRequest(state) {
      state.generating = true;
      state.error = null;
    },
    batchGeneratePayslipsSuccess(state, action: PayloadAction<BatchGenerateResult>) {
      state.generating = false;
      state.error = null;
    },
    batchGeneratePayslipsFailure(state, action: PayloadAction<string>) {
      state.generating = false;
      state.error = action.payload;
    },
    getPayslipStatusRequest(state) {
      state.loading = true;
      state.error = null;
    },
    getPayslipStatusSuccess(state, action: PayloadAction<{ generationStatus: GenerationStatus; payslipPdfUrl: string | null; errorMessage: string | null }>) {
      state.generationStatus = action.payload.generationStatus;
      state.payslipPdfUrl = action.payload.payslipPdfUrl;
      state.errorMessage = action.payload.errorMessage;
      state.loading = false;
      state.error = null;
    },
    getPayslipStatusFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    clearSelectedPayslip(state) {
      state.selectedPayslip = null;
      state.generationStatus = null;
      state.payslipPdfUrl = null;
      state.errorMessage = null;
    },
  },
});

export const payslipActions = payslipSlice.actions;

export const selectMyPeriods = (state: RootState) => state.payslips.myPeriods;
export const selectSelectedPayslip = (state: RootState) => state.payslips.selectedPayslip;
export const selectGenerationStatus = (state: RootState) => state.payslips.generationStatus;
export const selectPayslipPdfUrl = (state: RootState) => state.payslips.payslipPdfUrl;
export const selectPayslipLoading = (state: RootState) => state.payslips.loading;
export const selectPayslipGenerating = (state: RootState) => state.payslips.generating;
export const selectPayslipError = (state: RootState) => state.payslips.error;

export default payslipSlice.reducer;
