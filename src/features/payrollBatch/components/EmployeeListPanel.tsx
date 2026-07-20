import React, { useEffect, useState } from 'react';
import {
  X, Users, Search, ChevronLeft, ChevronRight, AlertCircle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { GlassCard, InitialAvatar } from '../../../components/ui';
import type { PayrollBatchEmployeeItem } from '../types';

interface EmployeeListPanelProps {
  employees: PayrollBatchEmployeeItem[];
  totalItems: number;
  totalPages: number;
  page: number;
  search: string;
  loading: boolean;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onClose: () => void;
}

export const EmployeeListPanel: React.FC<EmployeeListPanelProps> = ({
  employees,
  totalItems,
  totalPages,
  page,
  search,
  loading,
  onPageChange,
  onSearchChange,
  onClose,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation on mount
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleOverlayClick}
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 transition-all duration-300',
        visible ? 'bg-black/40 backdrop-blur-sm' : 'bg-transparent backdrop-blur-none',
      )}
    >
      <GlassCard
        padding="none"
        className={cn(
          'relative w-full max-w-2xl mx-4 overflow-hidden max-h-[80vh] flex flex-col transition-all duration-300',
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-[0.97]',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 bg-white/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-sm">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Employees</h2>
            <span className="text-xs font-medium text-slate-400 bg-white/60 px-2 py-0.5 rounded-md border border-slate-200">
              {totalItems}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/60 active:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-200/60 bg-white/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name or code…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/60 backdrop-blur-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-shadow hover:shadow-sm"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100/60 rounded-lg animate-pulse flex items-center gap-3 px-4">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-600">No employees found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm z-10">
                <tr>
                  <th className="border-r border-slate-200/50 text-left px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Code</th>
                  <th className="border-r border-slate-200/50 text-left px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="border-r border-slate-200/50 text-left px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Position</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-b border-slate-100 transition-colors',
                      idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white',
                      'hover:bg-brand-50/60',
                    )}
                  >
                    <td className="border-r border-slate-200/50 px-5 py-3">
                      <span className="text-sm font-mono text-slate-500 bg-white/40 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-200/60">
                        {item.employee.externalId}
                      </span>
                    </td>
                    <td className="border-r border-slate-200/50 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <InitialAvatar
                          firstName={item.employee.firstName ?? '?'}
                          lastName={item.employee.lastName ?? ''}
                          size="sm"
                        />
                        <span className="text-sm font-semibold text-slate-900">
                          {item.employee.firstName} {item.employee.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="border-r border-slate-200/50 px-5 py-3 text-sm text-slate-500">
                      {item.employee.department?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {item.employee.position?.title ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Numbered pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200/60 bg-white/30">
            <p className="text-xs text-slate-400">
              Showing {employees.length} of {totalItems}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-slate-300 text-xs">…</span>
                    )}
                    <button
                      onClick={() => onPageChange(p)}
                      className={cn(
                        'min-w-[30px] h-7 rounded-md text-xs font-bold transition-all cursor-pointer',
                        p === page
                          ? 'bg-emerald-500 text-white shadow-sm shadow-brand-500/20'
                          : 'text-slate-500 hover:bg-white/60 hover:border-slate-200 border border-transparent',
                      )}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}

              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
