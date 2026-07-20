import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, Clock, Sun, Moon, CalendarDays, Building2, Settings2 } from 'lucide-react';
import { ConfigSaveButton } from './shared/ConfigSaveButton';
import { Input, Select, Toggle } from '../../../components/ui';
import type { OvertimeRule } from '../types/configuration.types';

const CATEGORY_META: Record<string, { label: string; desc: string; icon: React.ReactNode; color: string; accent: string }> = {
  WEEKDAY_DAY: { label: 'Weekday Day OT', desc: 'Regular weekday daytime overtime', icon: <Sun className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50', accent: 'border-l-amber-400' },
  WEEKDAY_NIGHT: { label: 'Weekday Night OT', desc: 'Nighttime overtime on weekdays', icon: <Moon className="w-4 h-4" />, color: 'text-indigo-600 bg-indigo-50', accent: 'border-l-indigo-400' },
  WEEKEND: { label: 'Weekend OT', desc: 'Overtime worked on weekends', icon: <CalendarDays className="w-4 h-4" />, color: 'text-emerald-600 bg-brand-50', accent: 'border-l-emerald-400' },
  PUBLIC_HOLIDAY: { label: 'Public Holiday OT', desc: 'Overtime on public holidays', icon: <Building2 className="w-4 h-4" />, color: 'text-rose-600 bg-rose-50', accent: 'border-l-rose-400' },
};

interface OvertimeViewProps {
  rules: OvertimeRule[];
  saving: boolean;
  onUpdateRate: (index: number, rate: number) => void;
  onSave: () => void;
  onUpdateGlobal: (field: string, value: any) => void;
}

/**
 * OvertimeView component displaying overtime rule cards with inline rate editing
 * and global settings section.
 */
export const OvertimeView: React.FC<OvertimeViewProps> = ({
  rules,
  saving,
  onUpdateRate,
  onSave,
  onUpdateGlobal,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<number>(1.5);
  const [editError, setEditError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (editingIndex !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingIndex]);

  const common = rules[0] || {};

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditValue(rules[index].rate);
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditError(null);
  };

  const confirmEdit = (index: number) => {
    if (editValue < 1 || editValue > 10) {
      setEditError('Rate must be 1–10');
      return;
    }
    if (editValue !== rules[index].rate) {
      onUpdateRate(index, editValue);
    }
    setEditingIndex(null);
    setEditError(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rules.map((rule, i) => {
          const meta = CATEGORY_META[rule.category] || {
            label: rule.category, desc: '', icon: <Clock className="w-4 h-4" />,
            color: 'text-slate-600 bg-slate-50', accent: 'border-l-slate-400',
          };
          const isEditing = editingIndex === i;

          return (
            <div
              key={rule.id || `rule-${i}`}
              className={`bg-white border rounded-xl shadow-sm transition-all ${
                isEditing
                  ? 'border-brand-300 shadow-md ring-1 ring-brand-200'
                  : 'border-slate-200 hover:shadow-md hover:border-slate-300'
              } ${meta.accent}`}
            >
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{meta.label}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <div className="relative">
                            <input
                              ref={inputRef}
                              type="number"
                              value={editValue}
                              onChange={(e) => {
                                setEditValue(Number(e.target.value));
                                if (editError) setEditError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmEdit(i);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              step="0.25"
                              min="1"
                              max="10"
                              className={`w-16 px-1.5 py-1 text-sm font-bold tabular-nums text-emerald-700 bg-brand-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 ${
                                editError ? 'border-rose-300 ring-1 ring-rose-200' : 'border-brand-300'
                              }`}
                              aria-label="Overtime multiplier"
                            />
                            {editError && (
                              <span className="absolute -bottom-4 left-0 text-[9px] text-rose-500 font-medium whitespace-nowrap">
                                {editError}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => confirmEdit(i)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-brand-50 rounded-lg transition-all"
                            aria-label="Save"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            aria-label="Cancel"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 text-emerald-700 font-bold tabular-nums text-sm leading-tight">
                            {rule.rate}<span className="text-[10px] ml-0.5 text-emerald-500">&times;</span>
                          </span>
                          <button
                            onClick={() => startEditing(i)}
                            className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-brand-50 rounded-lg transition-all"
                            aria-label={`Edit ${meta.label}`}
                            title={`Edit ${meta.label}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{meta.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Global OT Settings</h3>
            <p className="text-xs text-slate-500">These settings apply to all 4 overtime types</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Select
            label="Calculation Base"
            value={common.calculationBase ?? 'BASIC'}
            onChange={(e) => onUpdateGlobal('calculationBase', e.target.value)}
            options={[
              { value: 'BASIC', label: 'Basic Salary' },
              { value: 'GROSS', label: 'Gross Salary' },
            ]}
          />
          <Input
            label="Weekly Cap (hours)"
            type="number"
            step="0.5"
            value={common.weeklyCapHours ?? 12}
            onChange={(e) => onUpdateGlobal('weeklyCapHours', Number(e.target.value))}
            placeholder="e.g. 12"
          />
          <Input
            label="Monthly Cap (hours)"
            type="number"
            step="0.5"
            value={common.monthlyCapHours ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateGlobal('monthlyCapHours', val === '' ? null : Number(val));
            }}
            placeholder="No cap"
          />
          <div className="flex items-center h-full pt-6">
            <Toggle
              label="Is OT Taxable?"
              checked={common.isTaxable ?? true}
              onChange={(v) => onUpdateGlobal('isTaxable', v)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <ConfigSaveButton onClick={onSave} saving={saving} label="Save Overtime Configuration" />
      </div>
    </div>
  );
};
