import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Percent, Info, ChevronDown } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';
import { Modal, Button } from '../../../components/ui';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection, ConfigEmptyState, ConfigModalFooter } from './shared';
import { DeductionsView } from './DeductionsView';
import { toast } from '../../../components/ui/Toast';
import {
  emptyDeductionConfigForm,
  VALUE_RULE_OPTIONS,
  BASIS_OPTIONS,
} from '../constants';
import type { DeductionConfig, DeductionType, DeductionCalculationType, ValueRule, CalculationBasis } from '../types/configuration.types';

/** Searchable combobox that lets users select an existing label or type a new one. */
const DeductionLabelCombobox = ({
  value,
  onChange,
  error,
  existingLabels,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  existingLabels: string[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = existingLabels.filter((l) =>
    l.toLowerCase().includes(search.toLowerCase())
  );

  const isCustom =
    search.trim().length > 0 &&
    !existingLabels.some((l) => l.toLowerCase() === search.trim().toLowerCase());

  const selectOption = (label: string) => {
    onChange(label);
    setSearch('');
    setIsOpen(false);
  };

  const commitCustom = () => {
    onChange(search.trim());
    setSearch('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearch(v);
    onChange(v);
    setIsOpen(true);
  };

  const handleFocus = () => {
    setIsOpen(true);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isCustom) {
      e.preventDefault();
      commitCustom();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-1.5 relative" ref={wrapperRef}>
      <label className="block text-sm font-semibold text-slate-700 mb-0.5">
        Label / Name <span className="text-rose-500">*</span>
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search || value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search or type new..."
          className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-medium text-slate-900 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
            error
              ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 left-0 right-0 max-h-60 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg">
          {filtered.length > 0 && (
            <div className="py-1">
              {filtered.map((label) => (
                <button
                  key={label}
                  type="button"
                  onMouseDown={() => selectOption(label)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    value === label
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {isCustom && (
            <button
              type="button"
              onMouseDown={commitCustom}
              className="w-full text-left px-4 py-2.5 text-sm text-emerald-700 font-bold hover:bg-emerald-50 border-t border-slate-100 transition-colors"
            >
              Use &ldquo;{search.trim()}&rdquo; as new label
            </button>
          )}
          {!isCustom && filtered.length === 0 && search && (
            <div className="px-4 py-3 text-sm text-slate-400">No matching labels found</div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
};

/**
 * DeductionsConfiguration component for managing deduction type templates.
 * Supports add/edit/delete operations with Type A (fixed) and Type B (per-employee) value rules.
 */
export const DeductionsConfiguration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: deductions, loading, saving, error } = useAppSelector((s) => s.configuration.deductions);

  const [localDeductions, setLocalDeductions] = useState<DeductionConfig[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState(emptyDeductionConfigForm);
  const [formError, setFormError] = useState('');
  const [displayPage, setDisplayPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFixedValue, setIsFixedValue] = useState(false);

  const totalPages = Math.max(1, Math.ceil(localDeductions.length / pageSize));
  const paginatedDeductions = useMemo(
    () => localDeductions.slice((displayPage - 1) * pageSize, displayPage * pageSize),
    [localDeductions, displayPage, pageSize]
  );

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(localDeductions.length / pageSize));
    if (displayPage > maxPage) setDisplayPage(maxPage);
  }, [localDeductions.length, pageSize]);

  useEffect(() => {
    if (Array.isArray(deductions)) {
      setLocalDeductions(deductions.map((d) => ({
        id: d.id,
        salaryStructureId: d.salaryStructureId,
        deductionType: d.deductionType,
        label: d.label,
        isMandatory: d.isMandatory ?? false,
        isStatutory: d.isStatutory ?? false,
        calculationType: d.calculationType ?? null,
        calculationBasis: d.calculationBasis ?? null,
        amount: d.amount ?? null,
        percent: d.percent ?? null,
      } as DeductionConfig)));
    }
  }, [deductions]);

  const openAdd = () => {
    setEditIndex(null);
    setForm(emptyDeductionConfigForm);
    setIsFixedValue(false);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (paginatedIndex: number) => {
    const actualIndex = (displayPage - 1) * pageSize + paginatedIndex;
    const d = localDeductions[actualIndex];
    const hasFixedVal = d.amount != null || d.percent != null;
    const calcType = d.calculationType;

    // Map DB calculationType to valueRule + calculationBasis
    let valueRule: ValueRule = 'FIXED_AMOUNT';
    let calculationBasis: CalculationBasis = d.calculationBasis ?? 'BASIC';
    if (calcType === 'PERCENTAGE_OF_BASIC') { valueRule = 'PERCENTAGE'; calculationBasis = 'BASIC'; }
    else if (calcType === 'PERCENTAGE_OF_GROSS') { valueRule = 'PERCENTAGE'; calculationBasis = 'GROSS'; }
    else if (calcType === 'FIXED_AMOUNT') { valueRule = 'FIXED_AMOUNT'; calculationBasis = calculationBasis || 'BASIC'; }
    // calcType === null (legacy per-employee) or REMAINING_BALANCE: default to FIXED_AMOUNT + BASIC

    setEditIndex(actualIndex);
    setIsFixedValue(hasFixedVal);
    setForm({
      label: d.label,
      deductionType: (d.deductionType as DeductionType) || 'OTHER',
      isMandatory: d.isMandatory ?? false,
      isStatutory: d.isStatutory ?? false,
      calculationType: calcType ?? null,
      calculationBasis,
      valueRule,
      amount: d.amount ?? null,
      percent: d.percent ?? null,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!form.label.trim()) {
      setFormError('Name is required');
      return;
    }
    setFormError('');

    // Map valueRule + calculationBasis → DB calculationType (always set for both Per-Employee and Fixed)
    let calcType: DeductionCalculationType | null = null;
    let calcBasis: CalculationBasis | null = form.calculationBasis;
    if (form.valueRule === 'FIXED_AMOUNT') {
      calcType = 'FIXED_AMOUNT';
      calcBasis = form.calculationBasis || 'BASIC';
    } else { // PERCENTAGE
      if (form.calculationBasis === 'GROSS') calcType = 'PERCENTAGE_OF_GROSS';
      else calcType = 'PERCENTAGE_OF_BASIC'; // default to BASIC
      calcBasis = form.calculationBasis || 'BASIC';
    }

    const data = {
      deductionType: form.deductionType,
      label: form.label.trim(),
      isMandatory: form.isMandatory,
      isStatutory: form.isStatutory,
      calculationType: calcType,
      calculationBasis: calcBasis,
      amount: form.amount,
      percent: form.percent,
    };

    if (editIndex !== null) {
      const existingItem = localDeductions[editIndex];
      if (existingItem?.id) {
        dispatch(configurationActions.updateDeductionRequest({ id: existingItem.id, data }));
        setModalOpen(false);
        toast.success(`"${data.label}" updated.`);
      } else {
        const updated = localDeductions.map((d, i) => (i === editIndex ? { ...d, ...data } : d));
        setLocalDeductions(updated);
        setModalOpen(false);
        toast.success(`"${data.label}" updated locally. Save All to persist.`);
      }
    } else {
      const salaryStructureId = localDeductions.find((d) => d.salaryStructureId)?.salaryStructureId;
      dispatch(configurationActions.createDeductionRequest({ salaryStructureId: salaryStructureId || '', data }));
      setModalOpen(false);
      toast.success(`"${data.label}" created.`);
    }
  };

  const removeDeduction = (paginatedIndex: number) => {
    const actualIndex = (displayPage - 1) * pageSize + paginatedIndex;
    const item = localDeductions[actualIndex];
    if (item?.id) {
      dispatch(configurationActions.deleteDeductionRequest(item.id));
      toast.success(`"${item.label}" deleted.`);
    } else {
      const updated = localDeductions.filter((_, i) => i !== actualIndex);
      setLocalDeductions(updated);
      toast.success(`"${item?.label}" removed.`);
    }
  };

  const handleSave = () => {
    dispatch(configurationActions.saveDeductionsRequest({ salaryStructureId: '', deductions: localDeductions }));
  };

  const deductionRendererState = {
    data: localDeductions,
    loading,
    error: error ? { status: 500, message: error } : null,
    isRefreshing: saving,
  };

  return (
    <ConfigSection
      id="deductions"
      title="Deduction Types"
      description={
        <span className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
          <span>
            Configure deduction type templates.
            <strong className="text-blue-600"> Fixed: </strong>
            Value is defined here and applies to all employees.
            <strong className="text-blue-600"> Per-Employee: </strong>
            Template only — values are entered when assigning to each employee.
          </span>
        </span>
      }
      showBadge={localDeductions.length > 0 && !loading}
      actionButton={
        <Button onClick={openAdd} className="shadow shadow-emerald-200/50 whitespace-nowrap">
          <Plus className="w-4 h-4" /> Add Deduction Type
        </Button>
      }
    >
      <DataRenderer
        state={deductionRendererState}
        onRetry={() => dispatch(configurationActions.fetchDeductionsRequest({ page: 1, limit: 100 }))}
        renderEmpty={
          <ConfigEmptyState
            icon={<Percent className="w-8 h-8" />}
            title="No deduction types found"
            message='Click "Add Deduction Type" to create your first deduction type template. Assign specific amounts to employees in the Employee Deductions section.'
          />
        }
        renderSuccess={() => (
          <DeductionsView
            deductions={localDeductions}
            paginatedDeductions={paginatedDeductions}
            displayPage={displayPage}
            totalPages={totalPages}
            pageSize={pageSize}
            saving={saving}
            onPageChange={setDisplayPage}
            onPageSizeChange={(s) => { setPageSize(s); setDisplayPage(1); }}
            onOpenEdit={openEdit}
            onRemove={removeDeduction}
            onSave={handleSave}
          />
        )}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editIndex !== null ? 'Edit Deduction Type' : 'Add Deduction Type'}
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
          {/* Label / Name — searchable combobox with existing labels */}
          <DeductionLabelCombobox
            value={form.label}
            onChange={(v) => { setForm({ ...form, label: v }); setFormError(''); }}
            error={formError}
            existingLabels={localDeductions.map((d) => d.label).filter(Boolean)}
          />

          {/* Type A / Type B Toggle */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Deduction Value Rule</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsFixedValue(false);
                    setForm({ ...form, valueRule: 'FIXED_AMOUNT', calculationBasis: 'BASIC', amount: null, percent: null });
                  }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !isFixedValue
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                  !isFixedValue
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}>👤</span>
                <div className="text-left leading-tight">
                  <div className="font-semibold">Per-Employee</div>
                  <div className="font-normal text-[10px] opacity-80">Value set at assignment</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFixedValue(true);
                  setForm({ ...form, valueRule: 'FIXED_AMOUNT', calculationBasis: 'BASIC', amount: null, percent: null });
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isFixedValue
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                  isFixedValue
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}>⚡</span>
                <div className="text-left leading-tight">
                  <div className="font-semibold">Fixed</div>
                  <div className="font-normal text-[10px] opacity-80">Same for all employees</div>
                </div>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              {!isFixedValue
                ? 'Each employee gets their own value when assigned to this deduction.'
                : 'All employees assigned to this deduction share the same fixed value.'}
            </p>
          </div>

          {/* Value Rule toggle: Fixed Amount | Percent (for both Per-Employee and Fixed) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Deduction Value Rule</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              {VALUE_RULE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setForm({
                      ...form,
                      valueRule: opt.value as ValueRule,
                      amount: opt.value === 'FIXED_AMOUNT' ? form.amount : null,
                      percent: opt.value === 'PERCENTAGE' ? form.percent : null,
                    });
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    form.valueRule === opt.value
                      ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    form.valueRule === opt.value
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>{opt.icon}</span>
                  <div className="text-left leading-tight">
                    <div className="font-semibold">{opt.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Calculation Basis toggle: Basic | Gross */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Calculation Basis</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              {BASIS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, calculationBasis: opt.value as CalculationBasis })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    form.calculationBasis === opt.value
                      ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <div className="text-center leading-tight">
                    <div className="font-semibold">{opt.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Value inputs — only for Fixed (value set at template level) */}
          {isFixedValue && (
            <>
              {/* Amount input — for Fixed Amount */}
              {form.valueRule === 'FIXED_AMOUNT' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fixed Amount <span className="text-rose-500">*</span></label>
                  <div className="flex items-center border border-slate-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all overflow-hidden">
                    <span className="pl-3.5 pr-2 text-slate-500 font-medium text-sm border-r border-slate-200 py-2.5 bg-slate-50" />
                    <input
                      type="number"
                      value={form.amount ?? ''}
                      onChange={(e) => setForm({ ...form, amount: e.target.value ? Number(e.target.value) : null })}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}

              {/* Percent input — for Percent */}
              {form.valueRule === 'PERCENTAGE' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Percent <span className="text-rose-500">*</span></label>
                  <div className="flex items-center border border-slate-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all overflow-hidden">
                    <input
                      type="number"
                      value={form.percent ?? ''}
                      onChange={(e) => setForm({ ...form, percent: e.target.value ? Number(e.target.value) : null })}
                      placeholder="0"
                      className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
                    />
                    <span className="px-3.5 text-slate-500 font-medium text-sm border-l border-slate-200 py-2.5 bg-slate-50">%</span>
                  </div>
                </div>
              )}
            </>
          )}



          {/* Flags: Mandatory / Statutory */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2.5">Configuration Flags</label>
            <div className="flex gap-3">
              <label className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all select-none ${
                form.isMandatory ? 'border-emerald-300 bg-emerald-50/80' : 'border-slate-200 bg-white hover:border-slate-300'
              }">
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                  form.isMandatory
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'border-slate-300'
                }`}>
                  {form.isMandatory && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={form.isMandatory}
                  onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })}
                  className="sr-only"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight">Mandatory</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Required for all employees</p>
                </div>
              </label>
              <label className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all select-none ${
                form.isStatutory ? 'border-amber-300 bg-amber-50/80' : 'border-slate-200 bg-white hover:border-slate-300'
              }">
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                  form.isStatutory
                    ? 'bg-amber-500 border-amber-500'
                    : 'border-slate-300'
                }`}>
                  {form.isStatutory && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={form.isStatutory}
                  onChange={(e) => setForm({ ...form, isStatutory: e.target.checked })}
                  className="sr-only"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight">Statutory</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Gov-mandated deduction</p>
                </div>
              </label>
            </div>
          </div>

          {/* Statutory note */}
          {form.isStatutory && (
            <div className="p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-xs shrink-0 mt-0.5">⚖️</span>
                <div>
                  <p className="text-xs font-semibold text-amber-800">Statutory Deduction</p>
                  <p className="text-[11px] text-amber-700/80 mt-0.5">
                    Statutory deductions (like tax and pension) are calculated automatically based on government rules and employee earnings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </ConfigSection>
  );
};
