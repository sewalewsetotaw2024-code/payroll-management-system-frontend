import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { GlassCard } from '../../../components/ui';
import { payrollPeriodApi } from '../../configuration/api/configurationApi';
import { usePayrollBatches } from '../hooks/usePayrollBatches';
import { StatsGrid } from '../components/StatsGrid';
import { PeriodSummaryCard } from '../components/PeriodSummaryCard';
import { GenerateBatchesModal } from '../components/GenerateBatchesModal';
import { BatchCardGrid } from '../components/BatchCardGrid';
import { BatchDetailView } from '../components/BatchDetailView';
import type { PayrollBatch, PeriodOption } from '../types';

export const PayrollBatchPage: React.FC = () => {
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);

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

  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  useEffect(() => { setBatches(rawBatches); }, [rawBatches]);

  const handleGenerate = useCallback(async (periodId: string, batchSize: number) => {
    await generate(periodId, batchSize);
    setModalOpen(false);
  }, [generate]);

  const handleBatchRenamed = useCallback((id: string, name: string) => {
    setBatches((prev) => prev.map((b) => b.id === id ? { ...b, name } : b));
    if (selectedBatch?.id === id) setSelectedBatch((prev) => prev ? { ...prev, name } : null);
    refetchBatches();
  }, [refetchBatches, selectedBatch]);

  const handleBatchStatusChanged = useCallback((id: string, status: PayrollBatch['status']) => {
    setBatches((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
    if (selectedBatch?.id === id) setSelectedBatch((prev) => prev ? { ...prev, status } : null);
  }, [selectedBatch]);

  const handleBatchDeleted = useCallback((id: string) => {
    setBatches((prev) => prev.filter((b) => b.id !== id));
    if (selectedBatch?.id === id) setSelectedBatch(null);
    refetchBatches();
  }, [refetchBatches, selectedBatch]);

  const handleBatchClick = useCallback((batch: PayrollBatch) => {
    setSelectedBatch(batch);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedBatch(null);
    refetchBatches();
  }, [refetchBatches]);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  // Calculate stats
  const activeBatches = batches.filter((b) => b.status === 'ACTIVE').length;
  const totalEmployees = batches.reduce((sum, b) => sum + b._count.employees, 0);
  const employeesInBatches = totalEmployees;
  const unassigned = 0; // This would come from a separate API call in production

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20 px-4 md:px-5">
      {/* ── Green Gradient Header ─────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 rounded-2xl p-6 sm:p-8 text-white">
        {/* Decorative circles */}
        <div className="absolute -top-1/2 -right-10 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-1/2 right-20 w-48 h-48 rounded-full bg-white/3" />

        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">
            Payroll Batch
          </h1>
          <p className="text-sm text-emerald-100/80 max-w-2xl">
            Generate employee batches for payroll processing. Configure batch size, assign employees to groups, and track batch approval status across the fiscal year.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <button
              onClick={() => setModalOpen(true)}
              disabled={!selectedPeriodId}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-700 bg-white rounded-lg hover:bg-brand-50 transition-all cursor-pointer shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Generate Batches
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────── */}
      <StatsGrid
        activeBatches={activeBatches}
        totalEmployees={totalEmployees}
        employeesInBatches={employeesInBatches}
        unassigned={unassigned}
      />

      {/* ── Conditional: Detail View or List View ─────────────── */}
      {selectedBatch ? (
        /* Batch Detail View */
        <BatchDetailView
          batch={selectedBatch}
          periodName={selectedPeriod?.name ?? 'Unknown Period'}
          periodRange={selectedPeriod
            ? `${new Date(selectedPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} — ${new Date(selectedPeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`
            : ''}
          onBack={handleBackToList}
          onBatchDeleted={handleBatchDeleted}
          onStatusChanged={handleBatchStatusChanged}
        />
      ) : (
        <>
          {/* ── Period Summary ──────────────────────────────────── */}
          <PeriodSummaryCard
            periods={periods}
            selectedPeriodId={selectedPeriodId}
            onPeriodChange={(id) => {
              setSelectedPeriodId(id);
              setBatchPage(1);
              setSelectedBatch(null);
            }}
            totalEmployees={totalEmployees}
            batchCount={totalItems}
            batchSize={50}
          />

          {/* ── Batch Cards Grid ────────────────────────────────── */}
          {selectedPeriodId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Batch Groups
                  <span className="text-xs font-medium text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    {totalItems}
                  </span>
                </h3>
              </div>

              <BatchCardGrid
                batches={batches}
                loading={batchesLoading}
                onBatchClick={handleBatchClick}
                onBatchRenamed={handleBatchRenamed}
                onStatusChanged={handleBatchStatusChanged}
                onBatchDeleted={handleBatchDeleted}
              />
            </div>
          )}

          {/* ── No Period Selected State ────────────────────────── */}
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
        </>
      )}

      {/* ── Generate Batches Modal ─────────────────────────────── */}
      <GenerateBatchesModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        periods={periods}
        selectedPeriodId={selectedPeriodId}
        onPeriodChange={setSelectedPeriodId}
        onGenerate={handleGenerate}
        generating={generating}
      />
    </div>
  );
};
