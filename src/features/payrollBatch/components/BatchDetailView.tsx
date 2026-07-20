import React, { useState } from 'react';
import {
  ArrowLeft, Users, Search, AlertCircle, ChevronLeft, ChevronRight,
  Trash2, RefreshCw, ArrowRightFromLine, UserX,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { GlassCard, InitialAvatar, Skeleton, Modal } from '../../../components/ui';
import { toast } from '../../../components/ui/Toast';
import { useBatchEmployees } from '../hooks/useBatchEmployees';
import { archiveBatch, removeBatchEmployee, moveBatchEmployee, listBatchesByPeriod } from '../api';
import type { PayrollBatch, PayrollBatchEmployeeItem } from '../types';

interface BatchDetailViewProps {
  batch: PayrollBatch;
  periodName: string;
  periodRange: string;
  onBack: () => void;
  onBatchDeleted?: (id: string) => void;
  onStatusChanged?: (id: string, status: PayrollBatch['status']) => void;
}

export const BatchDetailView: React.FC<BatchDetailViewProps> = ({
  batch,
  periodName,
  periodRange,
  onBack,
  onBatchDeleted,
  onStatusChanged,
}) => {
  const {
    employees,
    totalItems,
    totalPages,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch,
    refetch,
  } = useBatchEmployees(batch.id ?? null);

  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [batchList, setBatchList] = useState<PayrollBatch[]>([]);
  const [selectedTargetBatch, setSelectedTargetBatch] = useState('');
  const [moving, setMoving] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${batch.name}"? This will remove all employee assignments.`)) return;
    setDeleting(true);
    try {
      await archiveBatch(batch.id!);
      toast.success(`Batch "${batch.name}" deleted successfully`);
      onBatchDeleted?.(batch.id!);
      onBack();
    } catch {
      toast.error('Failed to delete batch');
    } finally {
      setDeleting(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const updated = await archiveBatch(batch.id!);
      onStatusChanged?.(batch.id!, updated.status);
      toast.success(`Batch "${batch.name}" archived`);
    } catch {
      toast.error('Failed to archive batch');
    } finally {
      setArchiving(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    try {
      await removeBatchEmployee(removeTarget.id);
      toast.success('Employee removed from batch');
      setRemoveTarget(null);
      refetch();
    } catch {
      toast.error('Failed to remove employee');
    }
  };

  const handleOpenMove = async (item: PayrollBatchEmployeeItem) => {
    setMoveTarget({ id: item.id, name: `${item.employee.firstName} ${item.employee.lastName}` });
    setSelectedTargetBatch('');
    try {
      const res = await listBatchesByPeriod({ payrollPeriodId: batch.payrollPeriodId, page: 1, limit: 100 });
      setBatchList(res.batches.filter((b) => b.id !== batch.id));
    } catch {
      toast.error('Failed to load batch list');
    }
  };

  const handleMoveConfirm = async () => {
    if (!moveTarget || !selectedTargetBatch) return;
    setMoving(true);
    try {
      await moveBatchEmployee(moveTarget.id, selectedTargetBatch);
      toast.success('Employee moved successfully');
      setMoveTarget(null);
      setSelectedTargetBatch('');
      refetch();
    } catch {
      toast.error('Failed to move employee');
    } finally {
      setMoving(false);
    }
  };

  const pageSize = 20;
  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalItems);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="group inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer font-bold uppercase tracking-widest"
      >
        <div className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center group-hover:border-brand-200 group-hover:bg-brand-50 transition-all">
          <ArrowLeft className="w-3.5 h-3.5" />
        </div>
        Back to Batches
      </button>

      {/* Batch Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {batch.name}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span>{periodName}</span>
            <span className="text-slate-300">|</span>
            <span>{periodRange}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-emerald-600">
            <Users className="w-3.5 h-3.5" />
            {totalItems} {totalItems === 1 ? 'Employee' : 'Employees'}
          </span>
          <button
            onClick={handleArchive}
            disabled={archiving || batch.status !== 'ACTIVE'}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {archiving ? 'Archiving...' : 'Archive'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
            title="Delete batch"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="text-center">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Employees</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalItems}</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
          <span className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
            batch.status === 'ACTIVE' && 'bg-brand-50 text-emerald-700',
            batch.status === 'DRAFT' && 'bg-blue-50 text-blue-700',
            batch.status === 'CLOSED' && 'bg-amber-50 text-amber-700',
            batch.status === 'ARCHIVED' && 'bg-slate-100 text-slate-600',
          )}>
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              batch.status === 'ACTIVE' && 'bg-brand-500',
              batch.status === 'DRAFT' && 'bg-blue-500',
              batch.status === 'CLOSED' && 'bg-amber-500',
              batch.status === 'ARCHIVED' && 'bg-slate-400',
            )} />
            {batch.status}
          </span>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Batch Name</p>
          <p className="text-base font-bold text-slate-900">{batch.name}</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Created</p>
          <p className="text-sm font-medium text-slate-600">
            {new Date(batch.createdAt).toLocaleDateString()}
          </p>
        </GlassCard>
      </div>

      {/* Employee Table */}
      <GlassCard padding="none" className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-slate-200/60">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search employee..."
                className="w-full sm:w-60 pl-9 pr-3 py-2 text-sm bg-white/60 backdrop-blur-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              />
            </div>
          </div>
          <button
            className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100/60 rounded-lg animate-pulse flex items-center gap-3 px-4">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="p-3 bg-red-50 rounded-xl mb-3">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-sm font-bold text-red-600">Failed to load employees</p>
              <p className="text-xs text-slate-400 mt-1">{error.message}</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-600">
                {search ? 'No employees match your search' : 'No employees in this batch'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {search ? 'Try adjusting your search terms' : 'The batch may not have been generated yet'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/60 bg-slate-50/80">
                  <th className="border-r border-slate-200/50 text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <input type="checkbox" className="rounded border-slate-300 accent-brand-600 cursor-pointer" />
                  </th>
                  <th className="border-r border-slate-200/50 text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Code</th>
                  <th className="border-r border-slate-200/50 text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="border-r border-slate-200/50 text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="border-r border-slate-200/50 text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Position</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-b border-slate-100 transition-colors',
                      idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white',
                      'hover:bg-brand-50/60',
                    )}
                  >
                    <td className="border-r border-slate-200/50 px-4 py-3">
                      <input type="checkbox" className="rounded border-slate-300 accent-brand-600 cursor-pointer" />
                    </td>
                    <td className="border-r border-slate-200/50 px-4 py-3">
                      <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {item.employee.externalId}
                      </span>
                    </td>
                    <td className="border-r border-slate-200/50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <InitialAvatar
                          firstName={item.employee.firstName ?? '?'}
                          lastName={item.employee.lastName ?? ''}
                          size="sm"
                        />
                        <span className="text-sm font-semibold text-slate-900">
                          {item.employee.firstName} {item.employee.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="border-r border-slate-200/50 px-4 py-3 text-sm text-slate-500">
                      {item.employee.department?.name ?? '—'}
                    </td>
                    <td className="border-r border-slate-200/50 px-4 py-3 text-sm text-slate-500">
                      {item.employee.position?.title ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenMove(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Move to another batch"
                        >
                          <ArrowRightFromLine className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRemoveTarget({ id: item.id, name: `${item.employee.firstName} ${item.employee.lastName}` })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove from batch"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/60 bg-white/30">
            <p className="text-xs text-slate-400">
              Showing {startRecord}–{endRecord} of {totalItems}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-slate-300 text-xs">…</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={cn(
                        'min-w-[30px] h-7 rounded-md text-xs font-bold transition-all cursor-pointer',
                        p === page
                          ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                          : 'text-slate-500 hover:bg-white/60 hover:border-slate-200 border border-transparent',
                      )}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Employee from Batch"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setRemoveTarget(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleRemoveConfirm}
              className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
            >
              Remove
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to remove <span className="font-bold text-slate-900">{removeTarget?.name}</span> from this batch?
        </p>
      </Modal>

      {/* Move to Another Batch Modal */}
      <Modal
        isOpen={!!moveTarget}
        onClose={() => { setMoveTarget(null); setSelectedTargetBatch(''); }}
        title="Move Employee to Another Batch"
        size="sm"
        footer={
          <>
            <button
              onClick={() => { setMoveTarget(null); setSelectedTargetBatch(''); }}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleMoveConfirm}
              disabled={!selectedTargetBatch || moving}
              className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {moving ? 'Moving...' : 'Move to Batch'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-500">Employee</p>
            <p className="text-sm font-bold text-slate-900">{moveTarget?.name}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Target Batch</p>
            {batchList.length === 0 ? (
              <p className="text-sm text-slate-400">No other batches available in this period</p>
            ) : (
              <select
                value={selectedTargetBatch}
                onChange={(e) => setSelectedTargetBatch(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              >
                <option value="">Select a batch…</option>
                {batchList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b._count.employees} employees)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
