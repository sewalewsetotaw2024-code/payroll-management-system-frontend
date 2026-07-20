import React, { useState, useMemo } from 'react';
import { Plus, CalendarRange, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';
import { Modal, Input, Select, Button } from '../../../components/ui';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection, ConfigEmptyState, ConfigModalFooter } from './shared';
import { FiscalYearView } from './FiscalYearView';
import { toast } from '../../../components/ui/Toast';
import type { FiscalYear, FiscalStatus } from '../types/configuration.types';

const emptyForm = { name: '', startDate: '', endDate: '', status: 'DRAFT' as FiscalStatus };

/**
 * FiscalYearConfiguration component for managing fiscal year periods.
 * Supports add/edit/delete operations and status transitions (activate/close) via Redux sagas.
 */
export const FiscalYearConfiguration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: fiscalYears, loading, saving, error } = useAppSelector((s) => s.configuration.fiscalYears);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; startDate: string; endDate: string; status: FiscalStatus }>(emptyForm);
  const [formError, setFormError] = useState('');
  const [displayPage, setDisplayPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [pendingActivateId, setPendingActivateId] = useState<string | null>(null);
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const sortedYears = useMemo(() => 
    [...fiscalYears].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [fiscalYears]
  );

  const activeYear = useMemo(() => fiscalYears.find((fy) => fy.status === 'ACTIVE'), [fiscalYears]);

  const totalPages = Math.max(1, Math.ceil(sortedYears.length / pageSize));
  const paginatedYears = useMemo(
    () => sortedYears.slice((displayPage - 1) * pageSize, displayPage * pageSize),
    [sortedYears, displayPage, pageSize]
  );

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (fy: FiscalYear) => {
    setEditId(fy.id!);
    setForm({ 
      name: fy.name, 
      startDate: fy.startDate.slice(0, 10), 
      endDate: fy.endDate.slice(0, 10),
      status: fy.status || 'DRAFT',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!form.startDate || !form.endDate) {
      setFormError('Both dates are required');
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setFormError('End date must be after start date');
      return;
    }
    if (!editId && form.status === 'ACTIVE' && activeYear) {
      toast.error(`Cannot set status to ACTIVE while "${activeYear.name}" is still active. Please close the active fiscal year first.`);
      return;
    }
    if (editId && form.status === 'ACTIVE' && activeYear && activeYear.id !== editId) {
      toast.error(`Cannot set status to ACTIVE while "${activeYear.name}" is still active. Please close the active fiscal year first.`);
      return;
    }
    // Check for date overlap with existing non-CLOSED fiscal years
    const newStart = new Date(form.startDate);
    const newEnd = new Date(form.endDate);
    const overlappingYear = fiscalYears.find((fy) => {
      if (fy.status === 'CLOSED') return false;
      if (editId && fy.id === editId) return false;
      const fyStart = new Date(fy.startDate);
      const fyEnd = new Date(fy.endDate);
      return newStart <= fyEnd && newEnd >= fyStart;
    });
    if (overlappingYear) {
      setFormError(`Dates overlap with "${overlappingYear.name}" (${overlappingYear.startDate.slice(0, 10)} — ${overlappingYear.endDate.slice(0, 10)}). Please adjust the date range.`);
      return;
    }

    if (editId && form.status === 'CLOSED' && activeYear?.id === editId) {
      if (!window.confirm('Closing the active fiscal year may affect payroll periods linked to it. Continue?')) {
        return;
      }
    }

    if (editId) {
      dispatch(configurationActions.updateFiscalYearRequest({ id: editId, data: form }));
    } else {
      dispatch(configurationActions.createFiscalYearRequest(form));
    }
    setModalOpen(false);
  };

  const removeYear = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = () => {
    if (pendingDeleteId) {
      dispatch(configurationActions.deleteFiscalYearRequest(pendingDeleteId));
      setPendingDeleteId(null);
    }
  };

  const cancelDelete = () => setPendingDeleteId(null);

  const activateYear = (id: string) => {
    setPendingActivateId(id);
  };

  const confirmActivate = () => {
    if (pendingActivateId) {
      dispatch(configurationActions.activateFiscalYearRequest(pendingActivateId));
      setPendingActivateId(null);
    }
  };

  const cancelActivate = () => setPendingActivateId(null);

  const closeYear = (id: string) => {
    setPendingCloseId(id);
  };

  const confirmClose = () => {
    if (pendingCloseId) {
      dispatch(configurationActions.closeFiscalYearRequest(pendingCloseId));
      setPendingCloseId(null);
    }
  };

  const cancelClose = () => setPendingCloseId(null);

  const fiscalRendererState = {
    data: fiscalYears,
    loading,
    error: error ? { status: 500, message: error } : null,
    isRefreshing: saving,
  };

  const closingActive = editId && form.status === 'CLOSED' && activeYear?.id === editId;

  return (
    <ConfigSection
      id="fiscal"
      title="Fiscal Years"
      description="Manage payroll fiscal year periods"
      showBadge={fiscalYears.length > 0 && !loading}
      actionButton={
        <Button onClick={openAdd} className="shadow shadow-brand-200/50">
          <Plus className="w-4 h-4" /> Add Fiscal Year
        </Button>
      }
    >
      <DataRenderer
        state={fiscalRendererState}
        onRetry={() => dispatch(configurationActions.fetchFiscalYearsRequest())}
        renderEmpty={
          <ConfigEmptyState
            icon={<CalendarRange className="w-8 h-8" />}
            title="No fiscal years defined"
            message="Start by adding your first fiscal year period."
          />
        }
        renderSuccess={() => (
          <FiscalYearView
            years={sortedYears}
            paginatedYears={paginatedYears}
            displayPage={displayPage}
            totalPages={totalPages}
            pageSize={pageSize}
            loading={loading}
            onPageChange={setDisplayPage}
            onPageSizeChange={(s) => { setPageSize(s); setDisplayPage(1); }}
            onOpenEdit={openEdit}
            onRemove={removeYear}
            onActivate={activateYear}
            onClose={closeYear}
            onSync={() => dispatch(configurationActions.fetchFiscalYearsRequest())}
          />
        )}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Fiscal Year' : 'Add Fiscal Year'}
        size="sm"
        footer={
          <ConfigModalFooter
            onCancel={() => setModalOpen(false)}
            onSave={handleSaveItem}
            isEdit={!!editId}
          />
        }
      >
        <div className="space-y-4">
          {closingActive && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                Closing the active fiscal year will prevent new payroll periods from being created under it.
              </p>
            </div>
          )}
          <Input
            label="Year Title"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. 2025/2026"
            error={formError}
            required
            className="bg-slate-50/50"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
              className="bg-slate-50/50"
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
              className="bg-slate-50/50"
            />
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as FiscalStatus })}
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'CLOSED', label: 'Closed' },
            ]}
            className="bg-slate-50/50"
          />
        </div>
      </Modal>

      {/* Confirmation modal for activating a fiscal year */}
      <Modal
        isOpen={!!pendingActivateId}
        onClose={cancelActivate}
        title="Activate Fiscal Year"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="outline" onClick={cancelActivate}>
              {activeYear ? 'Got it' : 'Cancel'}
            </Button>
            {!activeYear && (
              <Button variant="primary" onClick={confirmActivate}>
                Yes, Activate
              </Button>
            )}
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full shrink-0 ${activeYear ? 'bg-amber-100' : 'bg-brand-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${activeYear ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
          <div className="space-y-2">
            {activeYear ? (
              <>
                <p className="text-sm text-slate-800 font-semibold">
                  Close the active fiscal year first
                </p>
                <p className="text-sm text-slate-600">
                  "<span className="font-semibold text-slate-900">{activeYear.name}</span>" is currently the active fiscal year. You must close it before activating a new one.
                </p>
                <p className="text-sm text-slate-500">
                  Go to the active fiscal year above and click <span className="font-medium text-amber-600">Close</span> to close it, then try activating this fiscal year again.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-700">
                  Are you sure you want to activate this fiscal year?
                </p>
                <p className="text-sm text-slate-600">This action cannot be undone.</p>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* Confirmation modal for deleting a fiscal year */}
      <Modal
        isOpen={!!pendingDeleteId}
        onClose={cancelDelete}
        title="Delete Fiscal Year"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Yes, Delete
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-full shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              Are you sure you want to delete this fiscal year?
            </p>
            <p className="text-sm text-slate-600">
              This action cannot be undone. Only draft fiscal years can be deleted.
            </p>
          </div>
        </div>
      </Modal>

      {/* Confirmation modal for closing a fiscal year */}
      <Modal
        isOpen={!!pendingCloseId}
        onClose={cancelClose}
        title="Close Fiscal Year"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="outline" onClick={cancelClose}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmClose}>
              Yes, Close
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-full shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-700 font-bold">
              Are you sure you want to close this fiscal year?
            </p>
            <p className="text-sm text-slate-600">
              Closing the fiscal year will also finalize all payroll periods associated with it. This action should only be taken at the end of the fiscal cycle.
            </p>
            <p className="text-sm text-slate-600 font-medium">This action cannot be undone.</p>
          </div>
        </div>
      </Modal>
    </ConfigSection>
  );
};