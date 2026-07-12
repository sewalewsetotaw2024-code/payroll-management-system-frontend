import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Tag, ChevronDown } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';
import { Modal, Button } from '../../../components/ui';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection, ConfigEmptyState, ConfigModalFooter } from './shared';
import { AllowancesView } from './AllowancesView';
import { emptyAllowanceForm } from '../constants';
import { enumApi } from '../api/configurationApi';
import { cn } from '../../../lib/utils';
import type { AllowanceConfig } from '../types/configuration.types';

// ── Combobox ─────────────────────────────────────────────────────
/** Searchable combobox that lets users select from options or type a custom value. */
const EarningTypeCombobox = ({
  options,
  value,
  onChange,
  error,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [manualValue, setManualValue] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive the label for the current value
  const currentLabel = options.find((o) => o.value === value)?.label || value;

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

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const isCustom =
    search.trim().length > 0 &&
    !options.some(
      (o) => o.label.toLowerCase() === search.trim().toLowerCase()
    );

  const selectOption = useCallback(
    (optValue: string, optLabel: string) => {
      onChange(optValue);
      setSearch('');
      setManualValue('');
      setIsOpen(false);
    },
    [onChange]
  );

  const commitCustom = useCallback(() => {
    const customKey = search.trim().toUpperCase().replace(/\s+/g, '_');
    onChange(customKey);
    setSearch('');
    setManualValue('');
    setIsOpen(false);
  }, [search, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearch(v);
    setManualValue(v);
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
      <label className="text-sm font-bold text-slate-700">Earning Type</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={manualValue || currentLabel}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search or type custom..."
          className={cn(
            'w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-medium text-slate-900',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
            error
              ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-slate-200 hover:border-slate-300',
          )}
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-[calc(100%-2rem)] max-h-60 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg">
          {filtered.length > 0 && (
            <div className="py-1">
              {filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={() => selectOption(opt.value, opt.label)}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm transition-colors',
                    value === opt.value
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {opt.label}
                  <span className="text-[10px] text-slate-400 ml-2">{opt.value}</span>
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
              Use "{search.trim()}" as custom earning type
            </button>
          )}
          {!isCustom && filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">No matching types</div>
          )}
        </div>
      )}
      {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
    </div>
  );
};

/**
 * AllowancesConfiguration component for managing allowance types (earning types).
 * Supports add/edit/delete operations on allowance configurations via Redux sagas.
 */
export const AllowancesConfiguration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: allowances, loading, saving, error } = useAppSelector((s) => s.configuration.allowances);

  const [localAllowances, setLocalAllowances] = useState<AllowanceConfig[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState(emptyAllowanceForm);
  const [formError, setFormError] = useState('');
  const [displayPage, setDisplayPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [earningTypeOptions, setEarningTypeOptions] = useState<{ value: string; label: string }[]>([]);

  const totalPages = Math.max(1, Math.ceil(localAllowances.length / pageSize));
  const paginatedAllowances = useMemo(
    () => localAllowances.slice((displayPage - 1) * pageSize, displayPage * pageSize),
    [localAllowances, displayPage, pageSize]
  );

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(localAllowances.length / pageSize));
    if (displayPage > maxPage) setDisplayPage(maxPage);
  }, [localAllowances.length, pageSize]);

  useEffect(() => {
    if (Array.isArray(allowances)) {
      setLocalAllowances(allowances.map((a) => ({ ...a })));
    }
  }, [allowances]);

  useEffect(() => {
    enumApi.getEarningTypes().then((res) => {
      if (res.data?.data) setEarningTypeOptions(res.data.data);
    }).catch((err) => console.error('Failed to fetch earning types', err));
  }, []);

  const openAdd = () => {
    setEditIndex(null);
    setForm(emptyAllowanceForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (paginatedIndex: number) => {
    const actualIndex = (displayPage - 1) * pageSize + paginatedIndex;
    const a = localAllowances[actualIndex];
    setEditIndex(actualIndex);
    setForm({
      earningType: a.earningType,
      label: a.label,
      isTaxable: a.isTaxable,
      isExempt: a.isExempt ?? false,
      exemptPercent: a.exemptPercent ?? null,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!form.earningType.trim()) {
      setFormError('Earning type is required');
      return;
    }
    const duplicate = localAllowances.findIndex(
      (a, i) => i !== editIndex && a.earningType === form.earningType
    );
    if (duplicate >= 0) {
      setFormError('An earning type with this type already exists');
      return;
    }
    // Derive display label from the earning type's human-readable name, or fall back to the key
    const typeOption = earningTypeOptions.find((o) => o.value === form.earningType);
    const label = typeOption?.label || form.earningType;
    const item = {
      earningType: form.earningType,
      label,
      isTaxable: form.isTaxable,
      isExempt: form.isExempt,
      exemptPercent: form.isExempt ? form.exemptPercent : null,
    };
    if (editIndex !== null) {
      const id = localAllowances[editIndex].id;
      if (id) {
        dispatch(configurationActions.updateAllowanceRequest({ id, data: item }));
      }
    } else {
      dispatch(configurationActions.createAllowanceRequest(item));
    }
    setModalOpen(false);
  };

  const removeAllowance = (paginatedIndex: number) => {
    const actualIndex = (displayPage - 1) * pageSize + paginatedIndex;
    const id = localAllowances[actualIndex].id;
    if (id) {
      dispatch(configurationActions.deleteAllowanceRequest(id));
    } else {
      setLocalAllowances((prev) => prev.filter((_, i) => i !== actualIndex));
    }
  };

  const handleSave = () => {
    dispatch(configurationActions.saveAllowancesRequest(localAllowances));
  };

  const allowanceRendererState = {
    data: localAllowances,
    loading,
    error: error ? { status: 500, message: error } : null,
    isRefreshing: saving,
  };

  return (
    <ConfigSection
      id="allowances"
      title="Earning Types"
      description="Configure all employee earnings: Base Salary, Allowances, Bonuses, Overtime, etc."
      showBadge={localAllowances.length > 0 && !loading}
      actionButton={
        <Button onClick={openAdd} className="shadow shadow-emerald-200/50">
          <Plus className="w-4 h-4" /> Add Earning Type
        </Button>
      }
    >
      <DataRenderer
        state={allowanceRendererState}
        onRetry={() => dispatch(configurationActions.fetchAllowancesRequest({ page: 1, limit: 100 }))}
        renderEmpty={
          <ConfigEmptyState
            icon={<Tag className="w-8 h-8" />}
            title="No earning types configured"
            message='Define all earnings (Basic Salary, Allowances, Bonuses, etc.) by clicking "Add Earning Type".'
          />
        }
        renderSuccess={() => (
          <AllowancesView
            allowances={localAllowances}
            paginatedAllowances={paginatedAllowances}
            displayPage={displayPage}
            totalPages={totalPages}
            pageSize={pageSize}
            saving={saving}
            onPageChange={setDisplayPage}
            onPageSizeChange={(s) => { setPageSize(s); setDisplayPage(1); }}
            onOpenEdit={openEdit}
            onRemove={removeAllowance}
            onSave={handleSave}
          />
        )}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editIndex !== null ? 'Edit Earning Type' : 'Add Earning Type'}
        size="sm"
        footer={
          <ConfigModalFooter
            onCancel={() => setModalOpen(false)}
            onSave={handleSaveItem}
            isEdit={editIndex !== null}
          />
        }
      >
        <div className="space-y-4">
          {/* Earning Type — searchable combobox with custom value support */}
          <EarningTypeCombobox
            options={earningTypeOptions}
            value={form.earningType}
            onChange={(v) => { setForm({ ...form, earningType: v }); setFormError(''); }}
          />

          {/* Tax Treatment */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Tax Treatment</label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                form.isTaxable ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input type="radio" name="taxable" checked={form.isTaxable} onChange={() => setForm({ ...form, isTaxable: true })} className="sr-only" />
                <span className="text-sm font-bold">Taxable</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                !form.isTaxable ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input type="radio" name="taxable" checked={!form.isTaxable} onChange={() => setForm({ ...form, isTaxable: false })} className="sr-only" />
                <span className="text-sm font-bold">Non-Taxable</span>
              </label>
            </div>
          </div>

          {/* Tax Exemption — only shown when taxable */}
          {form.isTaxable && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isExempt}
                  onChange={(e) => setForm({ ...form, isExempt: e.target.checked, exemptPercent: e.target.checked ? form.exemptPercent : null })}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                />
                <span className="text-sm font-bold text-slate-700">Tax Exempt</span>
                <span className="text-[10px] text-slate-400">(Mark portion as exempt from tax)</span>
              </label>

              {form.isExempt && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Exempt Percent</label>
                  <div className="relative flex-1 max-w-[200px]">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={form.exemptPercent ?? ''}
                      onChange={(e) => setForm({ ...form, exemptPercent: e.target.value ? Number(e.target.value) : null })}
                      placeholder="0.00"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </ConfigSection>
  );
};
