import React from 'react';
import { Package, Plus, ArrowUpCircle, CheckCircle2, Archive, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui';
import { ConfigSaveButton } from './shared/ConfigSaveButton';
import { BATCH_STATUS_BADGE } from '../constants';
import type { PayrollBatch, BatchStatus } from '../types/configuration.types';

interface PayrollBatchViewProps {
  batches: PayrollBatch[];
  loading: boolean;
  saving: boolean;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onArchive: (id: string) => void;
  onEdit: (batch: PayrollBatch) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
};

/**
 * PayrollBatchView component displaying payroll batch records in a table with status badges
 * and action buttons for status transitions (activate/close/archive).
 */
export const PayrollBatchView: React.FC<PayrollBatchViewProps> = ({
  batches,
  loading,
  saving,
  onActivate,
  onClose,
  onArchive,
  onEdit,
  onDelete,
  onAdd,
}) => (
  <div className="space-y-6">
    <div className="flex justify-end">
      <Button onClick={onAdd} variant="primary" size="sm" className="rounded-full">
        <Plus className="w-4 h-4 mr-1.5" />
        New Batch
      </Button>
    </div>
    <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 py-4">Batch Type</th>
              <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 py-4">Description</th>
              <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 py-4">Status</th>
              <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                  No payroll batches configured yet.
                </td>
              </tr>
            ) : (
              batches.map((batch) => {
                const badge = BATCH_STATUS_BADGE[batch.status || 'DRAFT'] || BATCH_STATUS_BADGE.DRAFT;
                return (
                  <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                          <Package className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900">{batch.batchType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{batch.description || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {statusLabels[batch.status || 'DRAFT']}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {batch.status === 'DRAFT' && (
                          <button
                            onClick={() => onActivate(batch.id!)}
                            disabled={saving}
                            className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                            title="Activate"
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                          </button>
                        )}
                        {batch.status === 'ACTIVE' && (
                          <button
                            onClick={() => onClose(batch.id!)}
                            disabled={saving}
                            className="p-2 hover:bg-amber-50 rounded-lg text-amber-600 transition-colors"
                            title="Close"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {batch.status === 'CLOSED' && (
                          <button
                            onClick={() => onArchive(batch.id!)}
                            disabled={saving}
                            className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(batch)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(batch.id!)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
