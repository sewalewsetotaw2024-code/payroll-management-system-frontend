import React, { useState, useEffect, useMemo } from 'react';
import { Plus, CalendarDays, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';
import { Modal, Input, Select, Button } from '../../../components/ui';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection, ConfigEmptyState, ConfigModalFooter } from './shared';
import { PayrollPeriodView } from './PayrollPeriodView';
import { payrollPeriodApi } from '../api/configurationApi';
import { toast } from '../../../components/ui/Toast';
import type { PayrollPeriod, FiscalYear } from '../types/configuration.types';

const emptyForm = {
  name: '',
  cycle: 'MONTHLY' as PayrollPeriod['cycle'],
  startDate: '',
  endDate: '',
  dateOfPayment: '',
  fiscalYearId: '',
  status: 'DRAFT' as string,
};

/**
 * PayrollPeriodConfiguration manages payroll periods following the same
 * pattern as FiscalYearConfiguration:
 *  - List view with status badges and row actions (edit, open, close)
 *  - Modal for creating / editing a period
 *  - Confirmation prompts for destructive state transitions
 */
export const PayrollPeriodConfiguration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: periods, loading, saving, error } = useAppSelector((s) => s.configuration.payrollPeriods);
  const fiscalYears = useAppSelector((s) => s.configuration.fiscalYears.data) as FiscalYear[];
  const workdaysConfig = useAppSelector((s) => s.configuration.workdays.data);
  const dailyWorkingHours = workdaysConfig?.dailyWorkingHours ?? 8;

  const activeFiscalYears = useMemo(
    () => fiscalYears.filter((fy) => fy.status === 'ACTIVE'),
    [fiscalYears],
  );

  // ── Modal + form state ───────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editPeriod, setEditPeriod] = useState<PayrollPeriod | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  // ── Confirmation modals ──────────────────────────────────────
  const [openConfirmId, setOpenConfirmId] = useState<string | null>(null);
  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!fiscalYears.length) {
      dispatch(configurationActions.fetchFiscalYearsRequest());
    }
  }, []);

  // ── Computed stats for the active form ───────────────────────
  const [previewData, setPreviewData] = useState<{ 
    calendarDays: number; 
    workHours: number;
    dailyWorkingHours: number;
    defaultMonthlyWorkdays: number;
  } | null>(null);

  useEffect(() => {
    if (form.startDate && form.endDate && modalOpen) {
      const fetchPreview = async () => {
        try {
          const resp = await payrollPeriodApi.preview(form.startDate, form.endDate);
          if (resp.data.success) {
            setPreviewData(resp.data.data);
          }
        } catch (err) {
          console.error('Failed to fetch period preview', err);
        }
      };
      fetchPreview();
    } else {
      setPreviewData(null);
    }
  }, [form.startDate, form.endDate, modalOpen]);

  const days = previewData?.calendarDays ?? 0;
  const hours = previewData?.workHours ?? 0;
  const dailyBasis = previewData?.dailyWorkingHours ?? dailyWorkingHours;
  const monthlyBasis = previewData?.defaultMonthlyWorkdays ?? 30;

  // ── Sorted periods ───────────────────────────────────────────
  const sortedPeriods = useMemo(
    () =>
      [...(periods as PayrollPeriod[])].sort((a, b) => {
        const order: Record<string, number> = { ACTIVE: 0, DRAFT: 1, DONE: 2 };
        const ao = order[a.status ?? 'DONE'] ?? 3;
        const bo = order[b.status ?? 'DONE'] ?? 3;
        if (ao !== bo) return ao - bo;
        return new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime();
      }),
    [periods],
  );

  const activePeriod = sortedPeriods.find((p) => p.status === 'ACTIVE');
  const currentlyOpenPeriod = (periods as PayrollPeriod[]).find((p) => p.status === 'ACTIVE');

  // ── Open "Add new" modal ─────────────────────────────────────
  const openAdd = () => {
    setEditPeriod(null);
    const defaultFy = activeFiscalYears[0];
    setForm({
      ...emptyForm,
      fiscalYearId: defaultFy?.id ?? '',
      startDate: '', // Don't pre-fill with whole FY dates to avoid overlaps
      endDate: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  // ── Open "Edit" modal for existing period ────────────────────
  const openEdit = (period: PayrollPeriod) => {
    setEditPeriod(period);
    setForm({
      name: period.name ?? '',
      cycle: period.cycle,
      startDate: period.startDate?.slice(0, 10) ?? '',
      endDate: period.endDate?.slice(0, 10) ?? '',
      dateOfPayment: period.dateOfPayment?.slice(0, 10) ?? '',
      fiscalYearId: period.fiscalYearId ?? '',
      status: period.status ?? 'DRAFT',
    });
    setFormError('');
    setModalOpen(true);
  };

  // ── Fiscal year change (auto-fill dates for new period) ──────
  const handleFiscalYearChange = (id: string) => {
    const fy = activeFiscalYears.find((f) => f.id === id);
    setForm((prev) => ({
      ...prev,
      fiscalYearId: id,
      startDate: fy?.startDate?.slice(0, 10) ?? prev.startDate,
      endDate: fy?.endDate?.slice(0, 10) ?? prev.endDate,
    }));
  };

  // ── Save (create or update) ──────────────────────────────────
  const handleSaveItem = () => {
    if (!form.startDate) { setFormError('Start date is required'); return; }
    if (!form.endDate) { setFormError('End date is required'); return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setFormError('End date must be after start date');
      return;
    }
    if (!form.fiscalYearId) { setFormError('Fiscal year is required'); return; }

    // Check for date overlap with existing non-DONE periods
    const newStart = new Date(form.startDate);
    const newEnd = new Date(form.endDate);
    const overlappingPeriod = (periods as PayrollPeriod[]).find((pp) => {
      if (pp.status === 'DONE') return false;
      if (editPeriod?.id && pp.id === editPeriod.id) return false;
      const ppStart = new Date(pp.startDate);
      const ppEnd = new Date(pp.endDate);
      return newStart <= ppEnd && newEnd >= ppStart;
    });
    if (overlappingPeriod) {
      setFormError(`Dates overlap with "${overlappingPeriod.name || 'Unnamed period'}" (${overlappingPeriod.startDate?.slice(0, 10)} — ${overlappingPeriod.endDate?.slice(0, 10)}). Please adjust the date range.`);
      return;
    }

    setFormError('');

    if (editPeriod?.id) {
      dispatch(
        configurationActions.updatePayrollPeriodRequest({
          id: editPeriod.id,
          data: {
            name: form.name,
            cycle: form.cycle,
            startDate: form.startDate,
            endDate: form.endDate,
            dateOfPayment: form.dateOfPayment || null,
            fiscalYearId: form.fiscalYearId,
          },
        }),
      );
    } else {
      dispatch(
        configurationActions.createPayrollPeriodRequest({
          name: form.name,
          cycle: form.cycle,
          startDate: form.startDate,
          endDate: form.endDate,
          dateOfPayment: form.dateOfPayment || null,
          fiscalYearId: form.fiscalYearId,
          status: 'DRAFT',
        }),
      );
    }
  };

  // We use a ref to track if we just tried to save, so we can close on success
  const savingRef = React.useRef(false);
  useEffect(() => {
    if (saving) {
      savingRef.current = true;
    } else if (savingRef.current && !error) {
      // Finished saving successfully
      setModalOpen(false);
      savingRef.current = false;
    } else if (error) {
      // Stopped because of error, reset ref but keep modal open
      savingRef.current = false;
    }
  }, [saving, error]);

  // ── State transitions ────────────────────────────────────────
  const handleConfirmOpen = () => {
    if (!openConfirmId) return;
    dispatch(configurationActions.openPayrollPeriodRequest(openConfirmId));
    setOpenConfirmId(null);
  };

  const handleConfirmClose = () => {
    if (!closeConfirmId) return;
    dispatch(configurationActions.closePayrollPeriodRequest(closeConfirmId));
    setCloseConfirmId(null);
  };

  const periodRendererState = {
    data: periods,
    loading,
    error: error ? { status: 500, message: error } : null,
    isRefreshing: saving,
  };

  const pendingOpenPeriod = sortedPeriods.find((p) => p.id === openConfirmId);
  const pendingClosePeriod = sortedPeriods.find((p) => p.id === closeConfirmId);

  return (
    <ConfigSection
      id="period"
      title="Payroll Periods"
      description="Manage payroll cycles and period dates per fiscal year"
      showBadge={!!activePeriod && !loading}
      badgeText="Active Period"
      actionButton={
        <Button
          id="btn-add-payroll-period"
          onClick={openAdd}
          disabled={saving || (periods as PayrollPeriod[]).length >= 12}
          className="shadow shadow-emerald-200/50"
        >
          <Plus className="w-4 h-4" /> Add Period
        </Button>
      }
    >
      <DataRenderer
        state={periodRendererState}
        onRetry={() => dispatch(configurationActions.fetchPayrollPeriodsRequest())}
        renderEmpty={
          <ConfigEmptyState
            icon={<CalendarDays className="w-8 h-8" />}
            title="No payroll periods yet"
            message="Create your first payroll period to begin managing pay cycles."
          />
        }
        renderSuccess={() => (
          <PayrollPeriodView
            periods={sortedPeriods}
            activeFiscalYears={activeFiscalYears}
            saving={saving}
            onOpenEdit={openEdit}
            onOpenPeriod={(id) => setOpenConfirmId(id)}
            onClosePeriod={(id) => setCloseConfirmId(id)}
          />
        )}
      />

      {/* ── CREATE / EDIT MODAL ─────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editPeriod ? 'Edit Payroll Period' : 'Add Payroll Period'}
        size="sm"
        footer={
          <ConfigModalFooter
            onCancel={() => setModalOpen(false)}
            onSave={handleSaveItem}
            isEdit={!!editPeriod}
          />
        }
      >
        <div className="space-y-4">
          {activeFiscalYears.length === 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-800 font-medium">
                No active fiscal year found. You must activate a fiscal year before creating payroll periods.
              </p>
            </div>
          )}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <p className="text-xs text-rose-800 font-medium">{error}</p>
            </div>
          )}
          {periods.length >= 10 && !editPeriod && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 font-medium">
                {(periods as PayrollPeriod[]).length} of 12 periods created for this fiscal year.
              </p>
            </div>
          )}
          <Input
            label="Period Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. June 2026"
            error={formError && !form.name ? formError : ''}
            className="bg-slate-50/50"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payroll Frequency"
              value={form.cycle}
              onChange={(e) => setForm({ ...form, cycle: e.target.value as PayrollPeriod['cycle'] })}
              options={[
                { value: 'MONTHLY', label: 'Monthly' },
                { value: 'WEEKLY', label: 'Weekly' },
                { value: 'DAILY', label: 'Daily' },
                { value: 'HOURLY', label: 'Hourly' },
              ]}
              className="bg-slate-50/50"
            />
            <Select
              label="Fiscal Year"
              value={form.fiscalYearId}
              onChange={(e) => handleFiscalYearChange(e.target.value)}
              options={[
                { value: '', label: '— Select fiscal year —' },
                ...activeFiscalYears.map((fy) => ({ value: fy.id!, label: fy.name })),
              ]}
              error={formError && !form.fiscalYearId ? formError : ''}
              className="bg-slate-50/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              error={formError && !form.startDate ? formError : ''}
              required
              className="bg-slate-50/50"
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              error={formError && form.startDate && !form.endDate ? formError : ''}
              required
              className="bg-slate-50/50"
            />
          </div>
          <Input
            label="Date of Payment"
            type="date"
            value={form.dateOfPayment}
            onChange={(e) => setForm({ ...form, dateOfPayment: e.target.value })}
            className="bg-slate-50/50"
          />
          {/* Duration preview */}
          {(days > 0 || hours > 0) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
                <span>Calendar Duration:</span>
                <span className="font-black">{days} days</span>
              </div>
              <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
                <span>Productive Capacity:</span>
                <span className="font-black">
                  {monthlyBasis} days × {dailyBasis} hrs = {hours} hrs
                </span>
              </div>
              <p className="text-[10px] text-emerald-600/70 italic mt-1">
                Standard monthly basis used for payroll calculations
              </p>
            </div>
          )}
          {formError && (
            <p className="text-xs font-medium text-rose-500">{formError}</p>
          )}
        </div>
      </Modal>

      {/* ── OPEN CONFIRMATION MODAL ──────────────────────────────── */}
      <Modal
        isOpen={!!openConfirmId}
        onClose={() => setOpenConfirmId(null)}
        title="Open Payroll Period?"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="outline" onClick={() => setOpenConfirmId(null)}>
              {currentlyOpenPeriod ? 'Got it' : 'Cancel'}
            </Button>
            {!currentlyOpenPeriod && (
              <Button variant="primary" onClick={handleConfirmOpen}>
                Yes, Open
              </Button>
            )}
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full shrink-0 ${currentlyOpenPeriod ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${currentlyOpenPeriod ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
          <div className="space-y-2">
            {currentlyOpenPeriod ? (
              <>
                <p className="text-sm text-slate-800 font-semibold">
                  Close the active payroll period first
                </p>
                <p className="text-sm text-slate-600">
                  "<span className="font-semibold text-slate-900">{currentlyOpenPeriod.name || 'Unnamed period'}</span>" is currently the active payroll period. You must close it before opening a new one.
                </p>
                <p className="text-sm text-slate-500">
                  Go to the active period above and click <span className="font-medium text-amber-600">Close</span> to close it, then try opening this period again.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-700">
                  Are you sure you want to open <span className="font-bold text-slate-900">"{pendingOpenPeriod?.name || 'this period'}"</span>?
                </p>
                <p className="text-sm text-slate-600">This will mark it as the active payroll period.</p>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* ── CLOSE CONFIRMATION MODAL ─────────────────────────────── */}
      <Modal
        isOpen={!!closeConfirmId}
        onClose={() => setCloseConfirmId(null)}
        title="Close Payroll Period?"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              id="btn-cancel-close-period"
              onClick={() => setCloseConfirmId(null)}
              className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-close-period"
              onClick={handleConfirmClose}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Confirm Close
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-800 font-medium">
              This action is permanent. Closed periods cannot be reopened or edited.
            </p>
          </div>
          <p className="text-sm text-slate-600">
            Are you sure you want to close <span className="font-bold text-slate-900">"{pendingClosePeriod?.name || 'this period'}"</span>?
          </p>
        </div>
      </Modal>
    </ConfigSection>
  );
};
