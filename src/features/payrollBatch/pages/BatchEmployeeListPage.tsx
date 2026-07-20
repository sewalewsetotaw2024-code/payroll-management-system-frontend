import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Search, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { GlassCard, InitialAvatar, Skeleton } from '../../../components/ui';
import { useBatchEmployees } from '../hooks/useBatchEmployees';

export const BatchEmployeeListPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const {
    employees,
    totalItems,
    totalPages,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch,
  } = useBatchEmployees(batchId ?? null);

  const goBack = useCallback(() => {
    navigate('/payroll-batch');
  }, [navigate]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-20 px-4 md:px-5">
      {/* ── Page header ────────────────────────────────────────── */}
      <div>
        <button
          onClick={goBack}
          className="group flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-600 mb-4 transition-colors cursor-pointer font-bold uppercase tracking-widest"
        >
          <div className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center group-hover:border-brand-200 group-hover:bg-brand-50 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          Back to batches
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Batch Employees</h1>
              <p className="text-sm text-slate-400 font-medium">
                {totalItems} {totalItems === 1 ? 'employee' : 'employees'} in this batch
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Glass search bar ───────────────────────────────────── */}
      <GlassCard padding="sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or code…"
            className="w-full max-w-sm pl-9 pr-3 py-2.5 text-sm bg-white/60 backdrop-blur-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-shadow hover:shadow-sm"
          />
        </div>
      </GlassCard>

      {/* ── Employee Table ─────────────────────────────────────── */}
      <GlassCard padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-slate-100/60 rounded-lg animate-pulse flex items-center gap-4 px-4">
                <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 rounded w-1/4" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/6" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="p-3 bg-red-50 rounded-xl mb-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-sm font-bold text-red-600">Failed to load employees</p>
            <p className="text-xs text-slate-400 mt-1">{error.message}</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-base font-bold text-slate-700">
              {search ? 'No employees match your search' : 'No employees in this batch'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {search ? 'Try adjusting your search terms' : 'The batch may not have been generated yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/60 bg-white/30">
                    <th className="border-r border-slate-200/50 text-left px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Code</th>
                    <th className="border-r border-slate-200/50 text-left px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                    <th className="border-r border-slate-200/50 text-left px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</th>
                    <th className="text-left px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Position</th>
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
                      <td className="border-r border-slate-200/50 px-4 py-3.5">
                        <span className="text-sm font-mono text-slate-500 bg-white/40 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-200/60">
                          {item.employee.externalId}
                        </span>
                      </td>
                      <td className="border-r border-slate-200/50 px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <InitialAvatar
                            firstName={item.employee.firstName ?? '?'}
                            lastName={item.employee.lastName ?? ''}
                            size="sm"
                          />
                          <div>
                            <span className="text-sm font-semibold text-slate-900">
                              {item.employee.firstName} {item.employee.lastName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="border-r border-slate-200/50 px-4 py-3.5 text-sm text-slate-500">
                        {item.employee.department?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">
                        {item.employee.position?.title ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Numbered pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3.5 border-t border-slate-200/60 bg-white/30">
                <p className="text-xs text-slate-400">
                  Showing {employees.length} of {totalItems}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(page - 1)}
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
                          onClick={() => setPage(p)}
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
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>
    </div>
  );
};
