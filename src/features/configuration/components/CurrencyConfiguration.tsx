import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, DollarSign, Pencil, Trash2, Star, RefreshCw, Info,
  CheckCircle2, XCircle, Globe, Hash, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';
import { Modal, Input, Select, Button, Toggle } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection, ConfigEmptyState, ConfigModalFooter, ConfigSaveButton } from './shared';
import { CurrencyConfigurationView } from './CurrencyConfigurationView';
import { ROUNDING_RULE_OPTIONS, RATE_SOURCE_OPTIONS } from '../constants';
import type { SystemCurrency, RoundingRule } from '../types/configuration.types';

// ─── Form templates ──────────────────────────────────────────────

/** Empty form template for currency creation. */
const emptyCurrencyForm = {
  code: '',
  name: '',
  symbol: '',
  decimalPlaces: '2',
  roundingRule: 'ROUND_HALF_UP' as RoundingRule,
  isBase: false,
  isActive: true,
  autoFetchRate: false,
};

// ─── Sub-components ──────────────────────────────────────────────

/** Form section helper for consistent spacing. */
const FormSection: React.FC<{ icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }> = ({
  icon, title, description, children,
}) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">{icon}</div>
      <div>
        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{title}</span>
        {description && <p className="text-[11px] text-slate-400">{description}</p>}
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  </div>
);

/** Base currency card — prominent display of the company's base currency. */
const BaseCurrencyCard: React.FC<{
  baseCurrency: SystemCurrency | undefined;
  currencies: SystemCurrency[];
  onChangeBase: (id: string) => void;
  saving: boolean;
}> = ({ baseCurrency, currencies, onChangeBase, saving }) => {
  const [selectOpen, setSelectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  if (!baseCurrency) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-amber-500 shadow-sm">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">No Base Currency Set</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Select a base currency to enable multi-currency payroll
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectOpen(true)}
          className="border-amber-300 text-amber-700 hover:bg-amber-100"
        >
          Set Base Currency
        </Button>
        {selectOpen && (
          <Modal
            isOpen={selectOpen}
            onClose={() => setSelectOpen(false)}
            title="Set Base Currency"
            size="sm"
            footer={
              <ConfigModalFooter
                onCancel={() => setSelectOpen(false)}
                onSave={() => { onChangeBase(selectedId); setSelectOpen(false); }}
                isEdit={false}
                saving={saving}
                saveLabel="Set as Base"
              />
            }
          >
            <Select
              label="Select Currency"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              options={currencies.map((c) => ({ value: c.id!, label: `${c.code} — ${c.name}` }))}
              placeholder="Choose currency"
            />
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-brand-50 to-brand-100/30 border border-brand-200 rounded-2xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
            <Globe className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-black text-slate-900">{baseCurrency.code}</h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-200/60 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                <Star className="w-3 h-3 fill-emerald-600" />
                Base Currency
              </span>
            </div>
            <p className="text-sm text-slate-600 font-medium mt-0.5">
              {baseCurrency.name} ({baseCurrency.symbol})
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Decimals</span>
          <p className="text-sm font-bold text-slate-800 mt-1">{baseCurrency.decimalPlaces}</p>
        </div>
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rounding</span>
          <p className="text-sm font-bold text-slate-800 mt-1">
            {ROUNDING_RULE_OPTIONS.find((o) => o.value === baseCurrency.roundingRule)?.label ?? baseCurrency.roundingRule}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-fetch Rate</span>
          <p className="text-sm font-bold text-slate-800 mt-1">
            {baseCurrency.autoFetchRate ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <div className="flex items-end justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectOpen(true)}
            className="border-brand-300 text-emerald-700 hover:bg-brand-100"
          >
            Change Base
          </Button>
        </div>
      </div>

      {selectOpen && (
        <Modal
          isOpen={selectOpen}
          onClose={() => setSelectOpen(false)}
          title="Change Base Currency"
          size="sm"
          footer={
            <ConfigModalFooter
              onCancel={() => setSelectOpen(false)}
              onSave={() => { onChangeBase(selectedId); setSelectOpen(false); }}
              isEdit={false}
              saving={saving}
              saveLabel="Set as Base"
            />
          }
        >
          <Select
            label="Select New Base Currency"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            options={currencies.filter((c) => c.id !== baseCurrency.id).map((c) => ({
              value: c.id!,
              label: `${c.code} — ${c.name}`,
            }))}
            placeholder="Choose currency"
          />
        </Modal>
      )}
    </div>
  );
};

/** Currency row in the currencies table. */
const CurrencyRow: React.FC<{
  currency: SystemCurrency;
  isBase: boolean;
  index: number;
  onEdit: (c: SystemCurrency) => void;
  onDelete: (id: string) => void;
  onSetBase: (id: string) => void;
}> = ({ currency, isBase, index, onEdit, onDelete, onSetBase }) => (
  <tr className={cn(
    "border-b border-slate-100",
    index % 2 === 0 ? 'bg-slate-50/40' : 'bg-white',
    "hover:bg-brand-50/60 transition-colors",
  )}>
    <td className="px-4 py-4 border-r border-slate-200/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isBase ? 'bg-brand-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
          {isBase ? <Star className="w-4 h-4 fill-emerald-500" /> : <DollarSign className="w-4 h-4" />}
        </div>
        <div>
          <span className="font-bold text-slate-900">{currency.code}</span>
          {isBase && (
            <span className="ml-2 text-[10px] font-black text-emerald-600 uppercase tracking-wider">Base</span>
          )}
        </div>
      </div>
    </td>
    <td className="px-4 py-4 border-r border-slate-200/50">
      <span className="text-sm text-slate-700">{currency.name}</span>
    </td>
    <td className="px-4 py-4 font-mono font-bold text-slate-900 border-r border-slate-200/50">{currency.symbol}</td>
    <td className="px-4 py-4 text-sm text-slate-700 border-r border-slate-200/50">{currency.decimalPlaces}</td>
    <td className="px-4 py-4 border-r border-slate-200/50">
      <span className="text-xs font-semibold text-slate-600">
        {ROUNDING_RULE_OPTIONS.find((o) => o.value === currency.roundingRule)?.label ?? currency.roundingRule}
      </span>
    </td>
    <td className="px-4 py-4 border-r border-slate-200/50">
      {currency.autoFetchRate ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
          <RefreshCw className="w-3 h-3" />
          Auto
        </span>
      ) : (
        <span className="text-xs text-slate-400">Manual</span>
      )}
    </td>
    <td className="px-4 py-4 border-r border-slate-200/50">
      {currency.isActive ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-emerald-700 text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3" />
          Active
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 text-[10px] font-bold">
          <XCircle className="w-3 h-3" />
          Inactive
        </span>
      )}
    </td>
    <td className="px-4 py-4">
      <div className="flex items-center justify-end gap-1">
        {!isBase && (
          <button
            onClick={() => onSetBase(currency.id!)}
            className="p-2 hover:bg-amber-50 rounded-lg text-amber-600 transition-colors"
            title="Set as Base"
          >
            <Star className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onEdit(currency)}
          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
        {!isBase && (
          <button
            onClick={() => onDelete(currency.id!)}
            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </td>
  </tr>
);

// ─── Main component ──────────────────────────────────────────────

/**
 * CurrencyConfiguration component — redesigned with 3 sections:
 * 1. Base Currency Card (prominent)
 * 2. Currencies List (table with CRUD + set-base)
 * 3. Currency Rate Table (enhanced with source/overrideReason)
 */
export const CurrencyConfiguration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: currencies, loading: currLoading, saving: currSaving } = useAppSelector((s) => s.configuration.currencies);
  const { data: rates, loading: rateLoading, saving: rateSaving, error: rateError } = useAppSelector((s) => s.configuration.currencyRates);

  // ── Currency CRUD state ──────────────────────────────────────
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [editCurrencyId, setEditCurrencyId] = useState<string | null>(null);
  const [currencyForm, setCurrencyForm] = useState(emptyCurrencyForm);
  const [currencyFormError, setCurrencyFormError] = useState('');

  // ── Currency rate modal state ────────────────────────────────
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [editRateId, setEditRateId] = useState<string | null>(null);
  const [rateForm, setRateForm] = useState({ fromCurrencyId: '', toCurrencyId: '', rate: '', source: 'MANUAL', overrideReason: '', effectiveDate: '' });
  const [rateFormError, setRateFormError] = useState('');

  const baseCurrency = Array.isArray(currencies) ? currencies.find((c) => c.isBase) : undefined;
  const otherCurrencies = Array.isArray(currencies) ? currencies.filter((c) => !c.isBase) : [];
  const currencyOptions = (Array.isArray(currencies) ? currencies : []).map((c) => ({
    value: c.id!,
    label: `${c.code} (${c.name})`,
  }));

  // ── Currency CRUD handlers ───────────────────────────────────

  const openAddCurrency = useCallback(() => {
    setEditCurrencyId(null);
    setCurrencyForm(emptyCurrencyForm);
    setCurrencyFormError('');
    setCurrencyModalOpen(true);
  }, []);

  const openEditCurrency = useCallback((c: SystemCurrency) => {
    setEditCurrencyId(c.id || null);
    setCurrencyForm({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      decimalPlaces: String(c.decimalPlaces),
      roundingRule: c.roundingRule,
      isBase: c.isBase,
      isActive: c.isActive,
      autoFetchRate: c.autoFetchRate,
    });
    setCurrencyFormError('');
    setCurrencyModalOpen(true);
  }, []);

  const handleDeleteCurrency = useCallback((id: string) => {
    dispatch(configurationActions.deleteCurrencyRequest(id));
  }, [dispatch]);

  const handleSetBaseCurrency = useCallback((id: string) => {
    dispatch(configurationActions.setBaseCurrencyRequest(id));
  }, [dispatch]);

  const handleSaveCurrency = useCallback(() => {
    if (!currencyForm.code.trim() || !currencyForm.name.trim() || !currencyForm.symbol.trim()) {
      setCurrencyFormError('Code, name, and symbol are required');
      return;
    }
    setCurrencyFormError('');

    const payload: any = {
      code: currencyForm.code.trim().toUpperCase(),
      name: currencyForm.name.trim(),
      symbol: currencyForm.symbol.trim(),
      decimalPlaces: Number(currencyForm.decimalPlaces),
      roundingRule: currencyForm.roundingRule,
      isActive: currencyForm.isActive,
      autoFetchRate: currencyForm.autoFetchRate,
    };

    if (editCurrencyId) {
      dispatch(configurationActions.updateCurrencyRequest({ id: editCurrencyId, data: payload }));
    } else {
      dispatch(configurationActions.createCurrencyRequest(payload));
    }
    setCurrencyModalOpen(false);
  }, [currencyForm, editCurrencyId, dispatch]);

  // ── Rate CRUD handlers ───────────────────────────────────────

  const openAddRate = useCallback(() => {
    setEditRateId(null);
    setRateForm({ fromCurrencyId: '', toCurrencyId: '', rate: '', source: 'MANUAL', overrideReason: '', effectiveDate: '' });
    setRateFormError('');
    setRateModalOpen(true);
  }, []);

  const openEditRate = useCallback((rate: any) => {
    setEditRateId(rate.id || null);
    setRateForm({
      fromCurrencyId: rate.fromCurrencyId,
      toCurrencyId: rate.toCurrencyId,
      rate: String(Number(rate.rate)),
      source: rate.source || 'MANUAL',
      overrideReason: rate.overrideReason || '',
      effectiveDate: rate.effectiveDate?.slice(0, 10) || '',
    });
    setRateFormError('');
    setRateModalOpen(true);
  }, []);

  const handleDeleteRate = useCallback((id: string) => {
    dispatch(configurationActions.deleteCurrencyRateRequest(id));
  }, [dispatch]);

  const handleSaveRate = useCallback(() => {
    if (!rateForm.fromCurrencyId || !rateForm.toCurrencyId || !rateForm.rate || !rateForm.effectiveDate) {
      setRateFormError('All fields are required');
      return;
    }
    if (rateForm.fromCurrencyId === rateForm.toCurrencyId) {
      setRateFormError('From and To currencies must be different');
      return;
    }
    setRateFormError('');

    const payload: any = {
      fromCurrencyId: rateForm.fromCurrencyId,
      toCurrencyId: rateForm.toCurrencyId,
      rate: Number(rateForm.rate),
      source: rateForm.source,
      overrideReason: rateForm.overrideReason || null,
      effectiveDate: rateForm.effectiveDate,
    };

    if (editRateId) {
      dispatch(configurationActions.updateCurrencyRateRequest({ id: editRateId, data: payload }));
    } else {
      dispatch(configurationActions.createCurrencyRateRequest(payload));
    }
    setRateModalOpen(false);
  }, [rateForm, editRateId, dispatch]);

  const loading = currLoading || rateLoading;
  const saving = currSaving || rateSaving;

  return (
    <ConfigSection
      id="currency"
      title="Currency Configuration"
      description="Manage currencies and exchange rates for multi-currency payroll"
      showBadge={Array.isArray(currencies) && currencies.length > 0 && !loading}
      badgeText={`${Array.isArray(currencies) ? currencies.length : 0} Currency${Array.isArray(currencies) && currencies.length !== 1 ? 'ies' : ''}`}
    >
      <DataRenderer
        state={{ data: currencies, loading, error: null, isRefreshing: saving }}
        onRetry={() => dispatch(configurationActions.fetchCurrenciesRequest())}
        isEmpty={(data) => !data || (Array.isArray(data) && data.length === 0)}
        renderEmpty={
          <div className="flex flex-col items-center gap-6">
            <ConfigEmptyState
              icon={<DollarSign className="w-6 h-6" />}
              title="No Currencies Configured"
              message="Add at least one currency to enable multi-currency payroll. The first currency you add can be set as the base currency."
            />
            <Button onClick={openAddCurrency} variant="primary" className="rounded-full shadow shadow-brand-200/50">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Currency
            </Button>
          </div>
        }
        renderSuccess={() => (
          <div className="space-y-8">
            {/* ═══ Section 1: Base Currency Card ═══ */}
            <BaseCurrencyCard
              baseCurrency={baseCurrency}
              currencies={Array.isArray(currencies) ? currencies : []}
              onChangeBase={handleSetBaseCurrency}
              saving={saving}
            />

            {/* ═══ Section 2: Currencies Table ═══ */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">All Currencies</h4>
                  <p className="text-xs text-slate-500">Manage supported currencies and their display properties</p>
                </div>
                <Button onClick={openAddCurrency} variant="primary" size="sm" className="rounded-full">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Currency
                </Button>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4 border-r border-slate-200/50">Currency</th>
                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4 border-r border-slate-200/50">Name</th>
                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4 border-r border-slate-200/50">Symbol</th>
                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4 border-r border-slate-200/50">Decimals</th>
                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4 border-r border-slate-200/50">Rounding</th>
                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4 border-r border-slate-200/50">Rate</th>
                        <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4 border-r border-slate-200/50">Status</th>
                        <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baseCurrency && (
                        <CurrencyRow
                          currency={baseCurrency}
                          isBase={true}
                          index={0}
                          onEdit={openEditCurrency}
                          onDelete={handleDeleteCurrency}
                          onSetBase={handleSetBaseCurrency}
                        />
                      )}
                      {otherCurrencies.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-400">
                            No additional currencies configured.
                          </td>
                        </tr>
                      ) : (
                        otherCurrencies.map((c, idx) => (
                          <CurrencyRow
                            key={c.id}
                            currency={c}
                            isBase={false}
                            index={idx + 1}
                            onEdit={openEditCurrency}
                            onDelete={handleDeleteCurrency}
                            onSetBase={handleSetBaseCurrency}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ═══ Section 3: Currency Rates ═══ */}
            <div className="space-y-4">
              <CurrencyConfigurationView
                rates={Array.isArray(rates) ? rates : []}
                saving={rateSaving}
                onEdit={openEditRate}
                onDelete={handleDeleteRate}
                onAdd={openAddRate}
              />
            </div>

            {/* ═══ Currency Modal ═══ */}
            <Modal
              isOpen={currencyModalOpen}
              onClose={() => setCurrencyModalOpen(false)}
              title={editCurrencyId ? 'Edit Currency' : 'Add Currency'}
              size="md"
              footer={
                <ConfigModalFooter
                  onCancel={() => setCurrencyModalOpen(false)}
                  onSave={handleSaveCurrency}
                  isEdit={!!editCurrencyId}
                  saving={currSaving}
                  saveLabel="Add Currency"
                  editLabel="Update Currency"
                />
              }
            >
              <div className="space-y-5 max-h-[60vh] overflow-y-auto px-1">
                {currencyFormError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 font-medium">
                    {currencyFormError}
                  </div>
                )}

                <FormSection icon={<Globe className="w-4 h-4" />} title="Basic Information">
                  <Input
                    label="Currency Code"
                    value={currencyForm.code}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value })}
                    placeholder="e.g. ETB, USD, EUR"
                    helperText="ISO currency code (3-10 chars)"
                    maxLength={10}
                  />
                  <Input
                    label="Currency Name"
                    value={currencyForm.name}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
                    placeholder="e.g. Ethiopian Birr"
                    maxLength={100}
                  />
                  <Input
                    label="Symbol"
                    value={currencyForm.symbol}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                    placeholder="e.g. Br, $, €"
                    maxLength={10}
                  />
                  <Input
                    label="Decimal Places"
                    type="number"
                    min={0}
                    max={10}
                    value={currencyForm.decimalPlaces}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, decimalPlaces: e.target.value })}
                    helperText="Number of decimal places (0-10)"
                  />
                </FormSection>

                <FormSection icon={<Info className="w-4 h-4" />} title="Configuration">
                  <Select
                    label="Rounding Rule"
                    value={currencyForm.roundingRule}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, roundingRule: e.target.value as RoundingRule })}
                    options={ROUNDING_RULE_OPTIONS}
                  />
                  <div className="flex items-center pt-2">
                    <Toggle
                      label="Auto-fetch Rate"
                      checked={currencyForm.autoFetchRate}
                      onChange={(v) => setCurrencyForm({ ...currencyForm, autoFetchRate: v })}
                      helperText="Auto-update exchange rates from external source"
                    />
                  </div>
                  <div className="flex items-center pt-2">
                    <Toggle
                      label="Active"
                      checked={currencyForm.isActive}
                      onChange={(v) => setCurrencyForm({ ...currencyForm, isActive: v })}
                      helperText="Enable this currency for use"
                    />
                  </div>
                </FormSection>
              </div>
            </Modal>

            {/* ═══ Rate Modal ═══ */}
            <Modal
              isOpen={rateModalOpen}
              onClose={() => setRateModalOpen(false)}
              title={editRateId ? 'Edit Currency Rate' : 'Add Currency Rate'}
              size="sm"
              footer={
                <ConfigModalFooter
                  onCancel={() => setRateModalOpen(false)}
                  onSave={handleSaveRate}
                  isEdit={!!editRateId}
                  saving={rateSaving}
                />
              }
            >
              <div className="space-y-4">
                {rateFormError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 font-medium">
                    {rateFormError}
                  </div>
                )}
                <Select
                  label="From Currency"
                  value={rateForm.fromCurrencyId}
                  onChange={(e) => setRateForm({ ...rateForm, fromCurrencyId: e.target.value })}
                  options={currencyOptions}
                  placeholder="Select currency"
                />
                <Select
                  label="To Currency"
                  value={rateForm.toCurrencyId}
                  onChange={(e) => setRateForm({ ...rateForm, toCurrencyId: e.target.value })}
                  options={currencyOptions}
                  placeholder="Select currency"
                />
                <Input
                  label="Rate"
                  type="number"
                  step="0.000001"
                  value={rateForm.rate}
                  onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
                  helperText="Exchange rate value"
                />
                <Select
                  label="Source"
                  value={rateForm.source}
                  onChange={(e) => setRateForm({ ...rateForm, source: e.target.value })}
                  options={RATE_SOURCE_OPTIONS}
                />
                {rateForm.source === 'MANUAL' && (
                  <Input
                    label="Override Reason"
                    value={rateForm.overrideReason}
                    onChange={(e) => setRateForm({ ...rateForm, overrideReason: e.target.value })}
                    placeholder="Reason for manual override"
                    helperText="Required for manual rate entries"
                  />
                )}
                <Input
                  label="Effective Date"
                  type="date"
                  value={rateForm.effectiveDate}
                  onChange={(e) => setRateForm({ ...rateForm, effectiveDate: e.target.value })}
                />
              </div>
            </Modal>
          </div>
        )}
      />
    </ConfigSection>
  );
};
