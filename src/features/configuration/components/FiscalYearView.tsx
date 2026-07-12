import React from 'react';
import { Calendar, Pencil, Trash2, Save, Lock, Unlock, CheckCircle2, PlayCircle, XCircle } from 'lucide-react';
import { Pagination, Button } from '../../../components/ui';
import type { FiscalYear } from '../types/configuration.types';

interface FiscalYearViewProps {
  years: FiscalYear[];
  paginatedYears: FiscalYear[];
  displayPage: number;
  totalPages: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onOpenEdit: (fy: FiscalYear) => void;
  onRemove: (id: string) => void;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onSync: () => void;
}

/**
 * FiscalYearView component displaying fiscal years in a list with status badges.
 * Provides edit, delete, activate, and close actions per year entry.
 */
export const FiscalYearView: React.FC<FiscalYearViewProps> = ({
  years,
  paginatedYears,
  displayPage,
  totalPages,
  pageSize,
  loading,
  onPageChange,
  onPageSizeChange,
  onOpenEdit,
  onRemove,
  onActivate,
  onClose,
  onSync,
}) => {
  const activeYear = years.find((fy) => fy.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {activeYear && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-800">
              Active Fiscal Year: <span className="text-emerald-900">{activeYear.name}</span>
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {new Date(activeYear.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })} — {new Date(activeYear.endDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider shrink-0">
            <Unlock className="w-3.5 h-3.5" />
            Active
          </span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {paginatedYears.map((fy) => {
            const isActive = fy.status === 'ACTIVE';
            const isDraft = fy.status === 'DRAFT';
            return (
              <div
                key={fy.id}
                className={`flex items-center justify-between px-8 py-5 transition-all group ${
                  isActive ? 'bg-emerald-50/30 ring-1 ring-inset ring-emerald-200/50' : 'hover:bg-slate-50/30'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 tracking-tight">{fy.name}</h4>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <Unlock className="w-3 h-3" />
                          Active
                        </span>
                      ) : fy.status === 'DRAFT' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700 border border-yellow-200">
                          Draft
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                          <Lock className="w-3 h-3" />
                          Closed
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-400 mt-1">
                      {new Date(fy.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })} — {new Date(fy.endDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 shrink-0">
                  <button
                    onClick={() => onOpenEdit(fy)}
                    className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                    title={isActive ? 'Edit active fiscal year' : 'Edit fiscal year'}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {isDraft && (
                    <button
                      onClick={() => fy.id && onRemove(fy.id)}
                      className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete fiscal year"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isDraft && (
                    <button
                      onClick={() => fy.id && onActivate(fy.id)}
                      className="flex items-center gap-2 px-3 py-2 text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200 bg-emerald-50/50 rounded-xl transition-all"
                      title="Activate fiscal year"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-tight">Activate</span>
                    </button>
                  )}
                  {isActive && (
                    <button
                      onClick={() => fy.id && onClose(fy.id)}
                      className="flex items-center gap-2 px-3 py-2 text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-200 bg-amber-50/50 rounded-xl transition-all"
                      title="Close fiscal year"
                    >
                      <XCircle className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-tight">Close</span>
                    </button>
                  )}
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
          totalItems={years.length}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
        <Button onClick={onSync} disabled={loading} className="px-10 shadow shadow-emerald-200/50">
          <Save className="w-4 h-4 mr-2" /> Sync Configuration
        </Button>
      </div>
    </div>
  );
};