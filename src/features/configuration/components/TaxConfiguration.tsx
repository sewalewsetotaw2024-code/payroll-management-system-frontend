import { useState, useEffect, useMemo } from 'react';
import { Plus, BadgePercent, Calculator, Calendar } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';
import { Modal, Input, Button } from '../../../components/ui';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection, ConfigEmptyState, ConfigModalFooter } from './shared';
import { TaxView } from './TaxView';
import { toast } from '../../../components/ui/Toast';
import type { TaxBracket } from '../types/configuration.types';

const emptyForm = {
  lowerBound: 0,
  upperBound: null as number | null,
  rate: 0,
  deductionAmount: 0,
};

/**
 * TaxConfiguration component for managing progressive tax brackets.
 * Supports add/edit/delete operations on tax brackets and batch save via Redux sagas.
 */
export const TaxConfiguration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: taxBrackets, loading, saving, error } = useAppSelector((s) => s.configuration.taxBrackets);

  const [localBrackets, setLocalBrackets] = useState<TaxBracket[]>([]);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [globalExpiryDate, setGlobalExpiryDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [displayPage, setDisplayPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(localBrackets.length / pageSize));
  const paginatedBrackets = useMemo(
    () => localBrackets.slice((displayPage - 1) * pageSize, displayPage * pageSize),
    [localBrackets, displayPage, pageSize]
  );

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(localBrackets.length / pageSize));
    if (displayPage > maxPage) setDisplayPage(maxPage);
  }, [localBrackets.length, pageSize]);

  // Sync the shared effective/expiry dates to all local brackets when the pickers change
  useEffect(() => {
    setLocalBrackets((prev) =>
      prev.map((b) => ({
        ...b,
        effectiveDate: effectiveDate as any,
        expiryDate: globalExpiryDate || null,
      })),
    );
  }, [effectiveDate, globalExpiryDate]);

  useEffect(() => {
    if (Array.isArray(taxBrackets)) {
      // Prisma Decimal fields arrive as JSON strings — coerce to numbers
      setLocalBrackets(taxBrackets.map((b) => ({
        ...b,
        lowerBound: Number(b.lowerBound),
        upperBound: b.upperBound != null ? Number(b.upperBound) : null,
        rate: Number(b.rate),
        deductionAmount: Number(b.deductionAmount),
      })));
      // Pre-fill effective/expiry dates from existing bracket data
      const existingEffective = (taxBrackets as TaxBracket[]).find((b) => b.effectiveDate);
      if (existingEffective?.effectiveDate) {
        setEffectiveDate(existingEffective.effectiveDate.slice(0, 10));
      }
      const existingExpiry = (taxBrackets as TaxBracket[]).find((b) => b.expiryDate);
      if (existingExpiry?.expiryDate) {
        setGlobalExpiryDate(existingExpiry.expiryDate.slice(0, 10));
      }
    }
  }, [taxBrackets]);

  const openAdd = () => {
    setEditIndex(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (paginatedIndex: number) => {
    const actualIndex = (displayPage - 1) * pageSize + paginatedIndex;
    const b = localBrackets[actualIndex];
    setEditIndex(actualIndex);
    setForm({
      lowerBound: b.lowerBound,
      upperBound: b.upperBound,
      rate: Number((b.rate * 100).toFixed(2)),
      deductionAmount: b.deductionAmount,
    });
    setFormError('');
    setModalOpen(true);
  };

  /**
   * Normalizes a tax bracket object for API submission: strips extraneous fields,
   * converts percentage rate to decimal, and ensures upperBound is null for unlimited brackets.
   */
  const normalizeBracket = (b: Partial<TaxBracket> & { rate?: number }) => ({
    lowerBound: b.lowerBound ?? 0,
    upperBound: b.upperBound != null && b.upperBound > 0 ? b.upperBound : null,
    rate: b.rate != null && b.rate > 1 ? b.rate / 100 : (b.rate ?? 0),
    deductionAmount: b.deductionAmount ?? 0,
    effectiveDate,
    expiryDate: globalExpiryDate || null,
  });

  const handleSaveItem = () => {
    if (globalExpiryDate && new Date(globalExpiryDate) <= new Date(effectiveDate)) {
      toast.error('Expiry date must be after the effective date');
      return;
    }
    if (form.lowerBound < 0) {
      setFormError('Lower bound must be 0 or greater');
      return;
    }
    if (form.upperBound != null && form.upperBound <= form.lowerBound) {
      setFormError('Upper bound must be greater than lower bound');
      return;
    }
    if (form.rate < 0 || form.rate > 100) {
      setFormError('Rate must be between 0 and 100');
      return;
    }
    if (form.deductionAmount < 0) {
      setFormError('Deduction amount cannot be negative');
      return;
    }
    const normalizeForDuplicate = (b: TaxBracket) => ({
      lowerBound: b.lowerBound,
      upperBound: b.upperBound != null && b.upperBound > 0 ? b.upperBound : null,
    });
    const current = normalizeForDuplicate({ lowerBound: form.lowerBound, upperBound: form.upperBound ?? null } as TaxBracket);
    const duplicate = localBrackets.findIndex(
      (b, i) => i !== editIndex &&
        b.lowerBound === current.lowerBound &&
        ((b.upperBound != null && b.upperBound > 0 ? b.upperBound : null) === current.upperBound)
    );
    if (duplicate >= 0) {
      setFormError('A bracket with these bounds already exists');
      return;
    }
    const item = normalizeBracket(form);
    if (editIndex !== null) {
      const id = localBrackets[editIndex].id;
      if (id) {
        dispatch(configurationActions.updateTaxBracketRequest({ id, data: item }));
      }
    } else {
      dispatch(configurationActions.createTaxBracketRequest(item));
    }
    setModalOpen(false);
  };

  const removeBracket = (paginatedIndex: number) => {
    const actualIndex = (displayPage - 1) * pageSize + paginatedIndex;
    const id = localBrackets[actualIndex].id;
    if (id) {
      dispatch(configurationActions.deleteTaxBracketRequest(id));
    } else {
      setLocalBrackets((prev) => prev.filter((_, i) => i !== actualIndex));
    }
  };

  const handleSave = () => {
    if (globalExpiryDate && new Date(globalExpiryDate) <= new Date(effectiveDate)) {
      toast.error('Expiry date must be after the effective date');
      return;
    }
    for (const b of localBrackets) {
      if (b.lowerBound < 0) {
        toast.error(`Bracket "${b.lowerBound}" has a negative lower bound`);
        return;
      }
      // Rate from server is decimal (0-1). Also accept percentage (1-100) as valid.
      if (b.rate < 0 || b.rate > 100) {
        toast.error(`Bracket "${b.lowerBound}" has an invalid rate (must be 0–100)`);
        return;
      }
      if (b.deductionAmount < 0) {
        toast.error(`Bracket "${b.lowerBound}" has a negative deduction amount`);
        return;
      }
      // Treat upperBound of 0 as "no limit" (same as null) — it's a common data issue
      if (b.upperBound != null && b.upperBound > 0 && b.upperBound <= b.lowerBound) {
        toast.error(`Bracket "${b.lowerBound}" has upper bound (${b.upperBound}) ≤ lower bound (${b.lowerBound}). Please fix the bracket.`);
        return;
      }
    }

    const payload = localBrackets.map((b) => normalizeBracket(b));
    dispatch(configurationActions.saveTaxBracketsRequest(payload));
  };

  const taxRendererState = {
    data: localBrackets,
    loading,
    error: error ? { status: 500, message: error } : null,
    isRefreshing: saving,
  };

  return (
    <ConfigSection
      id="tax"
      title="Ethiopian Tax Brackets"
      description="Progressive tax rates based on monthly income"
      showBadge={localBrackets.length > 0 && !loading}
      actionButton={
        <Button onClick={openAdd} className="shadow shadow-brand-200/50">
          <Plus className="w-4 h-4" /> Add Bracket
        </Button>
      }
    >
      <DataRenderer
        state={taxRendererState}
        onRetry={() => dispatch(configurationActions.fetchTaxBracketsRequest({ page: 1, limit: 100 }))}
        renderEmpty={
          <ConfigEmptyState
            icon={<BadgePercent className="w-8 h-8" />}
            title="No tax brackets configured"
            message='Click "Add Bracket" to create the first tax bracket for this period.'
          />
        }
        renderSuccess={() => (
          <TaxView
            brackets={localBrackets}
            paginatedBrackets={paginatedBrackets}
            displayPage={displayPage}
            totalPages={totalPages}
            pageSize={pageSize}
            saving={saving}
            onPageChange={setDisplayPage}
            onPageSizeChange={(s) => { setPageSize(s); setDisplayPage(1); }}
            onOpenEdit={openEdit}
            onRemove={removeBracket}
            onSave={handleSave}
            dateFields={
              <div className="flex flex-wrap items-center gap-4 pt-4 pb-2">
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Effective Date</span>
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="text-xs font-medium text-slate-600 bg-transparent border-none outline-none w-36"
                  />
                </label>
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Expiry Date</span>
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={globalExpiryDate}
                    onChange={(e) => setGlobalExpiryDate(e.target.value)}
                    className="text-xs font-medium text-slate-600 bg-transparent border-none outline-none w-36"
                    placeholder="No expiry"
                  />
                </label>
              </div>
            }
          />
        )}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editIndex !== null ? 'Edit Tax Bracket' : 'Add Tax Bracket'}
        size="sm"
        footer={
          <ConfigModalFooter
            onCancel={() => setModalOpen(false)}
            onSave={handleSaveItem}
            isEdit={editIndex !== null}
          />
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Lower Bound "
              type="number"
              value={form.lowerBound}
              onChange={(e) => { setForm({ ...form, lowerBound: Number(e.target.value) }); setFormError(''); }}
              placeholder="e.g. 0"
              error={formError}
              icon={<Calculator className="w-4 h-4" />}
              required
            />
            <Input
              label="Upper Bound "
              type="number"
              value={form.upperBound ?? ''}
              onChange={(e) => setForm({ ...form, upperBound: e.target.value ? Number(e.target.value) : null })}
              placeholder="e.g. 6000"
              icon={<Calculator className="w-4 h-4" />}
              helperText="Leave empty for no limit"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tax Rate (%)"
              type="number"
              step="0.01"
              value={form.rate}
              onChange={(e) => { setForm({ ...form, rate: Number(e.target.value) }); setFormError(''); }}
              placeholder="e.g. 30"
              icon={<BadgePercent className="w-4 h-4" />}
              required
            />
            <Input
              label="Deduction "
              type="number"
              value={form.deductionAmount}
              onChange={(e) => { setForm({ ...form, deductionAmount: Number(e.target.value) }); }}
              placeholder="e.g. 0"
              icon={<Calculator className="w-4 h-4" />}
              required
            />
          </div>

        </div>
      </Modal>
    </ConfigSection>
  );
};
