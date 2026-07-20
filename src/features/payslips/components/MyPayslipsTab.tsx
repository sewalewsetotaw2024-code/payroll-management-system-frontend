import React, { useState, useEffect, useCallback } from 'react';
import { FileText, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { payslipApi } from '../api/payslipApi';
import { useNavigate } from 'react-router-dom';
import type { MyPeriodsResponse } from '../types/payslip.types';
import { PeriodAccordion } from './PeriodAccordion';

export const MyPayslipsTab: React.FC = () => {
  const [periodsData, setPeriodsData] = useState<MyPeriodsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await payslipApi.getMyPeriods();
      setPeriodsData(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payslip periods');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleSelectPeriod = useCallback((periodId: string) => {
    navigate(`/payslips/${periodId}`);
  }, [navigate]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="space-y-3">
              <div className="h-5 bg-slate-50 animate-pulse rounded-md w-1/4" />
              <div className="h-3 bg-slate-50 animate-pulse rounded-md w-1/6" />
              <div className="h-3 bg-slate-50 animate-pulse rounded-md w-1/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Service Temporarily Unavailable</h3>
          <p className="text-sm text-slate-500 mb-8 max-w-sm">{error}</p>
          <button
            onClick={fetchPeriods}
            className="inline-flex items-center gap-2 px-8 py-3 text-xs font-black uppercase tracking-widest text-white bg-slate-900 rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  if (!periodsData || periodsData.fiscalYears.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Records Found</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Your payslip history will appear here once the next payroll cycle is finalized.
          </p>
        </div>
      </div>
    );
  }

  const totalPeriods = periodsData.fiscalYears.reduce(
    (sum, fy) => sum + fy.periods.length, 0,
  );
  const readyPeriods = periodsData.fiscalYears.reduce(
    (sum, fy) => sum + fy.periods.filter((p) => p.generationStatus === 'COMPLETED').length, 0,
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Periods overview bar - Professional & Secure */}
      {totalPeriods > 0 && (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-[2rem] px-8 py-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-0.5">Verified Identity</p>
              <p className="text-lg font-bold text-slate-900 tracking-tight">
                {periodsData.employeeName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Available</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-sm font-bold text-slate-900">{readyPeriods} Ready</p>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-100" />
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Archive</p>
              <p className="text-sm font-bold text-slate-900">{totalPeriods} Total</p>
            </div>
          </div>
        </div>
      )}

      <PeriodAccordion
        fiscalYears={periodsData.fiscalYears}
        selectedPeriodId={null}
        onSelectPeriod={handleSelectPeriod}
      />
    </div>
  );
};
