import React from 'react';
import { Pencil, Trash2, Percent, Banknote, Shield, Lock, Save, Plus } from 'lucide-react';
import { Pagination } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { ConfigSaveButton } from './shared/ConfigSaveButton';
import type { DeductionConfig, DeductionType } from '../types/configuration.types';

interface DeductionsViewProps {
  deductions: DeductionConfig[];
  paginatedDeductions: DeductionConfig[];
  displayPage: number;
  totalPages: number;
  pageSize: number;
  saving: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onOpenEdit: (paginatedIndex: number) => void;
  onRemove: (paginatedIndex: number) => void;
  onSave: () => void;
  capCard?: React.ReactNode;
}

/** Map of deduction types to their icon/color metadata for display. */
const ICON_MAP: Record<string, { bg: string; text: string; icon: string }> = {
  EMPLOYMENT_INCOME_TAX: { bg: 'bg-rose-50', text: 'text-rose-600', icon: 'tax' },
  PENSION_EMPLOYEE: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'pension' },
  COST_SHARING: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'cost' },
  LOAN_REPAYMENT: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'loan' },
  ADVANCE_RECOVERY: { bg: 'bg-cyan-50', text: 'text-cyan-600', icon: 'advance' },
  UNPAID_LEAVE: { bg: 'bg-slate-50', text: 'text-slate-600', icon: 'leave' },
  LATENESS: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'late' },
  COURT_ORDER: { bg: 'bg-violet-50', text: 'text-violet-600', icon: 'court' },
  UNION_DUES: { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'union' },
  OTHER: { bg: 'bg-slate-50', text: 'text-slate-500', icon: 'other' },
};

const deductionTypeLabels: Record<string, string> = {
  EMPLOYMENT_INCOME_TAX: 'Income Tax',
  PENSION_EMPLOYEE: 'Pension',
  COST_SHARING: 'Cost Sharing',
  LOAN_REPAYMENT: 'Loan',
  ADVANCE_RECOVERY: 'Advance',
  UNPAID_LEAVE: 'Unpaid Leave',
  LATENESS: 'Lateness',
  COURT_ORDER: 'Court Order',
  UNION_DUES: 'Union Dues',
  OTHER: 'Other',
};

/**
 * Formats a deduction type key into a human-readable label.
 *
 * @param type - The deduction type string (e.g., "EMPLOYMENT_INCOME_TAX").
 * @returns The formatted label (e.g., "Income Tax").
 */
const formatDeductionType = (type?: string): string => {
  return deductionTypeLabels[type || ''] || type || 'Other';
};

/**
 * DeductionsView component displaying deduction configurations in a table with pagination.
 * Shows name, category, value, statutory/mandatory tags, and edit/remove actions.
 */
export const DeductionsView: React.FC<DeductionsViewProps> = ({
  deductions,
  paginatedDeductions,
  displayPage,
  totalPages,
  pageSize,
  saving,
  onPageChange,
  onPageSizeChange,
  onOpenEdit,
  onRemove,
  onSave,
  capCard,
}) => (
  <div className="space-y-6">
    {/* Table */}
    <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200/50">Name</th>
              <th className="text-left px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200/50">Category</th>
              <th className="text-left px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200/50">Value</th>
              <th className="text-left px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200/50">Tags</th>
              <th className="text-right px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDeductions.map((deduction, i) => {
              const meta = ICON_MAP[deduction.deductionType || 'OTHER'] || ICON_MAP.OTHER;
              return (
                <tr key={`ded-${(displayPage - 1) * pageSize + i}`} className={cn(
                  "border-b border-slate-100",
                  i % 2 === 0 ? 'bg-slate-50/40' : 'bg-white',
                  "hover:bg-brand-50/60 transition-all group",
                )}>
                  <td className="px-8 py-5 border-r border-slate-200/50">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center ${meta.text} shrink-0 border border-slate-100/50`}>
                        <Banknote className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900">{deduction.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 border-r border-slate-200/50">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-slate-50 text-slate-600 border border-slate-200/50 tracking-tight">
                      <Percent className="w-3 h-3" />
                      {formatDeductionType(deduction.deductionType)}
                    </span>
                  </td>
                  <td className="px-6 py-5 border-r border-slate-200/50">
                    {deduction.amount != null || deduction.percent != null ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/50 tracking-tight">
                        {deduction.calculationType === 'FIXED_AMOUNT' ? (
                          <>Fixed Amount {deduction.calculationBasis ? `(${deduction.calculationBasis === 'BASIC' ? 'Basic' : 'Gross'})` : ''}</>
                        ) : deduction.calculationType === 'PERCENTAGE_OF_BASIC' ? (
                          <>% of Basic</>
                        ) : deduction.calculationType === 'PERCENTAGE_OF_GROSS' ? (
                          <>% of Gross</>
                        ) : (
                          <>{deduction.calculationType}</>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200/50 tracking-tight">
                        Per-Employee {deduction.calculationType === 'FIXED_AMOUNT'
                          ? `(${deduction.calculationBasis === 'GROSS' ? 'Gross' : 'Basic'})`
                          : deduction.calculationType === 'PERCENTAGE_OF_BASIC'
                            ? '(% of Basic)'
                            : deduction.calculationType === 'PERCENTAGE_OF_GROSS'
                              ? '(% of Gross)'
                              : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 border-r border-slate-200/50">
                    <div className="flex items-center gap-2">
                      {deduction.isStatutory && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                          <Shield className="w-3 h-3" />
                          Statutory
                        </span>
                      )}
                      {deduction.isMandatory && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                          <Lock className="w-3 h-3" />
                          Mandatory
                        </span>
                      )}
                      {!deduction.isStatutory && !deduction.isMandatory && (
                        <span className="text-[10px] text-slate-400 font-medium italic">Custom</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      <button
                        onClick={() => onOpenEdit(i)}
                        className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-brand-50 rounded-xl transition-all active:scale-90"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemove(i)}
                        className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* Deduction Cap Rule Card */}
    {capCard && <div>{capCard}</div>}

    {/* Info Card */}
    <div className="bg-gradient-to-br from-brand-50 to-brand-100/30 border border-brand-200 rounded-[1.5rem] p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-emerald-600 shrink-0 border border-brand-200/50">
          <Banknote className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-800">Employee-Specific Amounts</p>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Deduction types defined here are templates. Use the{' '}
            <span className="font-bold text-emerald-700">Employee Deductions</span> section
            to assign specific amounts, percentages, and payment schedules to individual employees
            (e.g., <span className="font-medium">"Employee A has a loan of 100,000 ETB with 24 monthly installments"</span>).
          </p>
        </div>
      </div>
    </div>

    {/* Pagination + Save */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 sm:px-6 rounded-[1.5rem] shadow-sm">
      <Pagination
        currentPage={displayPage}
        totalPages={totalPages}
        totalItems={deductions.length}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
      />
      <ConfigSaveButton onClick={onSave} saving={saving} label="Save All Changes" />
    </div>
  </div>
);
