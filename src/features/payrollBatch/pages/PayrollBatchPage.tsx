import React, { useEffect, useState, useCallback } from 'react';
import { Package, AlertCircle, CalendarRange, Users, Layers, ChevronDown } from 'lucide-react';
import { GlassCard, Skeleton } from '../../../components/ui';
import { payrollPeriodApi } from '../../configuration/api/configurationApi';
import { usePayrollBatches } from '../hooks/usePayrollBatches';
import { BatchGenerator } from '../components/BatchGenerator';
import { BatchCardGrid } from '../components/BatchCardGrid';

interface PeriodOption {
  id: string;
  name: string | null;
  startDate: string;
  endDate: string;
}

export const PayrollBatchPage: React.FC = () => {
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [periodsLoading, setPeriodsLoading] = useState(true);

  // Fetch all payroll periods
  useEffect(() => {
    let mounted = true;
    const loadPeriods = async () => {
      try {
        const res = await payrollPeriodApi.getAll();
        const allPeriods: PeriodOption[] = res.data.data ?? [];
        if (mounted) {
          setPeriods(allPeriods);
          if (allPeriods.length > 0 && !selectedPeriodId) {
            setSelectedPeriodId(allPeriods[0].id);
          }
        }
      } catch {
        // Ignore
      } finally {
        if (mounted) setPeriodsLoading(false);
      }
    };
    loadPeriods();
    return () => { mounted = false; };
  }, []);

  const {
    batches: rawBatches,
    totalItems,
    totalPages,
    loading: batchesLoading,
    page: batchPage,
    setPage: setBatchPage,
    generating,
    generate,
    refetch: refetchBatches,
  } = usePayrollBatches(selectedPeriodId);

  const [batches, setBatches] = useState(rawBatches);
  useEffect(() => { setBatches(rawBatches); }, [rawBatches]);

  const handleGenerate = useCallback(async (periodId: string, batchSize: number) => {
    await generate(periodId, batchSize);
  }, [generate]);

  const handleBatchRenamed = useCallback((id: string, name: string) => {
    setBatches((prev) => prev.map((b) => b.id === id ? { ...b, name } : b));
    refetchBatches();
  }, [refetchBatches]);

  const handleBatchStatusChanged = useCallback((id: string, status: string) => {
    setBatches((prev) => prev.map((b) => b.id === id ? { ...b, status: status as any } : b));
  }, []);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20 px-4 md:px-5">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 font-medium mb-1">
            Home &rsaquo; Payroll &rsaquo; Batch
          </p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payroll Batch</h1>
              <p className="text-sm text-slate-400 font-medium">
                Generate and manage employee batch allocations
              </p>
            </div>
          </div>
        </div>

        {/* Custom glass period selector */}
        {periodsLoading ? (
          <Skeleton className="h-11 w-72 rounded-lg" />
        ) : (
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Payroll Period
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <CalendarRange className="w-4 h-4 text-slate-400" />
              </div>
              <select
                value={selectedPeriodId ?? ''}
                onChange={(e) => {
                  setSelectedPeriodId(e.target.value || null);
                  setBatchPage(1);
                }}
                className="w-full min-w-[240px] appearance-none rounded-lg bg-white/70 backdrop-blur-lg border border-slate-200 pl-9 pr-10 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 cursor-pointer transition-shadow hover:shadow-sm"
              >
                <option value="">— Select Period —</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? `${new Date(p.startDate).toLocaleDateString()} — ${new Date(p.endDate).toLocaleDateString()}`}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Two-Column Layout: Generator + Summary ────────────── */}
      {selectedPeriodId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <BatchGenerator
            payrollPeriodId={selectedPeriodId}
            onGenerate={handleGenerate}
            generating={generating}
          />

          {/* Period Summary */}
          <GlassCard className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Period Summary</h3>
                <p className="text-xs text-slate-400 font-medium">
                  {selectedPeriod?.name ?? 'Current period'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-slate-200/60">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Employees</p>
                </div>
                <p className="text-2xl font-black text-slate-900 tabular-nums">
                  {batches.reduce((sum, b) => sum + b._count.employees, 0)}
                </p>
              </div>
              <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-slate-200/60">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Batches</p>
                </div>
                <p className="text-2xl font-black text-slate-900 tabular-nums">{totalItems}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {!selectedPeriodId && !periodsLoading && (
        <GlassCard className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-sm font-medium text-amber-700">
            Select a payroll period to manage batches
          </p>
        </GlassCard>
      )}

      {/* ── Batch Cards Grid ────────────────────────────────────── */}
      {selectedPeriodId && (
        <BatchCardGrid
          batches={batches}
          totalItems={totalItems}
          totalPages={totalPages}
          page={batchPage}
          onPageChange={setBatchPage}
          loading={batchesLoading}
          onBatchRenamed={handleBatchRenamed}
          onStatusChanged={handleBatchStatusChanged}
        />
      )}
    </div>
  );
};
