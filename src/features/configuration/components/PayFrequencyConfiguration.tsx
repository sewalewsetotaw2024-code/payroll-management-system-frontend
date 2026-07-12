import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';
import { Calendar, Sun, Users, Clock } from 'lucide-react';
import { Modal, Input, Select, Button, Toggle } from '../../../components/ui';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection, ConfigEmptyState, ConfigModalFooter } from './shared';
import { PayFrequencyView } from './PayFrequencyView';
import {
  PAY_FREQUENCY_OPTIONS,
  PAY_DAY_RULE_OPTIONS,
  WEEKEND_ROLLOVER_OPTIONS,
  DAILY_RATE_BASIS_OPTIONS,
  EMPLOYEE_GROUP_OPTIONS,
} from '../constants';
import type { PayFrequency, PayDayRule, WeekendRollover, DailyRateBasis } from '../types/configuration.types';

/** Empty form template for pay frequency creation. */
const emptyForm = {
  name: '',
  frequency: 'MONTHLY',
  periodsPerYear: '12',
  isActive: true,
  payDayRule: null as PayDayRule | null,
  fixedPayDate: null as number | null,
  offsetDays: null as number | null,
  weekendRollover: null as WeekendRollover | null,
  holidayRollover: null as WeekendRollover | null,
  applicableEmployeeGroup: null as string | null,
  autoGeneratePeriods: true,
  dailyRateBasis: null as DailyRateBasis | null,
  workingDaysPerYear: null as number | null,
  minimumPayableDays: null as number | null,
  overtimeEligible: true,
};

/** Maps frequency types to their default periods per year. */
const FREQUENCY_TO_PERIODS: Record<string, string> = {
  MONTHLY: '12',
  WEEKLY: '52',
  BI_WEEKLY: '26',
  DAILY: '260',
  HOURLY: '2080',
};

/** Default working days per year per frequency type. */
const DEFAULT_WORKING_DAYS: Record<string, string> = {
  MONTHLY: '260',
  WEEKLY: '260',
  DAILY: '260',
  HOURLY: '260',
};

/**
 * Frequency form section component for cleaner code organisation.
 */
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

/**
 * PayFrequencyConfiguration component for managing pay frequency configurations.
 * Supports add/edit/delete with an expanded modal form and table view.
 */
export const PayFrequencyConfiguration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: frequencies, loading, saving, error } = useAppSelector((s) => s.configuration.payFrequencies);

  const [localFrequencies, setLocalFrequencies] = useState<PayFrequency[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (Array.isArray(frequencies)) {
      setLocalFrequencies(frequencies);
    }
  }, [frequencies]);

  const openAdd = useCallback(() => {
    setEditId(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((freq: PayFrequency) => {
    setEditId(freq.id || null);
    setForm({
      name: freq.name,
      frequency: freq.frequency,
      periodsPerYear: String(freq.periodsPerYear),
      isActive: freq.isActive ?? true,
      payDayRule: freq.payDayRule ?? null,
      fixedPayDate: freq.fixedPayDate ?? null,
      offsetDays: freq.offsetDays ?? null,
      weekendRollover: freq.weekendRollover ?? null,
      holidayRollover: freq.holidayRollover ?? null,
      applicableEmployeeGroup: freq.applicableEmployeeGroup ?? null,
      autoGeneratePeriods: freq.autoGeneratePeriods ?? true,
      dailyRateBasis: freq.dailyRateBasis ?? null,
      workingDaysPerYear: freq.workingDaysPerYear ?? null,
      minimumPayableDays: freq.minimumPayableDays ?? null,
      overtimeEligible: freq.overtimeEligible ?? true,
    });
    setFormError('');
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    dispatch(configurationActions.deletePayFrequencyRequest(id));
  }, [dispatch]);

  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!form.periodsPerYear || Number(form.periodsPerYear) < 1) {
      setFormError('Periods per year must be at least 1');
      return;
    }
    setFormError('');

    const payload: any = {
      name: form.name.trim(),
      frequency: form.frequency,
      periodsPerYear: Number(form.periodsPerYear),
      isActive: form.isActive,
      payDayRule: form.payDayRule,
      fixedPayDate: form.payDayRule === 'FIXED_DATE' ? form.fixedPayDate : null,
      offsetDays: form.payDayRule === 'OFFSET_FROM_PERIOD_END' ? form.offsetDays : null,
      weekendRollover: form.weekendRollover,
      holidayRollover: form.holidayRollover,
      applicableEmployeeGroup: form.applicableEmployeeGroup,
      autoGeneratePeriods: form.autoGeneratePeriods,
      dailyRateBasis: form.dailyRateBasis,
      workingDaysPerYear: form.workingDaysPerYear,
      minimumPayableDays: form.minimumPayableDays,
      overtimeEligible: form.overtimeEligible,
    };

    // Clean nulls — let backend handle defaults
    Object.keys(payload).forEach((k) => { if (payload[k] === null) delete payload[k]; });

    if (editId) {
      dispatch(configurationActions.updatePayFrequencyRequest({ id: editId, data: payload }));
    } else {
      dispatch(configurationActions.createPayFrequencyRequest(payload));
    }
    setModalOpen(false);
  }, [form, editId, dispatch]);

  // When frequency changes, auto-set sensible defaults
  const handleFrequencyChange = useCallback((val: string) => {
    const periods = FREQUENCY_TO_PERIODS[val] || form.periodsPerYear;
    const workingDays = DEFAULT_WORKING_DAYS[val] || form.workingDaysPerYear;
    setForm((prev) => ({
      ...prev,
      frequency: val,
      periodsPerYear: periods,
      workingDaysPerYear: workingDays ? Number(workingDays) : prev.workingDaysPerYear,
    }));
  }, [form.periodsPerYear, form.workingDaysPerYear]);

  const isDaily = form.frequency === 'DAILY';
  const isFixedDate = form.payDayRule === 'FIXED_DATE';
  const isOffset = form.payDayRule === 'OFFSET_FROM_PERIOD_END';

  const state = {
    data: localFrequencies,
    loading,
    error: error ? { status: 500, message: error } : null,
    isRefreshing: saving,
  };

  return (
    <ConfigSection
      id="pay-frequency"
      title="Pay Frequency Configuration"
      description="Define pay schedules, day rules, and daily-pay specifics for the organization"
      showBadge={localFrequencies.length > 0 && !loading}
      badgeText={`${localFrequencies.length} Frequency${localFrequencies.length !== 1 ? 'ies' : ''}`}
    >
      <DataRenderer
        state={state}
        onRetry={() => dispatch(configurationActions.fetchPayFrequenciesRequest({ page: 1, limit: 100 }))}
        isEmpty={(data) => !data || (Array.isArray(data) && data.length === 0)}
        renderEmpty={
          <ConfigEmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="No Pay Frequencies"
            message="Define pay schedules, day rules, and daily-pay specifics for the organization."
          />
        }
        renderSuccess={() => (
          <>
            <PayFrequencyView
              frequencies={localFrequencies}
              saving={saving}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAdd={openAdd}
            />

            <Modal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              title={editId ? 'Edit Pay Frequency' : 'Add Pay Frequency'}
              size="lg"
              footer={
                <ConfigModalFooter
                  onCancel={() => setModalOpen(false)}
                  onSave={handleSave}
                  isEdit={!!editId}
                  saving={saving}
                />
              }
            >
              <div className="space-y-7 max-h-[60vh] overflow-y-auto px-1">
                {formError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 font-medium">
                    {formError}
                  </div>
                )}

                {/* Section 1: Basic Info */}
                <FormSection icon={<Calendar className="w-4 h-4" />} title="Basic Information">
                  <div className="md:col-span-2">
                    <Input
                      label="Name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Monthly — Permanent Staff"
                      helperText="Display name for this frequency"
                    />
                  </div>
                  <Select
                    label="Frequency Type"
                    value={form.frequency}
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                    options={PAY_FREQUENCY_OPTIONS}
                  />
                  <Input
                    label="Periods per Year"
                    type="number"
                    value={form.periodsPerYear}
                    onChange={(e) => setForm({ ...form, periodsPerYear: e.target.value })}
                    helperText="Number of pay periods in a year"
                  />
                  <div className="flex items-center pt-2">
                    <Toggle
                      label="Active"
                      checked={form.isActive}
                      onChange={(v) => setForm({ ...form, isActive: v })}
                      helperText="Enable this frequency for use"
                    />
                  </div>
                </FormSection>

                {/* Section 2: Pay Day Rules */}
                <FormSection
                  icon={<Clock className="w-4 h-4" />}
                  title="Pay Day Rules"
                  description="How the pay day is determined for each period"
                >
                  <Select
                    label="Pay Day Rule"
                    value={form.payDayRule || ''}
                    onChange={(e) => setForm({
                      ...form,
                      payDayRule: (e.target.value || null) as PayDayRule | null,
                      fixedPayDate: null,
                      offsetDays: null,
                    })}
                    options={[{ value: '', label: 'Not configured' }, ...PAY_DAY_RULE_OPTIONS]}
                    placeholder="Select rule"
                  />
                  {isFixedDate && (
                    <Input
                      label="Fixed Pay Date"
                      type="number"
                      min={1}
                      max={31}
                      value={form.fixedPayDate ?? ''}
                      onChange={(e) => setForm({ ...form, fixedPayDate: e.target.value ? Number(e.target.value) : null })}
                      helperText="Day of month (1–31)"
                    />
                  )}
                  {isOffset && (
                    <Input
                      label="Offset Days"
                      type="number"
                      min={0}
                      value={form.offsetDays ?? ''}
                      onChange={(e) => setForm({ ...form, offsetDays: e.target.value ? Number(e.target.value) : null })}
                      helperText="Days after period closes"
                    />
                  )}
                  <Select
                    label="Weekend Rollover"
                    value={form.weekendRollover || ''}
                    onChange={(e) => setForm({ ...form, weekendRollover: (e.target.value || null) as WeekendRollover | null })}
                    options={[{ value: '', label: 'Not configured' }, ...WEEKEND_ROLLOVER_OPTIONS]}
                    placeholder="Select rollover"
                  />
                  <Select
                    label="Holiday Rollover"
                    value={form.holidayRollover || ''}
                    onChange={(e) => setForm({ ...form, holidayRollover: (e.target.value || null) as WeekendRollover | null })}
                    options={[{ value: '', label: 'Not configured' }, ...WEEKEND_ROLLOVER_OPTIONS]}
                    placeholder="Select rollover"
                  />
                </FormSection>

                {/* Section 3: Employee Group */}
                <FormSection
                  icon={<Users className="w-4 h-4" />}
                  title="Employee Assignment"
                  description="Which employee types use this frequency"
                >
                  <Select
                    label="Applicable Employee Group"
                    value={form.applicableEmployeeGroup || ''}
                    onChange={(e) => setForm({ ...form, applicableEmployeeGroup: e.target.value || null })}
                    options={[{ value: '', label: 'All employees' }, ...EMPLOYEE_GROUP_OPTIONS]}
                    placeholder="Select group"
                  />
                  <div className="flex items-center pt-2">
                    <Toggle
                      label="Auto-generate Periods"
                      checked={form.autoGeneratePeriods}
                      onChange={(v) => setForm({ ...form, autoGeneratePeriods: v })}
                      helperText="Auto-create all periods for the fiscal year"
                    />
                  </div>
                </FormSection>

                {/* Section 4: Daily Pay Specifics (shown only for Daily frequency) */}
                {isDaily && (
                  <FormSection
                    icon={<Sun className="w-4 h-4" />}
                    title="Daily Pay Specifics"
                    description="Additional configuration for daily-wage workers"
                  >
                    <Select
                      label="Daily Rate Basis"
                      value={form.dailyRateBasis || ''}
                      onChange={(e) => setForm({ ...form, dailyRateBasis: (e.target.value || null) as DailyRateBasis | null })}
                      options={[{ value: '', label: 'Not configured' }, ...DAILY_RATE_BASIS_OPTIONS]}
                      placeholder="Select basis"
                    />
                    <Input
                      label="Working Days per Year"
                      type="number"
                      value={form.workingDaysPerYear ?? ''}
                      onChange={(e) => setForm({ ...form, workingDaysPerYear: e.target.value ? Number(e.target.value) : null })}
                      helperText="e.g., 260 (used for annual ÷ days)"
                    />
                    <Input
                      label="Minimum Payable Days"
                      type="number"
                      min={0}
                      value={form.minimumPayableDays ?? ''}
                      onChange={(e) => setForm({ ...form, minimumPayableDays: e.target.value ? Number(e.target.value) : null })}
                      helperText="Minimum days worked to qualify for pay"
                    />
                    <div className="flex items-center pt-2">
                      <Toggle
                        label="Overtime Eligible"
                        checked={form.overtimeEligible}
                        onChange={(v) => setForm({ ...form, overtimeEligible: v })}
                        helperText="Whether daily-wage workers accrue OT"
                      />
                    </div>
                  </FormSection>
                )}
              </div>
            </Modal>
          </>
        )}
      />
    </ConfigSection>
  );
};
