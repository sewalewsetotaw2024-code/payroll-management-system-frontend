import React, { useState } from 'react';
import {
  Calendar,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  Sun,
  Building2,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import type { PayFrequency } from '../types/configuration.types';

interface PayFrequencyViewProps {
  frequencies: PayFrequency[];
  saving: boolean;
  onEdit: (freq: PayFrequency) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  WEEKLY: 'Weekly',
  DAILY: 'Daily',
  HOURLY: 'Hourly',
};

const PAY_DAY_RULE_LABELS: Record<string, string> = {
  FIXED_DATE: 'Fixed Date',
  OFFSET_FROM_PERIOD_END: 'Offset from Period End',
};

const ROLLOVER_LABELS: Record<string, string> = {
  PAY_FRIDAY_BEFORE: 'Pay Friday Before',
  PAY_MONDAY_AFTER: 'Pay Monday After',
};

const DAILY_RATE_LABELS: Record<string, string> = {
  ANNUAL_SALARY_DIVIDED_BY_WORKING_DAYS: 'Annual ÷ Working Days',
  FIXED_DAILY_RATE: 'Fixed Daily Rate',
};

/**
 * PayFrequencyView component displaying pay frequencies in a table
 * with expandable detail rows and edit/delete actions.
 */
export const PayFrequencyView: React.FC<PayFrequencyViewProps> = ({
  frequencies,
  saving,
  onEdit,
  onDelete,
  onAdd,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={onAdd} variant="primary" size="sm" className="rounded-full">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Frequency
        </Button>
      </div>
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="w-10 px-2" />
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">
                  Name
                </th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">
                  Frequency
                </th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">
                  Periods / Year
                </th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">
                  Pay Day Rule
                </th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">
                  Employee Group
                </th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">
                  Status
                </th>
                <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {frequencies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">
                    No pay frequencies configured yet.
                  </td>
                </tr>
              ) : (
                frequencies.map((freq) => {
                  const isExpanded = expandedId === freq.id;
                  const isDaily = freq.frequency === 'DAILY';

                  return (
                    <React.Fragment key={freq.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-2 py-4">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : freq.id!)}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-slate-900">{freq.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50 text-slate-700 text-xs font-bold">
                            {FREQUENCY_LABELS[freq.frequency] || freq.frequency}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono font-bold text-slate-900">
                          {freq.periodsPerYear}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {freq.payDayRule ? (
                            <span className="text-xs font-semibold">
                              {PAY_DAY_RULE_LABELS[freq.payDayRule]}
                              {freq.payDayRule === 'FIXED_DATE' && freq.fixedPayDate
                                ? ` (${freq.fixedPayDate}th)`
                                : ''}
                              {freq.payDayRule === 'OFFSET_FROM_PERIOD_END' && freq.offsetDays
                                ? ` (${freq.offsetDays}d)`
                                : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {freq.applicableEmployeeGroup ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold">
                              <Users className="w-3 h-3" />
                              {freq.applicableEmployeeGroup}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {freq.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border border-slate-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onEdit(freq)}
                              className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDelete(freq.id!)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${freq.id}-detail`}>
                          <td colSpan={8} className="bg-slate-50/30 px-6 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              {/* Pay Day Details */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Pay Day Details
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Weekend:</span>
                                    <span className="font-semibold text-slate-800">
                                      {freq.weekendRollover
                                        ? ROLLOVER_LABELS[freq.weekendRollover]
                                        : '—'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Holiday:</span>
                                    <span className="font-semibold text-slate-800">
                                      {freq.holidayRollover
                                        ? ROLLOVER_LABELS[freq.holidayRollover]
                                        : '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Schedule */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                  <Clock className="w-3.5 h-3.5" />
                                  Schedule
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Auto-gen:</span>
                                    <span className="font-semibold text-slate-800">
                                      {freq.autoGeneratePeriods ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">OT eligible:</span>
                                    <span className="font-semibold text-slate-800">
                                      {freq.overtimeEligible ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Daily Pay */}
                              {isDaily && (
                                <div className="space-y-2 col-span-2">
                                  <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                    <Sun className="w-3.5 h-3.5" />
                                    Daily Pay Specifics
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Rate Basis:</span>
                                      <span className="font-semibold text-slate-800">
                                        {freq.dailyRateBasis
                                          ? DAILY_RATE_LABELS[freq.dailyRateBasis]
                                          : '—'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Working Days/Year:</span>
                                      <span className="font-semibold text-slate-800">
                                        {freq.workingDaysPerYear ?? '—'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Min Payable Days:</span>
                                      <span className="font-semibold text-slate-800">
                                        {freq.minimumPayableDays ?? '—'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">OT Eligible:</span>
                                      <span className="font-semibold text-slate-800">
                                        {freq.overtimeEligible ? 'Yes' : 'No'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {!isDaily && (
                                <div className="col-span-2" />
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
