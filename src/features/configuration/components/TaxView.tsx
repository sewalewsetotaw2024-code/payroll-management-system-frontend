import { Pencil, Trash2, BadgePercent, Calculator } from 'lucide-react';
import { Pagination } from '../../../components/ui';
import { ConfigSaveButton } from './shared/ConfigSaveButton';
import { formatCurrency } from '../../../lib/utils';
import type { TaxBracket } from '../types/configuration.types';

interface TaxViewProps {
  brackets: TaxBracket[];
  paginatedBrackets: TaxBracket[];
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
 * TaxView component displaying tax brackets in a table with pagination.
 * Shows lower/upper bounds, tax rate, and deduction amount per bracket.
 */
export const TaxView: React.FC<TaxViewProps> = ({
  brackets,
  paginatedBrackets,
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
    {brackets.length === 0 ? (
      <div className="text-center py-12 text-slate-400 text-sm font-medium">
        No tax brackets to display
      </div>
    ) : (
      <>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="text-left px-4 sm:px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lower Bound</th>
                <th className="text-left px-4 sm:px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Upper Bound</th>
                <th className="text-left px-4 sm:px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Rate</th>
                <th className="text-left px-4 sm:px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deduction</th>
                <th className="text-right px-4 sm:px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedBrackets.map((bracket, i) => (
                <tr key={bracket.id || `new-${(displayPage - 1) * pageSize + i}`} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 sm:px-6 py-4">
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(bracket.lowerBound)}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className="text-sm text-slate-500 tabular-nums">{bracket.upperBound != null ? formatCurrency(bracket.upperBound) : '—'}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-black tabular-nums text-xs sm:text-sm leading-tight border border-emerald-100/50">
                      <BadgePercent className="w-3 h-3 text-emerald-500" />
                      {Number((bracket.rate * 100).toFixed(2))}%
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className="text-sm font-semibold text-slate-700 tabular-nums">{formatCurrency(bracket.deductionAmount)}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onOpenEdit(i)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                        aria-label="Edit bracket"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemove(i)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        aria-label="Delete bracket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
          <Pagination
            currentPage={displayPage}
            totalPages={totalPages}
            totalItems={brackets.length}
            onPageChange={onPageChange}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
          />
          <ConfigSaveButton onClick={onSave} saving={saving} label="Save Current State" />
        </div>
      </>
    )}
  </div>
);
