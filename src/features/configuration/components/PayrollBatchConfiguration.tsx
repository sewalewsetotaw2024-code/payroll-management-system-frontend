import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';
import { Package } from 'lucide-react';
import { Modal, Input, Button } from '../../../components/ui';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection, ConfigEmptyState, ConfigModalFooter } from './shared';
import { PayrollBatchView } from './PayrollBatchView';
import type { PayrollBatch } from '../types/configuration.types';

/** Empty form template for payroll batch creation. */
const emptyForm = { batchType: '', description: '' };

/**
 * PayrollBatchConfiguration component for managing payroll batch records.
 * Supports CRUD operations and status transitions (activate/close/archive).
 */
export const PayrollBatchConfiguration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: batches, loading, saving, error } = useAppSelector((s) => s.configuration.payrollBatches);

  const [localBatches, setLocalBatches] = useState<PayrollBatch[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (Array.isArray(batches)) {
      setLocalBatches(batches);
    }
  }, [batches]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (batch: PayrollBatch) => {
    setEditId(batch.id || null);
    setForm({
      batchType: batch.batchType,
      description: batch.description || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    dispatch(configurationActions.deletePayrollBatchRequest(id));
  };

  const handleActivate = (id: string) => {
    dispatch(configurationActions.activatePayrollBatchRequest(id));
  };

  const handleClose = (id: string) => {
    dispatch(configurationActions.closePayrollBatchRequest(id));
  };

  const handleArchive = (id: string) => {
    dispatch(configurationActions.archivePayrollBatchRequest(id));
  };

  const handleSave = () => {
    if (!form.batchType.trim()) {
      setFormError('Batch type is required');
      return;
    }
    setFormError('');

    const payload = {
      batchType: form.batchType.trim(),
      description: form.description.trim() || null,
    };

    if (editId) {
      dispatch(configurationActions.updatePayrollBatchRequest({ id: editId, data: payload as any }));
    } else {
      dispatch(configurationActions.createPayrollBatchRequest(payload as any));
    }
    setModalOpen(false);
  };

  const state = {
    data: localBatches,
    loading,
    error: error ? { status: 500, message: error } : null,
    isRefreshing: saving,
  };

  return (
    <ConfigSection
      id="payroll-batch"
      title="Payroll Batch Configuration"
      description="Manage payroll processing batches and their lifecycle"
      showBadge={localBatches.length > 0 && !loading}
      badgeText={`${localBatches.length} Batch${localBatches.length !== 1 ? 'es' : ''}`}
    >
      <DataRenderer
        state={state}
        onRetry={() => dispatch(configurationActions.fetchPayrollBatchesRequest({ page: 1, limit: 100 }))}
        isEmpty={(data) => !data || (Array.isArray(data) && data.length === 0)}
        renderEmpty={
          <ConfigEmptyState
            icon={<Package className="w-6 h-6" />}
            title="No Payroll Batches"
            message="Create payroll batches to organize payroll processing cycles."
          />
        }
        renderSuccess={() => (
          <>
            <PayrollBatchView
              batches={localBatches}
              loading={loading}
              saving={saving}
              onActivate={handleActivate}
              onClose={handleClose}
              onArchive={handleArchive}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAdd={openAdd}
            />

            <Modal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              title={editId ? 'Edit Payroll Batch' : 'New Payroll Batch'}
              size="sm"
              footer={
                <ConfigModalFooter
                  onCancel={() => setModalOpen(false)}
                  onSave={handleSave}
                  isEdit={!!editId}
                  saving={saving}
                />
              }
            >
              <div className="space-y-4">
                {formError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 font-medium">
                    {formError}
                  </div>
                )}
                <Input
                  label="Batch Type"
                  value={form.batchType}
                  onChange={(e) => setForm({ ...form, batchType: e.target.value })}
                  placeholder="e.g., MONTHLY, BONUS, OFF_CYCLE"
                  helperText="Type of payroll batch"
                />
                <Input
                  label="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of this batch"
                />
              </div>
            </Modal>
          </>
        )}
      />
    </ConfigSection>
  );
};
