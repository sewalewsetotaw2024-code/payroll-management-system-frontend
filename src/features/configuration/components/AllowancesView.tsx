import React from 'react';
import { Plus, Save, Pencil, Trash2, Tag, DollarSign, BadgePercent } from 'lucide-react';
import { Button, Pagination } from '../../../components/ui';
import { ConfigSaveButton } from './shared/ConfigSaveButton';
import type { AllowanceConfig } from '../types/configuration.types';

const EARNING_TYPE_OPTIONS = [
  { value: 'BASIC_SALARY', label: 'Basic Salary', category: 'Base Pay' },
  { value: 'RESPONSIBILITY_ALLOWANCE', label: 'Responsibility Allowance', category: 'Allowances' },
  { value: 'HOUSING_ALLOWANCE', label: 'Housing Allowance', category: 'Allowances' },
  { value: 'TELEPHONE_ALLOWANCE', label: 'Telephone Allowance', category: 'Allowances' },
  { value: 'MEAL_ALLOWANCE', label: 'Meal Allowance', category: 'Allowances' },
  { value: 'HARDSHIP_ALLOWANCE', label: 'Hardship Allowance', category: 'Allowances' },
  { value: 'ACTING_ALLOWANCE', label: 'Acting Allowance', category: 'Allowances' },
  { value: 'RELOCATION_ALLOWANCE', label: 'Relocation Allowance', category: 'Allowances' },
  { value: 'PD_ALLOWANCE', label: 'PD Allowance', category: 'Allowances' },
  { value: 'TRANSPORT_TAXABLE', label: 'Transport (Taxable)', category: 'Allowances' },
  { value: 'TRANSPORT_NON_TAXABLE', label: 'Transport (Non-Taxable)', category: 'Allowances' },
  { value: 'OVERTIME', label: 'Overtime', category: 'Variable' },
  { value: 'BONUS', label: 'Bonus', category: 'Variable' },
  { value: 'INCENTIVE', label: 'Incentive', category: 'Variable' },
  { value: 'GIFT', label: 'Gift', category: 'Variable' },
  { value: 'PROFIT_SHARING', label: 'Profit Sharing', category: 'Variable' },
  { value: 'OTHER', label: 'Other', category: 'Other' },
];

/**
 * Returns Tailwind CSS classes for the category badge color based on the earning category.
 *
 * @param category - The earning category string (e.g., "Base Pay", "Allowances").
 * @returns A string of Tailwind CSS classes for badge styling.
 */
const getCategoryBadgeColor = (category: string) => {
  switch (category) {
    case 'Base Pay':
      return 'bg-blue-50 text-blue-700 border-blue-100/50';
    case 'Allowances':
      return 'bg-brand-50 text-emerald-700 border-emerald-100/50';
    case 'Variable':
      return 'bg-amber-50 text-amber-700 border-amber-100/50';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-100/50';
  }
};

interface AllowancesViewProps {
  allowances: AllowanceConfig[];
  paginatedAllowances: AllowanceConfig[];
  displayPage: number;
  totalPages: number;
  pageSize: number;
  saving: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onOpenEdit: (paginatedIndex: number) => void;
  onRemove: (paginatedIndex: number) => void;
  onSave: () => void;
}

/**
 * AllowancesView component displaying allowance configurations in a list with pagination.
 * Each item shows earning type, category badge, taxability status, and edit/remove actions.
 */
export const AllowancesView: React.FC<AllowancesViewProps> = ({
  allowances,
  paginatedAllowances,
  displayPage,
  totalPages,
  pageSize,
  saving,
  onPageChange,
  onPageSizeChange,
  onOpenEdit,
  onRemove,
  onSave,
}) => (
  <div className="space-y-6">
    <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden">
      <div className="divide-y divide-slate-100">
        {paginatedAllowances.map((allowance, i) => {
          const typeInfo = EARNING_TYPE_OPTIONS.find((o) => o.value === allowance.earningType);
          const category = typeInfo?.category || 'Other';
          const typeLabel = typeInfo?.label || allowance.earningType;

          return (
            <div
              key={allowance.id || `pag-${(displayPage - 1) * pageSize + i}`}
              className="flex items-center justify-between px-8 py-5 hover:bg-slate-50/30 transition-all group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100/50">
                  {category === 'Base Pay' ? (
                    <DollarSign className="w-5 h-5" />
                  ) : category === 'Allowances' ? (
                    <Tag className="w-5 h-5" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{allowance.label}</p>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                    {typeLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getCategoryBadgeColor(category)}`}
                >
                  {category}
                </span>
                <span
                  className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${allowance.isTaxable ? 'bg-amber-50 text-amber-700 border-amber-100/50' : 'bg-brand-50 text-emerald-700 border-emerald-100/50'}`}
                >
                  {allowance.isTaxable ? 'Taxable' : 'Non-Taxable'}
                </span>
                {allowance.isExempt && (
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-purple-50 text-purple-700 border-purple-100/50 flex items-center gap-1">
                    <BadgePercent className="w-3 h-3" />
                    Exempt {allowance.exemptPercent != null ? `${allowance.exemptPercent}%` : ''}
                  </span>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                  <button
                    onClick={() => onOpenEdit(i)}
                    className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-brand-50 rounded-xl transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemove(i)}
                    className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-[24px]">
      <Pagination
        currentPage={displayPage}
        totalPages={totalPages}
        totalItems={allowances.length}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
      />
      <ConfigSaveButton onClick={onSave} saving={saving} label="Save Current State" />
    </div>
  </div>
);
