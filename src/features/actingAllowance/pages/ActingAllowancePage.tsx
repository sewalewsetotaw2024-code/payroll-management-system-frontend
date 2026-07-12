/**
 * Acting Allowance — Main Management Page
 * =========================================
 *
 * Two-tab interface for managing acting allowances:
 *
 *   **Assignments tab**   — List, create, edit, cancel acting assignments.
 *                           Includes a filter bar, stat row, pagination,
 *                           and a creation/edit modal with auto-filled
 *                           employee salary info and dual salary inputs.
 *
 *   **Configuration tab** — Create and edit acting allowance rules.
 *                           Supports two calculation methods:
 *                             AMOUNT       — fixed amount for all months
 *                             PERCENTAGE   — tiered percentage of salary diff
 *                           Includes a toggle switch, inline tier editing
 *                           (PERCENTAGE), fixed amount input (AMOUNT),
 *                           and a bar-chart visualisation.
 *
 * Key features:
 *   - AMOUNT/PERCENTAGE toggle per rule (mutually exclusive)
 *   - Employee selection auto-fills basic + gross salary in modal
 *   - Salary difference column in the assignments table
 *   - Rules use optimistic toggle for isActive state
 *   - Preview button triggers allowance calculation preview
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  UserPlus, TrendingUp, Calendar, CheckCircle2,
  Info, Edit2, Trash2, X, Plus, Save, Settings, ListTodo,
  Eye, AlertTriangle, ChevronLeft, ChevronRight, DollarSign,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { StatCardProps } from '../../../types/ui.types';
import { actingAllowanceApi } from '../api/actingAllowanceApi';
import { getEmployees } from '../../employees/api/employeeApi';
import type { ActingAssignment, ActingAllowanceRule, Tier, CreateAssignmentPayload } from '../types/actingAllowance.types';
import type { PayrollEmployee } from '../../employees/api/employeeApi';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-amber-100 text-amber-700',
};

const DEFAULT_TIERS: Tier[] = [
  { startMonth: 1, endMonth: 1, percent: 0 },
  { startMonth: 2, endMonth: 2, percent: 25 },
];

function currentMonthEnd(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().split('T')[0];
}

function isEndingThisMonth(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function formatCurrency(val: number) {
  return val.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

/* ────────────────────────────────────────────────────────── */
/*  Modal                                                      */
/* ────────────────────────────────────────────────────────── */
const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 rounded-t-3xl px-8 py-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  TierEditor — individual month + percent entries            */
/* ────────────────────────────────────────────────────────── */
const TierEditor: React.FC<{
  tiers: Tier[];
  onChange: (tiers: Tier[]) => void;
}> = ({ tiers, onChange }) => {
  const updateMonth = (index: number, month: number) => {
    onChange(tiers.map((t, i) => (i === index ? { ...t, startMonth: month, endMonth: month } : t)));
  };
  const updatePercent = (index: number, percent: number) => {
    onChange(tiers.map((t, i) => (i === index ? { ...t, percent } : t)));
  };
  const removeTier = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index));
  };
  const addTier = () => {
    const next = tiers.length > 0 ? Math.max(...tiers.map(t => t.endMonth)) + 1 : 1;
    const updated = [...tiers, { startMonth: next, endMonth: next, percent: 0 }];
    onChange(updated);
  };

  return (
    <div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Month</th>
            <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Percent</th>
            <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {tiers.map((tier, idx) => (
            <tr key={idx}>
              <td className="py-2 pr-2">
                <input type="number" min={1} value={tier.startMonth}
                  onChange={(e) => updateMonth(idx, Number(e.target.value))}
                  className="w-full max-w-[80px] px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
              </td>
              <td className="py-2 pr-2">
                <div className="flex items-center gap-1">
                  <input type="number" min={0} max={100} value={tier.percent}
                    onChange={(e) => updatePercent(idx, Number(e.target.value))}
                    className="w-full max-w-[80px] px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
                  <span className="text-slate-400 text-sm">%</span>
                </div>
              </td>
              <td className="py-2 text-right">
                <button type="button" onClick={() => removeTier(idx)}
                  className="cursor-pointer text-red-400 hover:text-red-600 transition-colors p-1" title="Remove month">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addTier}
        className="mt-3 flex items-center gap-1 text-xs font-bold text-[#047857] hover:text-[#036246] transition-colors cursor-pointer">
        <Plus className="w-3 h-3" /> Add Month
      </button>
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Pagination                                                  */
/* ────────────────────────────────────────────────────────── */
const Pagination: React.FC<{
  page: number; totalPages: number; total: number; from: number; to: number;
  onPageChange: (page: number) => void;
}> = ({ page, totalPages, total, from, to, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-8 py-4 border-t border-slate-100 bg-slate-50/30">
      <span className="text-xs text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className={cn('p-1.5 rounded-lg transition-colors cursor-pointer',
            page <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700')}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => onPageChange(p)}
            className={cn('w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer',
              p === page ? 'bg-[#047857] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700')}>
            {p}
          </button>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className={cn('p-1.5 rounded-lg transition-colors cursor-pointer',
            page >= totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700')}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  EmptyState                                                  */
/* ────────────────────────────────────────────────────────── */
const EmptyState: React.FC<{
  icon: React.ElementType; title: string; description: string;
  action?: { label: string; onClick: () => void };
}> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-slate-300" />
    </div>
    <h4 className="text-sm font-bold text-slate-500 mb-1">{title}</h4>
    <p className="text-xs text-slate-400 max-w-[280px] mb-5">{description}</p>
    {action && (
      <button onClick={action.onClick}
        className="cursor-pointer flex items-center gap-2 text-sm font-bold text-white bg-[#047857] px-5 py-2.5 rounded-xl hover:bg-[#036246] transition-colors shadow-lg shadow-emerald-900/10">
        <Plus className="w-4 h-4" /> {action.label}
      </button>
        )}
    </div>
  );

/* ────────────────────────────────────────────────────────── */
/*  TableSkeleton                                               */
/* ────────────────────────────────────────────────────────── */
const TableSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-3 p-8">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex gap-4">
        <div className="h-4 bg-slate-100 rounded w-1/4" />
        <div className="h-4 bg-slate-100 rounded w-1/6" />
        <div className="h-4 bg-slate-100 rounded w-1/6" />
        <div className="h-4 bg-slate-100 rounded w-1/6" />
        <div className="h-4 bg-slate-100 rounded w-12 ml-auto" />
      </div>
    ))}
  </div>
);

/* ────────────────────────────────────────────────────────── */
/*  ConfirmDialog                                               */
/* ────────────────────────────────────────────────────────── */
const ConfirmDialog: React.FC<{
  open: boolean; title: string; message: string;
  confirmLabel?: string; cancelLabel?: string; variant?: 'danger' | 'default';
  onConfirm: () => void; onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel }) => {
  useEffect(() => { if (open) document.body.style.overflow = 'hidden'; else document.body.style.overflow = ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 p-8 text-center">
        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5', variant === 'danger' ? 'bg-red-50' : 'bg-slate-50')}>
          <AlertTriangle className={cn('w-7 h-7', variant === 'danger' ? 'text-red-500' : 'text-slate-400')} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="cursor-pointer px-6 py-3 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">{cancelLabel}</button>
          <button onClick={onConfirm} className={cn('cursor-pointer px-6 py-3 text-sm font-bold text-white rounded-xl transition-colors shadow-lg', variant === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-900/10' : 'bg-[#047857] hover:bg-[#036246] shadow-emerald-900/10')}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  ToggleSwitch                                                */
/* ────────────────────────────────────────────────────────── */
const ToggleSwitch: React.FC<{
  enabled: boolean; onChange: () => void; label?: string;
}> = ({ enabled, onChange, label }) => (
  <button type="button" onClick={onChange}
    className={cn('cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30', enabled ? 'bg-emerald-500' : 'bg-slate-300')}>
    <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200', enabled ? 'translate-x-6' : 'translate-x-1')} />
    {label && <span className="ml-3 text-sm text-slate-600">{label}</span>}
  </button>
);

/* ────────────────────────────────────────────────────────── */
/*  MethodToggle — AMOUNT vs PERCENTAGE selector                */
/* ────────────────────────────────────────────────────────── */
const MethodToggle: React.FC<{
  value: 'AMOUNT' | 'PERCENTAGE';
  onChange: (v: 'AMOUNT' | 'PERCENTAGE') => void;
}> = ({ value, onChange }) => (
  <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
    {(['PERCENTAGE', 'AMOUNT'] as const).map((method) => (
      <button key={method} type="button" onClick={() => onChange(method)}
        className={cn('cursor-pointer px-4 py-2 rounded-lg text-sm font-bold transition-all',
          value === method ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
        {method === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
      </button>
    ))}
  </div>
);

/* ────────────────────────────────────────────────────────── */
/*  EmployeeSearch                                              */
/* ────────────────────────────────────────────────────────── */
const EmployeeSearch: React.FC<{
  value: string;
  onChange: (id: string, emp?: PayrollEmployee) => void;
  employees: PayrollEmployee[];
  disabled?: boolean;
}> = ({ value, onChange, employees, disabled }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const selected = useMemo(() => employees.find(e => e.id === value), [employees, value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return employees;
    const q = query.trim().toLowerCase();
    return employees.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q)
    );
  }, [employees, query]);

  const handleSelect = useCallback((id: string) => {
    const emp = employees.find(e => e.id === id);
    onChange(id, emp);
    setIsOpen(false);
    setQuery('');
  }, [onChange, employees]);

  return (
    <div className="relative">
      {selected && !isOpen ? (
        <div onClick={() => { if (!disabled) { setIsOpen(true); setQuery(''); } }}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold flex-shrink-0">
              {selected.firstName[0]}{selected.lastName[0]}
            </div>
            <div>
              <span className="text-sm font-medium text-slate-800">{selected.firstName} {selected.lastName}</span>
              <span className="text-xs text-slate-400 ml-2">({selected.id.slice(0, 8)}...)</span>
            </div>
          </div>
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      ) : (
        <input type="text" value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => { setIsOpen(true); if (!query) setQuery(''); }}
          placeholder={selected ? `${selected.firstName} ${selected.lastName}` : "Search employee by name or TIN..."}
          disabled={disabled}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm" />
      )}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No employees found matching &ldquo;{query}&rdquo;</div>
            ) : (
              filtered.map(emp => (
                <button key={emp.id} type="button" onClick={() => handleSelect(emp.id)}
                  className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-emerald-50 transition-colors text-sm',
                    emp.id === value ? 'bg-emerald-50 font-bold text-emerald-700' : 'text-slate-700')}>
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold flex-shrink-0">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{emp.firstName} {emp.lastName}</div>
                    <div className="text-[10px] text-slate-400 truncate">{emp.id.slice(0, 8)}{emp.departmentName ? ` · ${emp.departmentName}` : ''}</div>
                  </div>
                  {emp.id === value && (
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  PositionSearch — searchable position dropdown + manual     */
/* ────────────────────────────────────────────────────────── */
const PositionSearch: React.FC<{
  value: string;
  valueId: string | null;
  onChange: (id: string | null, title: string, basicSalary: number | null, grossSalary: number | null) => void;
  positions: { id: string; title: string; code: string | null; basicSalary: number | null; grossSalary: number | null; currency: string }[];
  disabled?: boolean;
  error?: boolean;
}> = ({ value, valueId, onChange, positions, disabled, error }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const selected = useMemo(() => positions.find(p => p.id === valueId), [positions, valueId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return positions;
    const q = query.trim().toLowerCase();
    return positions.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q))
    );
  }, [positions, query]);

  const handleSelect = useCallback((pos: typeof positions[0]) => {
    onChange(pos.id, pos.title, pos.basicSalary, pos.grossSalary);
    setIsOpen(false);
    setQuery('');
    setIsManual(false);
  }, [onChange]);

  const handleManualEntry = useCallback(() => {
    onChange(null, query.trim(), null, null);
    setIsOpen(false);
    setIsManual(true);
  }, [onChange, query]);

  const switchToSearch = useCallback(() => {
    setIsManual(false);
    setQuery('');
    setIsOpen(true);
  }, []);

  // Manual entry mode — plain text input
  if (isManual) {
    return (
      <div className="flex items-center gap-2">
        <input type="text" value={value}
          onChange={e => onChange(null, e.target.value, null, null)}
          placeholder="Type position title..."
          disabled={disabled}
          className={cn("flex-1 w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm",
            error && !valueId ? 'border-red-400 bg-red-50' : 'border-slate-200')} />
        <button type="button" onClick={switchToSearch}
          className="cursor-pointer px-3 py-3 text-xs font-bold text-sky-600 hover:text-sky-700 border border-sky-200 rounded-xl hover:bg-sky-50 transition-colors whitespace-nowrap">
          Browse
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {selected && !isOpen ? (
        <div onClick={() => { if (!disabled) { setIsOpen(true); setQuery(''); setIsManual(false); } }}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 text-xs font-bold flex-shrink-0">
              {selected.title[0]}
            </div>
            <div>
              <span className="text-sm font-medium text-slate-800">{selected.title}</span>
              {selected.code && <span className="text-xs text-slate-400 ml-2">({selected.code})</span>}
            </div>
          </div>
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      ) : (
        <input type="text" value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); setIsManual(false); }}
          onFocus={() => { setIsOpen(true); if (!query) setQuery(''); }}
          placeholder={selected ? selected.title : "Search or type a position title..."}
          disabled={disabled}
          className={cn("w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm",
            error && !valueId ? 'border-red-400 bg-red-50' : 'border-slate-200')} />
      )}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-4 text-sm text-slate-400 text-center">
                {query.trim() ? (
                  <button type="button" onClick={handleManualEntry}
                    className="cursor-pointer w-full text-left px-3 py-2.5 rounded-lg hover:bg-sky-50 text-sky-700 font-medium transition-colors">
                    Use &ldquo;{query.trim()}&rdquo; as custom position
                  </button>
                ) : (
                  <span className="px-4 py-8 block">No positions found. Type a custom position title.</span>
                )}
              </div>
            ) : (
              <>
                {filtered.map(pos => (
                  <button key={pos.id} type="button" onClick={() => handleSelect(pos)}
                    className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-sky-50 transition-colors text-sm',
                      pos.id === valueId ? 'bg-sky-50 font-bold text-sky-700' : 'text-slate-700')}>
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold flex-shrink-0">
                      {pos.title[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{pos.title}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {pos.code ?? ''}{pos.basicSalary ? ` · ${formatCurrency(pos.basicSalary)} ETB` : ''}
                      </div>
                    </div>
                    {pos.id === valueId && (
                      <svg className="w-4 h-4 text-sky-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>
                ))}
                {/* Always show manual entry option at bottom when there's a query */}
                {query.trim() && (
                  <button type="button" onClick={handleManualEntry}
                    className="cursor-pointer w-full text-left px-4 py-3 text-sm border-t border-slate-100 text-sky-700 font-medium hover:bg-sky-50 transition-colors">
                    Or use &ldquo;{query.trim()}&rdquo; as custom position
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  ActingAllowancePage — root                                  */
/* ────────────────────────────────────────────────────────── */
export const ActingAllowancePage: React.FC = () => {
  const [assignments, setAssignments] = useState<ActingAssignment[]>([]);
  const [rules, setRules] = useState<ActingAllowanceRule[]>([]);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assignments' | 'configuration'>('assignments');

  // ── Modal state ────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ActingAssignment | null>(null);

  // ── Form fields ────────────────────────────────────────────
  const [formEmployee, setFormEmployee] = useState('');
  const [formEmployeeData, setFormEmployeeData] = useState<PayrollEmployee | null>(null);
  const [formReplacedEmployee, setFormReplacedEmployee] = useState('');
  const [formReplacedEmployeeData, setFormReplacedEmployeeData] = useState<PayrollEmployee | null>(null);
  const [formPosition, setFormPosition] = useState('');
  const [formPositionId, setFormPositionId] = useState<string | null>(null);
  const [formRule, setFormRule] = useState('');
  const [formBasicSalary, setFormBasicSalary] = useState(0);
  const [formGrossSalary, setFormGrossSalary] = useState(0);
  const [formFixedAmount, setFormFixedAmount] = useState(0);
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formStatus, setFormStatus] = useState<string>('ACTIVE');
  const [positions, setPositions] = useState<{ id: string; title: string; code: string | null; basicSalary: number | null; grossSalary: number | null; currency: string }[]>([]);
  const [formPositionError, setFormPositionError] = useState(false);
  const [formReplacedEmployeeError, setFormReplacedEmployeeError] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Filter state ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Submit loading state ────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  // ── Preview state ──────────────────────────────────────────
  const [preview, setPreview] = useState<{ allowanceAmount: number; monthsElapsed: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Confirm dialog state ──────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string;
    variant?: 'danger' | 'default'; confirmLabel?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // ── Rule editing (config tab) ──────────────────────────────
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleTiers, setEditRuleTiers] = useState<Tier[]>([]);
  const [editRuleBasis, setEditRuleBasis] = useState<'BASIC_DIFF' | 'GROSS_DIFF'>('BASIC_DIFF');
  const [editRuleDate, setEditRuleDate] = useState('');

  // ── Create new rule (config tab) ──────────────────────────
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [showInactiveRules, setShowInactiveRules] = useState(false);
  const [newRuleMethod, setNewRuleMethod] = useState<'AMOUNT' | 'PERCENTAGE'>('PERCENTAGE');
  const [newRuleBasis, setNewRuleBasis] = useState<'BASIC_DIFF' | 'GROSS_DIFF'>('BASIC_DIFF');
  const [newRuleFixedAmount, setNewRuleFixedAmount] = useState(0);
  const [newRuleDate, setNewRuleDate] = useState(new Date().toISOString().split('T')[0]);
  const [newRuleTiers, setNewRuleTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [creatingRule, setCreatingRule] = useState(false);

  // ── Pagination ─────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // ── Data loading ───────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentsData, rulesData, empData, positionsData] = await Promise.all([
        actingAllowanceApi.listAssignments().catch((err) => { console.error('Failed to load assignments:', err); return []; }),
        actingAllowanceApi.listRules().catch((err) => { console.error('Failed to load rules:', err); return []; }),
        getEmployees({ limit: 200 }).catch((err) => { console.error('Failed to load employees:', err); return { data: [], pagination: null }; }),
        actingAllowanceApi.listPositions().catch((err) => { console.error('Failed to load positions:', err); return []; }),
      ]);
      setAssignments(assignmentsData);
      setRules(rulesData);
      setEmployees(empData.data);
      setPositions(positionsData);
    } catch (err) {
      console.error('Failed to load acting allowance data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setPage(1); }, [assignments.length]);

  // ── Employee salary map (for quick lookups) ──────────────
  const empSalaryMap = useMemo(() => {
    const map = new Map<string, { basicSalary: number | null; grossSalary: number | null }>();
    assignments.forEach(a => {
      if (a.employee?.compensation) {
        map.set(a.employeeId, {
          basicSalary: a.employee.compensation.basicSalary ?? null,
          grossSalary: a.employee.compensation.grossSalary ?? null,
        });
      }
    });
    return map;
  }, [assignments]);

  // ── Selected rule (derived from formRule) ─────────────────
  const selectedRule = useMemo(
    () => rules.find(r => r.id === formRule) ?? null,
    [rules, formRule],
  );

  // ── Stats ──────────────────────────────────────────────────
  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.status === 'ACTIVE').length,
    [assignments],
  );
  const totalEstimatedAllowance = useMemo(
    () => assignments
      .filter((a) => a.status === 'ACTIVE')
      .reduce((sum, a) => {
        const rule = a.actingAllowanceRule;
        if (!rule) return sum;

        if (rule.calculationMethod === 'AMOUNT') {
          return sum + (a.actingPositionSalary ?? 0);
        }

        // PERCENTAGE method logic
        const start = new Date(a.startDate);
        const now = new Date();
        const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        const monthsElapsed = Math.max(1, months + 1);

        // Regulation cap (6 months)
        if (monthsElapsed > 6 && !a.extensionApprovedBy) {
          return sum;
        }

        const sortedTiers = [...(rule.tiers || [])].sort((a, b) => a.startMonth - b.startMonth);
        const matchedTier = sortedTiers.reduceRight<Tier | null>(
          (found, t) => found ?? (monthsElapsed >= t.startMonth ? t : null),
          null,
        );

        const allowance = matchedTier
          ? (a.salaryDiff ?? 0) * (matchedTier.percent / 100)
          : 0;

        return sum + allowance;
      }, 0),
    [assignments],
  );
  const endingThisMonth = useMemo(
    () => assignments.filter((a) => isEndingThisMonth(a.expectedEndDate)).length,
    [assignments],
  );

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  // ── Filtered + paginated data ─────────────────────────────
  const filteredAssignments = useMemo(() => {
    let list = assignments;
    if (statusFilter !== 'ALL') list = list.filter(a => a.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(a => {
        const emp = empMap.get(a.employeeId);
        const name = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : '';
        return name.includes(q) || a.employeeId.toLowerCase().includes(q);
      });
    }
    if (dateFrom) list = list.filter(a => a.startDate >= dateFrom);
    if (dateTo) list = list.filter(a => a.startDate <= dateTo);
    return list;
  }, [assignments, statusFilter, searchQuery, dateFrom, dateTo, empMap]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedAssignments = filteredAssignments.slice(
    (safePage - 1) * rowsPerPage, safePage * rowsPerPage,
  );

  // ── Visible rules (filter out inactive by default) ─────────
  const visibleRules = useMemo(() => {
    if (showInactiveRules) return rules;
    return rules.filter(r => r.isActive);
  }, [rules, showInactiveRules]);

  // ── Form handlers ──────────────────────────────────────────
  const resetForm = useCallback(() => {
    setFormEmployee('');
    setFormEmployeeData(null);
    setFormReplacedEmployee('');
    setFormReplacedEmployeeData(null);
    setFormPosition('');
    setFormPositionId(null);
    setFormRule('');
    setFormBasicSalary(0);
    setFormGrossSalary(0);
    setFormFixedAmount(0);
    setFormStart('');
    setFormEnd('');
    setFormStatus('ACTIVE');
    setEditingAssignment(null);
    setPreview(null);
    setFormPositionError(false);
    setFormReplacedEmployeeError(false);
    setFormError('');
  }, []);

  const openCreateForm = useCallback(() => { resetForm(); setShowForm(true); }, [resetForm]);
  const closeForm = useCallback(() => { setShowForm(false); resetForm(); }, [resetForm]);

  const openEditForm = useCallback((assignment: ActingAssignment) => {
    setEditingAssignment(assignment);
    setFormEmployee(assignment.employeeId);
    const emp = empMap.get(assignment.employeeId) ?? null;
    setFormEmployeeData(emp);
    setFormReplacedEmployee(assignment.replacedEmployeeId ?? '');
    const replacedEmp = assignment.replacedEmployeeId ? employees.find(e => e.id === assignment.replacedEmployeeId) ?? null : null;
    setFormReplacedEmployeeData(replacedEmp);
    setFormPosition(assignment.actingPosition?.title ?? '');
    setFormPositionId(assignment.actingPositionId);
    setFormRule(assignment.actingAllowanceRuleId);
    // Both methods now use salary fields
    setFormBasicSalary(assignment.actingPositionBasicSalary ?? Number(assignment.actingPositionSalary));
    setFormGrossSalary(assignment.actingPositionGrossSalary ?? 0);
    setFormFixedAmount(0);
    setFormStart(assignment.startDate.split('T')[0]);
    setFormEnd(assignment.expectedEndDate?.split('T')[0] ?? '');
    setFormStatus(assignment.status);
    setShowForm(true);
  }, [empMap, rules, employees]);

  const handleEmployeeChange = useCallback((id: string, emp?: PayrollEmployee) => {
    setFormEmployee(id);
    setFormReplacedEmployeeError(false);
    if (emp) {
      setFormEmployeeData(emp);
      // Do NOT auto-fill salaries from acting employee — they're the baseline for diff
    }
    setPreview(null);
  }, []);

  const handleReplacedEmployeeChange = useCallback((id: string, emp?: PayrollEmployee) => {
    setFormReplacedEmployee(id);
    setFormReplacedEmployeeError(false);
    if (emp) {
      setFormReplacedEmployeeData(emp);
      // Auto-fill position salary from replaced employee's compensation
      if (emp.basicSalary && emp.basicSalary > 0) setFormBasicSalary(Number(emp.basicSalary));
      if (emp.grossSalary && emp.grossSalary > 0) setFormGrossSalary(Number(emp.grossSalary));
    }
    setPreview(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields with visual feedback
    let hasError = false;

    if (!formEmployee) {
      hasError = true;
    }
    if (!formReplacedEmployee) {
      setFormReplacedEmployeeError(true);
      hasError = true;
    }
    if (!formRule) {
      hasError = true;
    }
    if (!formStart) {
      hasError = true;
    }

    const isAmount = selectedRule?.calculationMethod === 'AMOUNT';
    const basis = selectedRule?.basis ?? 'BASIC_DIFF';
    if (!isAmount && formBasicSalary <= 0 && basis === 'BASIC_DIFF') {
      hasError = true;
    }
    if (!isAmount && formGrossSalary <= 0 && basis === 'GROSS_DIFF') {
      hasError = true;
    }
    if (isAmount && formBasicSalary <= 0 && formGrossSalary <= 0) {
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);
    const payload: CreateAssignmentPayload = {
      employeeId: formEmployee,
      replacedEmployeeId: formReplacedEmployee || undefined,
      actingAllowanceRuleId: formRule,
      startDate: formStart,
      expectedEndDate: formEnd || null,
    };

    // If a position was selected from the dropdown, send its ID
    // Otherwise, position is resolved from replaced employee on the backend
    if (formPositionId) {
      payload.actingPositionId = formPositionId;
    } else if (formPosition.trim()) {
      payload.actingPositionTitle = formPosition.trim();
    }

    // Both methods send salary fields — backend computes the allowance from the difference
    payload.actingPositionBasicSalary = formBasicSalary;
    payload.actingPositionGrossSalary = formGrossSalary > 0 ? formGrossSalary : null;
    if (selectedRule?.calculationMethod === 'AMOUNT') {
      // For AMOUNT, also send the computed fixed amount for reference
      payload.fixedAmount = selectedRule.basis === 'GROSS_DIFF'
        ? Math.max(0, formGrossSalary - Number(formEmployeeData?.grossSalary ?? 0))
        : Math.max(0, formBasicSalary - Number(formEmployeeData?.basicSalary ?? 0));
    }

    try {
      if (editingAssignment) {
        const updateData: any = {
          replacedEmployeeId: formReplacedEmployee || null,
          actingAllowanceRuleId: formRule,
          expectedEndDate: formEnd || null,
          status: formStatus,
        };
        if (formPositionId) {
          updateData.actingPositionId = formPositionId;
        }
        // Both methods send salary fields — backend computes the allowance from the difference
        updateData.actingPositionBasicSalary = formBasicSalary;
        updateData.actingPositionGrossSalary = formGrossSalary > 0 ? formGrossSalary : null;
        if (selectedRule?.calculationMethod === 'AMOUNT') {
          updateData.fixedAmount = selectedRule.basis === 'GROSS_DIFF'
            ? Math.max(0, formGrossSalary - Number(formEmployeeData?.grossSalary ?? 0))
            : Math.max(0, formBasicSalary - Number(formEmployeeData?.basicSalary ?? 0));
        }
        await actingAllowanceApi.updateAssignment(editingAssignment.id, updateData);
      } else {
        await actingAllowanceApi.createAssignment(payload);
      }
      closeForm();
      await loadData();
    } catch (err: any) {
      console.error('Failed to save assignment:', err);
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [formEmployee, formReplacedEmployee, formRule, formBasicSalary, formGrossSalary, formFixedAmount, formStart, formEnd, formStatus, formPositionId, formPosition, selectedRule, editingAssignment, closeForm, loadData]);

  const handleDelete = useCallback((id: string) => {
    setConfirmDialog({
      open: true, title: 'Cancel Assignment',
      message: 'This will set the assignment status to CANCELLED. The employee will no longer receive acting allowance for this assignment.',
      variant: 'danger', confirmLabel: 'Yes, Cancel Assignment',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try { await actingAllowanceApi.deleteAssignment(id); await loadData(); } catch (err) { console.error('Failed to delete assignment:', err); }
      },
    });
  }, [loadData]);

  const handlePreview = useCallback(async () => {
    if (!formEmployee || !formRule || !formStart) return;
    if (selectedRule?.calculationMethod === 'PERCENTAGE' && !formBasicSalary) return;
    if (selectedRule?.calculationMethod === 'AMOUNT' && formBasicSalary <= 0 && formGrossSalary <= 0) return;
    setPreviewLoading(true);
    try {
      const method = selectedRule?.calculationMethod ?? 'PERCENTAGE';
      const computedFixed = selectedRule?.basis === 'GROSS_DIFF'
        ? Math.max(0, formGrossSalary - Number(formEmployeeData?.grossSalary ?? 0))
        : Math.max(0, formBasicSalary - Number(formEmployeeData?.basicSalary ?? 0));
      const result = await actingAllowanceApi.previewAllowance({
        employeeId: formEmployee,
        replacedEmployeeId: formReplacedEmployee || undefined,
        actingAllowanceRuleId: formRule,
        calculationMethod: method,
        actingPositionBasicSalary: formBasicSalary,
        actingPositionGrossSalary: formGrossSalary > 0 ? formGrossSalary : null,
        fixedAmount: method === 'AMOUNT' ? computedFixed : null,
        startDate: formStart,
        payrollPeriodEndDate: formEnd || currentMonthEnd(),
      });
      setPreview(result);
    } catch { setPreview(null); } finally { setPreviewLoading(false); }
  }, [formEmployee, formReplacedEmployee, formRule, formBasicSalary, formGrossSalary, formStart, formEnd, selectedRule, formEmployeeData]);

  // ── Rule editing handlers ──────────────────────────────────
  const startEditRule = useCallback((rule: ActingAllowanceRule) => {
    setEditingRuleId(rule.id);
    setEditRuleTiers([...rule.tiers]);
    setEditRuleBasis(rule.basis);
    setEditRuleDate(rule.effectiveDate?.split('T')[0] ?? '');
  }, []);

  const cancelEditRule = useCallback(() => {
    setEditingRuleId(null);
    setEditRuleTiers([]);
    setEditRuleBasis('BASIC_DIFF');
    setEditRuleDate('');
  }, []);

  const saveRuleTiers = useCallback(async (ruleId: string) => {
    try {
      const rule = rules.find(r => r.id === ruleId);
      const isAmount = rule?.calculationMethod === 'AMOUNT';
      await actingAllowanceApi.updateRule(ruleId, {
        tiers: isAmount ? undefined : editRuleTiers,
        basis: editRuleBasis,
        effectiveDate: editRuleDate || undefined,
      });
      setEditingRuleId(null); setEditRuleTiers([]);
      setEditRuleBasis('BASIC_DIFF');
      setEditRuleDate('');
      await loadData();
    } catch (err) { console.error('Failed to update rule:', err); }
  }, [editRuleTiers, editRuleBasis, editRuleDate, rules, loadData]);

  const handleCreateRule = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleDate) return;
    if (newRuleMethod === 'PERCENTAGE' && newRuleTiers.length === 0) return;
    setCreatingRule(true);
    try {
      await actingAllowanceApi.createRule({
        calculationMethod: newRuleMethod,
        basis: newRuleBasis, // always send basis for both methods
        tiers: newRuleMethod === 'PERCENTAGE' ? newRuleTiers : undefined,
        effectiveDate: newRuleDate,
        fixedAmount: null, // amount is per-assignment now
      });
      setShowCreateRule(false);
      setNewRuleTiers(DEFAULT_TIERS);
      setNewRuleBasis('BASIC_DIFF');
      setNewRuleMethod('PERCENTAGE');
      setNewRuleFixedAmount(0);
      await loadData();
    } catch (err) { console.error('Failed to create rule:', err); } finally { setCreatingRule(false); }
  }, [newRuleMethod, newRuleBasis, newRuleDate, newRuleTiers, loadData]);

  const handleDeleteRule = useCallback((id: string) => {
    setConfirmDialog({
      open: true, title: 'Deactivate Rule',
      message: 'This will deactivate this allowance rule. Existing assignments using it will not be affected.',
      variant: 'danger', confirmLabel: 'Yes, Deactivate',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try { await actingAllowanceApi.deleteRule(id); await loadData(); } catch (err) { console.error('Failed to delete rule:', err); }
      },
    });
  }, [loadData]);

  const handleToggleRule = useCallback(async (rule: ActingAllowanceRule) => {
    const newActive = !rule.isActive;
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: newActive } : r));
    try { await actingAllowanceApi.updateRule(rule.id, { isActive: newActive }); } catch {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !newActive } : r));
    }
  }, []);

  const handleSaveRuleFixedAmount = useCallback(async (rule: ActingAllowanceRule) => {
    try {
      await actingAllowanceApi.updateRule(rule.id, { fixedAmount: rule.fixedAmount ?? null });
    } catch (err) { console.error('Failed to save rule:', err); }
  }, []);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-10">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Acting Allowance Management</h1>
          <p className="text-slate-500 text-sm">Manage temporary role assignments and allowances</p>
        </div>
        {activeTab === 'assignments' && (
          <button onClick={openCreateForm}
            className="btn-primary cursor-pointer flex items-center gap-2 bg-[#047857] text-white px-5 py-2.5 rounded-xl hover:bg-[#036246] transition-colors shadow-lg shadow-emerald-900/10 text-sm font-bold">
            <UserPlus className="w-4 h-4" /> Assign Acting Role
          </button>
        )}
      </div>

      {/* ── Stats Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Active Assignments" value={activeAssignments} icon={CheckCircle2} iconColor="text-emerald-500"
          description="Employees currently acting in a higher role" />
        <StatCard label="Total Estimated Allowance" value={formatCurrency(totalEstimatedAllowance)} icon={DollarSign} iconColor="text-emerald-500"
          description="Sum of monthly allowance for all active assignments" />
        <StatCard label="Ending This Month" value={endingThisMonth} icon={Calendar} iconColor="text-orange-500"
          description="Assignments scheduled to end this month" />
        <StatCard label="Active Rules" value={rules.filter(r => r.isActive).length} icon={Settings} iconColor="text-purple-500"
          description="Allowance rules currently available for new assignments" />
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit">
        <button onClick={() => setActiveTab('assignments')}
          className={cn('cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all',
            activeTab === 'assignments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
          <ListTodo className="w-4 h-4" /> Assignments
        </button>
        <button onClick={() => setActiveTab('configuration')}
          className={cn('cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all',
            activeTab === 'configuration' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
          <Settings className="w-4 h-4" /> Configuration
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ASSIGNMENTS TAB                                      */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === 'assignments' && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">
                  Acting Assignments
                  {filteredAssignments.length > 0 && (
                    <span className="font-normal text-slate-400 ml-2">
                      ({filteredAssignments.length}{filteredAssignments.length !== assignments.length ? ` of ${assignments.length}` : ''})
                    </span>
                  )}
                </h3>
              </div>
              {/* ── Filter Bar ──────────────────────────────────── */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input type="text" value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                    placeholder="Search employee name or TIN..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm bg-white" />
                </div>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all bg-white text-sm">
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="EXPIRED">Expired</option>
                </select>
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  placeholder="From" className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm" />
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  placeholder="To" className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm" />
                {(searchQuery || statusFilter !== 'ALL' || dateFrom || dateTo) && (
                  <button onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); setPage(1); }}
                    className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors whitespace-nowrap">Clear</button>
                )}
              </div>
            </div>

            {loading ? (
              <TableSkeleton />
            ) : assignments.length === 0 ? (
              <EmptyState icon={UserPlus} title="No Assignments Yet"
                description="Create your first acting role assignment to get started."
                action={{ label: 'Assign Acting Role', onClick: openCreateForm }} />
            ) : filteredAssignments.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <p className="font-bold text-slate-600 mb-1">No matching assignments</p>
                <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Position</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rule</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Start</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">End</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Salary Difference</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedAssignments.map((row) => {
                        const emp = empMap.get(row.employeeId);
                        const rule = row.actingAllowanceRule;
                        const isAmount = rule?.calculationMethod === 'AMOUNT';
                        
                        // For AMOUNT method, the actual fixed amount is in actingPositionSalary.
                        // For PERCENTAGE, salaryDiff = acting position salary - employee salary.
                        const displayAmount = isAmount
                          ? (row.actingPositionSalary ?? 0)
                          : (row.salaryDiff ?? 0);

                        const salaryLabel = isAmount
                          ? `Fixed: ${formatCurrency(displayAmount)}`
                          : formatCurrency(displayAmount);
                        const salaryColor = isAmount ? 'text-purple-600' : 'text-emerald-700';
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                                  {emp ? `${emp.firstName[0]}${emp.lastName[0]}` : '?'}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 text-sm">
                                    {emp ? `${emp.firstName} ${emp.lastName}` : row.employeeId}
                                  </div>
                                  {emp?.departmentName && <div className="text-[10px] text-slate-400">{emp.departmentName}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-emerald-600 font-medium text-sm whitespace-nowrap">{row.actingPosition?.title ?? '-'}</td>
                            <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">
                              {rule?.basis ?? '-'}
                              {isAmount && <span className="ml-1 text-purple-500">(Fixed)</span>}
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-xs font-mono text-center whitespace-nowrap">{row.startDate?.split('T')[0]}</td>
                            <td className="px-6 py-4 text-slate-500 text-xs font-mono text-center whitespace-nowrap">{row.expectedEndDate?.split('T')[0] ?? '-'}</td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <span className={cn('font-bold font-mono text-sm', salaryColor)}>{salaryLabel}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', statusColors[row.status] || 'bg-slate-100 text-slate-600')}>{row.status}</span>
                            </td>
                            <td className="px-8 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEditForm(row)}
                                  className="cursor-pointer p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit assignment">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                {row.status === 'ACTIVE' && (
                                  <button onClick={() => handleDelete(row.id)}
                                    className="cursor-pointer p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancel assignment">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination page={safePage} totalPages={totalPages} total={filteredAssignments.length}
                  from={(safePage - 1) * rowsPerPage + 1} to={Math.min(safePage * rowsPerPage, filteredAssignments.length)}
                  onPageChange={setPage} />
              </>
            )}
          </div>

          {/* ── Footer Info ───────────────────────────────────── */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm flex-shrink-0"><TrendingUp className="w-5 h-5" /></div>
            <div>
              <h4 className="font-bold text-emerald-900 text-sm">Automatic Calculation</h4>
              <p className="text-emerald-700 text-sm mt-1 leading-relaxed opacity-80">
                Acting allowance is automatically calculated based on the salary difference between the current and acting role. The allowance is included separately in the payslip.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* CONFIGURATION TAB                                    */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === 'configuration' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">
              Allowance Rules
              <span className="font-normal text-slate-400 ml-2">
                ({visibleRules.length}{visibleRules.length !== rules.length ? ` of ${rules.length}` : ''})
              </span>
            </h3>
            <div className="flex items-center gap-3">
              {/* Show inactive toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-slate-500 font-medium">Show inactive</span>
                <button type="button" onClick={() => setShowInactiveRules(v => !v)}
                  className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200',
                    showInactiveRules ? 'bg-slate-400' : 'bg-slate-200')}>
                  <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                    showInactiveRules ? 'translate-x-4.5' : 'translate-x-1')} />
                </button>
              </label>
              {!showCreateRule && (
              <button onClick={() => {
                setNewRuleTiers(DEFAULT_TIERS);
                setNewRuleBasis('BASIC_DIFF');
                setNewRuleMethod('PERCENTAGE');
                setNewRuleFixedAmount(0);
                setNewRuleDate(new Date().toISOString().split('T')[0]);
                setShowCreateRule(true);
              }}
                className="cursor-pointer flex items-center gap-2 text-sm font-bold text-white bg-[#047857] px-4 py-2 rounded-xl hover:bg-[#036246] transition-colors shadow-lg shadow-emerald-900/10">
                <Plus className="w-4 h-4" /> Create New Rule
              </button>
            )}
            </div>
          </div>

          {/* ── Create rule form ──────────────────────────────── */}
          {showCreateRule && (
            <div className="bg-white border border-emerald-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-emerald-100 bg-emerald-50/30 flex items-center justify-between">
                <h3 className="font-bold text-emerald-800">Create New Allowance Rule</h3>
                <button onClick={() => setShowCreateRule(false)} className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors p-1"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateRule} className="p-6 space-y-6">
                {/* Method Toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Calculation Method</label>
                  <MethodToggle value={newRuleMethod} onChange={setNewRuleMethod} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basis — shown for both methods now */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Basis</label>
                    <select value={newRuleBasis} onChange={(e) => setNewRuleBasis(e.target.value as 'BASIC_DIFF' | 'GROSS_DIFF')}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all bg-white text-slate-600 text-sm">
                      <option value="BASIC_DIFF">Basic Salary Difference</option>
                      <option value="GROSS_DIFF">Gross Salary Difference</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Effective Date</label>
                    <input type="date" value={newRuleDate} onChange={(e) => setNewRuleDate(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm" />
                  </div>
                </div>

                {/* Tiers (only for PERCENTAGE) */}
                {newRuleMethod === 'PERCENTAGE' && (
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700">Tier Brackets</label>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <TierEditor tiers={newRuleTiers} onChange={setNewRuleTiers} />
                    </div>
                  </div>
                )}

                {/* Info for AMOUNT: amount is set per-assignment */}
                {newRuleMethod === 'AMOUNT' && (
                  <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-sm text-sky-700">
                    Fixed amount is set <strong>per assignment</strong> — you'll enter the amount when creating an acting assignment.
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-2">
                  <button type="button" onClick={() => setShowCreateRule(false)}
                    className="cursor-pointer px-6 py-3 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={creatingRule || (newRuleMethod === 'PERCENTAGE' && newRuleTiers.length === 0)}
                    className="cursor-pointer px-6 py-3 text-sm font-bold text-white bg-[#047857] rounded-xl hover:bg-[#036246] transition-colors shadow-lg shadow-emerald-900/10 disabled:opacity-50 disabled:cursor-not-allowed">
                    {creatingRule ? 'Creating...' : 'Create Rule'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Rules list */}
          {rules.length === 0 && !showCreateRule ? (
            <EmptyState icon={Settings} title="No Rules Configured"
              description="Create your first acting allowance rule with either a fixed amount or tiered percentage brackets."
              action={{ label: 'Create Rule', onClick: () => { setNewRuleTiers(DEFAULT_TIERS); setNewRuleBasis('BASIC_DIFF'); setNewRuleMethod('PERCENTAGE'); setNewRuleFixedAmount(0); setNewRuleDate(new Date().toISOString().split('T')[0]); setShowCreateRule(true); }}} />
          ) : rules.length > 0 && visibleRules.length === 0 && !showCreateRule ? (
            <EmptyState icon={Settings} title="All Rules Hidden"
              description="All allowance rules are deactivated. Enable 'Show inactive' above to see them, or create a new rule." />
          ) : null}
          {rules.length > 0 && (visibleRules.length > 0 || showCreateRule) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visibleRules.map((rule) => {
                const isActive = rule.isActive;
                const isAmount = rule.calculationMethod === 'AMOUNT';
                const tiers = rule.tiers ?? [];

                return (
                  <div key={rule.id}
                    className={cn('group relative rounded-3xl overflow-hidden transition-all duration-300',
                      isActive ? 'bg-white shadow-lg shadow-emerald-900/5 hover:shadow-xl hover:shadow-emerald-900/10 border border-emerald-100/50'
                        : 'bg-white/60 shadow-sm border border-slate-200/60 hover:border-slate-300/60')}>
                    {/* Gradient accent bar */}
                    <div className={cn('h-1.5 w-full', isActive ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-slate-200 to-slate-300')} />

                    {/* Header */}
                    <div className="px-6 pt-5 pb-4 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-sm mt-0.5',
                          isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 mb-1">
                            <h3 className="font-bold text-slate-800 text-base">
                              {isAmount ? 'Fixed Amount' : rule.basis.replace('_', ' ')}
                            </h3>
                            <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide',
                              isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500')}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                              {isAmount ? 'Fixed' : '% Tiered'}
                            </span>
                            {!isAmount && tiers.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700">
                                {tiers.length} {tiers.length === 1 ? 'month' : 'months'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>Effective {rule.effectiveDate?.split('T')[0] ?? 'N/A'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>Updated {rule.updatedAt?.split('T')[0] ?? 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ToggleSwitch enabled={isActive} onChange={() => handleToggleRule(rule)} />
                        <div className="flex items-center gap-1 ml-1">
                          {editingRuleId === rule.id ? (
                            <>
                              <button onClick={() => saveRuleTiers(rule.id)}
                                className="cursor-pointer p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title={isAmount ? 'Save rule' : 'Save tiers'}><Save className="w-4 h-4" /></button>
                              <button onClick={cancelEditRule}
                                className="cursor-pointer p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors" title="Cancel edit"><X className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEditRule(rule)}
                                className="cursor-pointer p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title={isAmount ? 'Edit rule' : 'Edit tiers'}><Edit2 className="w-4 h-4" /></button>
                              {isActive && (
                                <button onClick={() => handleDeleteRule(rule.id)}
                                  className="cursor-pointer p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Deactivate rule"><Trash2 className="w-4 h-4" /></button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 pb-6">
                      {/* AMOUNT method — show basis, amount is per-assignment */}
                      {isAmount && editingRuleId === rule.id ? (
                        <div className="mt-2 p-5 bg-slate-50 rounded-2xl space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Basis</label>
                            <select value={editRuleBasis} onChange={(e) => setEditRuleBasis(e.target.value as 'BASIC_DIFF' | 'GROSS_DIFF')}
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all bg-white text-sm">
                              <option value="BASIC_DIFF">Basic Salary Difference</option>
                              <option value="GROSS_DIFF">Gross Salary Difference</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Effective Date</label>
                            <input type="date" value={editRuleDate} onChange={(e) => setEditRuleDate(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm" />
                          </div>
                        </div>
                      ) : isAmount ? (
                        <div className="mt-2 p-5 bg-slate-50 rounded-2xl">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Basis</p>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">Per-Assignment</span>
                          </div>
                          <p className="text-lg font-bold text-slate-800">
                            {rule.basis === 'GROSS_DIFF' ? 'Gross Salary Difference' : 'Basic Salary Difference'}
                          </p>
                          <p className="text-xs text-slate-400 mt-2">Amount is set when creating an acting assignment</p>
                        </div>
                      ) : editingRuleId === rule.id ? (
                        /* PERCENTAGE editing mode — tiers + basis + effective date */
                        <div className="mt-2 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Basis</label>
                              <select value={editRuleBasis} onChange={(e) => setEditRuleBasis(e.target.value as 'BASIC_DIFF' | 'GROSS_DIFF')}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all bg-white text-sm">
                                <option value="BASIC_DIFF">Basic Salary Difference</option>
                                <option value="GROSS_DIFF">Gross Salary Difference</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Effective Date</label>
                              <input type="date" value={editRuleDate} onChange={(e) => setEditRuleDate(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm" />
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-2xl p-4">
                            <TierEditor tiers={editRuleTiers} onChange={setEditRuleTiers} />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Month breakdown — shows every configured month */}
                          {tiers.length > 0 ? (
                            <div className="mt-3 divide-y divide-slate-100">
                              {tiers.map((tier, idx) => {
                                return (
                                  <div key={idx} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                      <span className={cn(
                                        'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                                        isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                      )}>
                                        M{tier.startMonth}
                                      </span>
                                      <span className="text-sm font-medium text-slate-700">Month {tier.startMonth}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className={cn(
                                        'text-sm font-bold',
                                        isActive ? 'text-emerald-700' : 'text-slate-500'
                                      )}>
                                        {tier.percent}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mt-3 p-5 bg-slate-50 rounded-2xl text-center">
                              <p className="text-xs text-slate-400">No months configured</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ASSIGNMENT FORM MODAL                                */}
      {/* ══════════════════════════════════════════════════════ */}
      <Modal open={showForm} onClose={closeForm}
        title={editingAssignment ? 'Edit Acting Assignment' : 'Create New Acting Assignment'}>
        <form onSubmit={handleSubmit} className="space-y-7">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT: Acting Employee (read-only salary baseline) */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Acting Employee</label>
              <EmployeeSearch value={formEmployee} onChange={handleEmployeeChange}
                employees={employees} disabled={!!editingAssignment} />
              {formEmployeeData && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Employee Current Salary (Baseline)</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[10px] text-slate-400">Basic</span>
                      <p className="font-bold text-slate-700">{formatCurrency(Number(formEmployeeData.basicSalary ?? 0))}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Gross</span>
                      <p className="font-bold text-slate-700">{formatCurrency(Number(formEmployeeData.grossSalary ?? 0))}</p>
                    </div>
                  </div>
                </div>
              )}
              {/* Allowance Rule */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Allowance Rule</label>
                <select value={formRule} onChange={(e) => { setFormRule(e.target.value); setPreview(null); }}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all bg-white text-slate-600 text-sm">
                  <option value="">Choose rule...</option>
                  {rules.filter(r => r.isActive).map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.calculationMethod === 'AMOUNT'
                        ? `Fixed Amount (${rule.basis})`
                        : `${rule.basis} (${(rule.tiers ?? []).length} tiers)`
                      }
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* RIGHT: Replaced Employee (auto-fills editable salary inputs) */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Replaced Employee</label>
              <EmployeeSearch value={formReplacedEmployee} onChange={handleReplacedEmployeeChange}
                employees={employees} />
              {formReplacedEmployeeError && (
                <p className="text-xs text-red-500 mt-1">Please select the employee being replaced</p>
              )}
              {formReplacedEmployeeData && (
                <div className="bg-white border border-sky-100 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Position Salary (auto-filled, editable)</h4>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">Basic Salary</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">ETB</span>
                      <input type="number" min={0} step={0.01} value={formBasicSalary || ''}
                        onChange={(e) => setFormBasicSalary(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">Gross Salary</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">ETB</span>
                      <input type="number" min={0} step={0.01} value={formGrossSalary || ''}
                        onChange={(e) => setFormGrossSalary(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Computed fixed amount (AMOUNT method only) */}
            {selectedRule?.calculationMethod === 'AMOUNT' && formEmployeeData && formReplacedEmployeeData && (formBasicSalary > 0 || formGrossSalary > 0) && (
              <div className="col-span-1 md:col-span-2 bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-3">Computed Fixed Amount</h4>
                <div className="text-sm">
                  <span className="text-indigo-600">
                    {selectedRule.basis === 'GROSS_DIFF' ? 'Gross' : 'Basic'} Difference:
                  </span>
                  <p className="text-lg font-black text-indigo-900 font-mono mt-1">
                    {formatCurrency(
                      selectedRule.basis === 'GROSS_DIFF'
                        ? Math.max(0, formGrossSalary - Number(formEmployeeData.grossSalary ?? 0))
                        : Math.max(0, formBasicSalary - Number(formEmployeeData.basicSalary ?? 0))
                    )}
                  </p>
                  <p className="text-[10px] text-indigo-500 mt-1">
                    {selectedRule.basis === 'GROSS_DIFF'
                      ? `Replaced ${formatCurrency(formGrossSalary)} − Acting ${formatCurrency(Number(formEmployeeData.grossSalary ?? 0))}`
                      : `Replaced ${formatCurrency(formBasicSalary)} − Acting ${formatCurrency(Number(formEmployeeData.basicSalary ?? 0))}`
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Salary Difference Display (PERCENTAGE method, basis-aware) */}
            {selectedRule && selectedRule.calculationMethod !== 'AMOUNT' && formEmployeeData && formReplacedEmployeeData && (
              (selectedRule?.basis === 'BASIC_DIFF' ? formBasicSalary > 0 : formGrossSalary > 0)
            ) && (
              <div className="col-span-1 md:col-span-2 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3">
                  {selectedRule?.basis === 'GROSS_DIFF' ? 'Gross Salary' : 'Basic Salary'} Difference
                </h4>
                {selectedRule?.basis === 'GROSS_DIFF' ? (
                  <div>
                    <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-1">Gross Salary</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-emerald-800">
                        {formatCurrency(Number(formEmployeeData.grossSalary ?? 0))}
                      </span>
                      <span className="text-xs text-emerald-500">&rarr;</span>
                      <span className="text-sm font-bold text-emerald-800">
                        {formatCurrency(formGrossSalary)}
                      </span>
                      <span className={cn(
                        'text-xs font-bold ml-1',
                        formGrossSalary > (formEmployeeData.grossSalary ?? 0)
                          ? 'text-emerald-600'
                          : formGrossSalary < (formEmployeeData.grossSalary ?? 0)
                            ? 'text-red-500'
                            : 'text-slate-400'
                      )}>
                        {formGrossSalary > (formEmployeeData.grossSalary ?? 0)
                          ? `(+${formatCurrency(formGrossSalary - (formEmployeeData.grossSalary ?? 0))})`
                          : formGrossSalary < (formEmployeeData.grossSalary ?? 0)
                            ? `(${formatCurrency(formGrossSalary - (formEmployeeData.grossSalary ?? 0))})`
                            : '(no change)'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-1">Basic Salary</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-emerald-800">
                        {formatCurrency(Number(formEmployeeData.basicSalary ?? 0))}
                      </span>
                      <span className="text-xs text-emerald-500">&rarr;</span>
                      <span className="text-sm font-bold text-emerald-800">
                        {formatCurrency(formBasicSalary)}
                      </span>
                      <span className={cn(
                        'text-xs font-bold ml-1',
                        formBasicSalary > (formEmployeeData.basicSalary ?? 0)
                          ? 'text-emerald-600'
                          : formBasicSalary < (formEmployeeData.basicSalary ?? 0)
                            ? 'text-red-500'
                            : 'text-slate-400'
                      )}>
                        {formBasicSalary > (formEmployeeData.basicSalary ?? 0)
                          ? `(+${formatCurrency(formBasicSalary - (formEmployeeData.basicSalary ?? 0))})`
                          : formBasicSalary < (formEmployeeData.basicSalary ?? 0)
                            ? `(${formatCurrency(formBasicSalary - (formEmployeeData.basicSalary ?? 0))})`
                            : '(no change)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Start Date</label>
              <input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm" />
            </div>

            {/* Expected End Date */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Expected End Date</label>
              <input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm" />
            </div>

            {/* Status (edit only) */}
            {editingAssignment && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all bg-white text-slate-600 text-sm">
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
            )}
          </div>

          {/* Preview */}
          {formEmployee && formRule && formStart && (selectedRule?.calculationMethod === 'AMOUNT' || formBasicSalary > 0) && (
            <div className="border-t border-slate-100 pt-5">
              <button type="button" onClick={handlePreview} disabled={previewLoading}
                className="cursor-pointer flex items-center gap-2 text-sm font-bold text-[#047857] hover:text-[#036246] transition-colors">
                <Eye className="w-4 h-4" /> {previewLoading ? 'Calculating...' : 'Preview Allowance'}
              </button>
              {preview && (
                <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-900">Estimated Allowance</span>
                  </div>
                  <p className="text-emerald-700 text-sm">
                    <span className="font-bold">{formatCurrency(preview.allowanceAmount)} ETB</span>
                    {' '}for month {preview.monthsElapsed}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-4 pt-2">
            <button type="button" onClick={closeForm}
              className="cursor-pointer px-8 py-3 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting}
              className="cursor-pointer px-8 py-3 text-sm font-bold text-white bg-[#047857] rounded-xl hover:bg-[#036246] transition-colors shadow-lg shadow-emerald-900/10 disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? 'Saving...' : editingAssignment ? 'Update Assignment' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Dialog ──────────────────────────────────── */}
      <ConfirmDialog open={confirmDialog.open} title={confirmDialog.title} message={confirmDialog.message}
        variant={confirmDialog.variant} confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  StatCard                                                   */
/* ────────────────────────────────────────────────────────── */
const StatCard: React.FC<StatCardProps & { description?: string }> = ({ label, value, icon: Icon, iconColor, subLabel, description }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm group hover:shadow-md transition-all">
    <div className="flex items-start justify-between mb-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
        <Icon className={cn('w-4 h-4', iconColor)} />
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <p className="text-3xl font-black text-slate-900">{value}</p>
      {subLabel && <span className="text-xs font-bold text-slate-400">{subLabel}</span>}
    </div>
    {description && <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{description}</p>}
  </div>
);
