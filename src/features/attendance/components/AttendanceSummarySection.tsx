import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Users,
  Clock,
  AlertCircle,
  Upload,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Skeleton, GlassCard, StatusBadge, InitialAvatar } from '../../../components/ui';
import { attendanceApi } from '../api/attendanceApi';
import { ProgressTracker, type ProgressStep } from '../../../components/ui/ProgressTracker';
import { toast } from '../../../components/ui/Toast';
import { AttendanceImportFlow } from '../../dataManagement/components/AttendanceImportFlow';
import { ImportTable } from './ImportTable';
import { folderApi } from '../../dataManagement/api/folderApi';
import { formatHourValue } from '../../../lib/parseBiometricWorkbook';
import type { AttendanceImport, AttendanceMonthlySummary, ImportDetail } from '../types/attendance.types';
import type { FolderTreeNode } from '../../dataManagement/types/folder.types';

interface AttendanceSummarySectionProps {
  importId?: string;
  periodId?: string | null;
}

export const AttendanceSummarySection: React.FC<AttendanceSummarySectionProps> = ({ importId, periodId }) => {
  const navigate = useNavigate();

  const [imports, setImports] = useState<AttendanceImport[]>([]);
  const [selectedImport, setSelectedImport] = useState<AttendanceImport | null>(null);
  const [importDetail, setImportDetail] = useState<ImportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importFlowOpen, setImportFlowOpen] = useState(false);
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const activeLoadRef = useRef(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = (await attendanceApi.listImports({ limit: 1000 })) ?? [];
        if (cancelled) return;
        // Only show imports belonging to the current payroll period
        const filtered = periodId
          ? list.filter((imp) => imp.payrollPeriodId === periodId)
          : list;
        setImports(filtered);

        if (filtered.length > 0) {
          // Prefer the active import, otherwise fall back to the latest
          const activeImport = filtered.find(i => i.isActive) ?? filtered[0];
          setSelectedImport(activeImport);
          setDetailLoading(true);
          try {
            const detail = await attendanceApi.getImportById(activeImport.id);
            if (!cancelled) {
              setImportDetail(detail);
            }
          } catch {
            if (!cancelled) {
              setError('Failed to load attendance data for the selected period.');
            }
          } finally {
            if (!cancelled) setDetailLoading(false);
          }
        } else {
          setSelectedImport(null);
          setImportDetail(null);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load attendance imports.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    folderApi.list().then((tree) => {
      setFolders(Array.isArray(tree) ? tree : []);
    }).catch(() => {
      setFolders([]);
    });
    return () => {
      cancelled = true;
    };
  }, [periodId]);

  const handleSelectImport = async (imp: AttendanceImport) => {
    if (imp.id === selectedImport?.id) return;
    setSelectedImport(imp);
    setCurrentPage(1);
    setDetailLoading(true);
    setError(null);

    const loadId = ++activeLoadRef.current;
    try {
      const detail = await attendanceApi.getImportById(imp.id);
      if (loadId === activeLoadRef.current) {
        setImportDetail(detail);
      }
    } catch {
      if (loadId === activeLoadRef.current) {
        setError('Failed to load attendance data for the selected period.');
        setImportDetail(null);
      }
    } finally {
      if (loadId === activeLoadRef.current) {
        setDetailLoading(false);
      }
    }
  };

  const handleImportComplete = useCallback(async () => {
    setDetailLoading(true);
    try {
      const list = (await attendanceApi.listImports({ limit: 1000 })) ?? [];
      const filtered = periodId
        ? list.filter((imp) => imp.payrollPeriodId === periodId)
        : list;
      setImports(filtered);

      if (filtered.length > 0) {
        const latest = filtered[0];
        setSelectedImport(latest);
        const detail = await attendanceApi.getImportById(latest.id);
        setImportDetail(detail);
      } else {
        setSelectedImport(null);
        setImportDetail(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to refresh attendance data');
    } finally {
      setDetailLoading(false);
    }
    setImportFlowOpen(false);
  }, [periodId]);

  const handleSubmitForApproval = async () => {
    if (!selectedImport?.id) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/attendance/imports/${selectedImport.id}/submit-for-approval`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await import('../../../lib/token')).tokenStorage.getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      let data: any;
      try {
        data = await response.json();
      } catch {
        data = { message: `Server returned ${response.status} ${response.statusText}` };
      }
      if (response.ok && data.success) {
        toast.success('Attendance submitted for approval successfully!');
        // Refresh import data to reflect new status
        const detail = await attendanceApi.getImportById(selectedImport.id);
        setImportDetail(detail);
      } else {
        toast.error(data.message || `Request failed (${response.status})`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit attendance for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const buildEmployeeName = (s: AttendanceMonthlySummary): string => {
    if (s.employee?.firstName || s.employee?.lastName) {
      return [s.employee.firstName, s.employee.lastName].filter(Boolean).join(' ');
    }
    return s.employeeName || 'Unknown Employee';
  };

  const getEmployeeInitials = (s: AttendanceMonthlySummary) => ({
    first: s.employee?.firstName ?? s.employeeName?.charAt(0) ?? '?',
    last: s.employee?.lastName ?? '',
  });

  const totalEmployees = importDetail?.monthlySummaries.length ?? 0;
  const totalRegularHours = importDetail?.monthlySummaries.reduce((sum, s) => sum + Number(s.regularHours), 0) ?? 0;
  const totalAbsenceHours = importDetail?.monthlySummaries.reduce((sum, s) => sum + Number(s.absenceHours), 0) ?? 0;
  const filteredSummaries = useMemo(() => {
    if (!importDetail) return [];
    const q = searchQuery.toLowerCase();
    return importDetail.monthlySummaries.filter((s) => {
      if (!q) return true;
      const name = buildEmployeeName(s).toLowerCase();
      const dept = (s.department ?? '').toLowerCase();
      return name.includes(q) || dept.includes(q);
    });
  }, [importDetail, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSummaries.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSummaries = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredSummaries.slice(start, start + pageSize);
  }, [filteredSummaries, safePage, pageSize]);

  // Compute progress tracker steps
  const importHasRecords = (importDetail?.attendanceRecords?.length ?? 0) > 0;
  const summaryCalculated = importDetail?.attendancePeriodSummaries && importDetail.attendancePeriodSummaries.length > 0;
  const isSubmitted = selectedImport?.status === 'PENDING' || selectedImport?.status === 'APPROVED' || selectedImport?.status === 'REJECTED';

  const progressSteps: ProgressStep[] = [
    { label: 'Import', status: importHasRecords ? 'completed' : isSubmitted ? 'completed' : 'active' },
    { label: 'Summary', status: summaryCalculated ? 'completed' : isSubmitted ? 'completed' : importHasRecords ? 'active' : 'pending' },
    { label: 'Submit', status: isSubmitted ? 'completed' : summaryCalculated ? 'active' : 'pending' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!imports || imports.length === 0) {
    return (
      <>
        <GlassCard className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Attendance Imports Found</h3>
          <p className="text-slate-500 text-sm max-w-md">
            No biometric attendance data imported for this payroll period.
          </p>
          <button
            onClick={() => setImportFlowOpen(true)}
            className="mt-6 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/10 active:scale-95"
          >
            <Upload className="w-4 h-4" /> Import Attendance
          </button>
        </GlassCard>

        {importFlowOpen && (
          <AttendanceImportFlow
            folders={folders}
            existingImports={imports}
            onComplete={() => {
              setImportFlowOpen(false);
              handleImportComplete();
            }}
            onCancel={() => setImportFlowOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stat Cards - 4-col grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Employees', value: totalEmployees, icon: Users, variant: 'success' as const },
          { label: 'Regular Hours', value: totalRegularHours.toFixed(1), icon: Clock, variant: 'primary' as const },
          { label: 'Absence Hours', value: totalAbsenceHours.toFixed(1), icon: AlertCircle, variant: 'warning' as const },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">{stat.value}</p>
                </div>
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
                  stat.variant === 'success' && 'bg-emerald-50 text-emerald-600',
                  stat.variant === 'primary' && 'bg-indigo-50 text-indigo-600',
                  stat.variant === 'warning' && 'bg-amber-50 text-amber-600',
                  stat.variant === 'default' && 'bg-slate-100 text-slate-500',
                )}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Progress Tracker + Submit */}
      {selectedImport && (
        <GlassCard className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 w-full sm:max-w-lg">
              <ProgressTracker steps={progressSteps} />
            </div>
            {isSubmitted && selectedImport?.status !== 'REJECTED' ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" />
                {selectedImport?.status === 'APPROVED' ? 'Approved' : 'Submitted for Approval'}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {selectedImport?.status === 'REJECTED' && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm font-bold">
                    <AlertCircle className="w-4 h-4" />
                    Rejected
                  </div>
                )}
                <button
                  onClick={handleSubmitForApproval}
                  disabled={submitting || !summaryCalculated}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg transition-all shadow-lg active:scale-95 whitespace-nowrap",
                    summaryCalculated && !submitting
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-900/10"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed",
                  )}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {selectedImport?.status === 'REJECTED' ? 'Resubmitting...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {selectedImport?.status === 'REJECTED' ? 'Resubmit for Approval' : 'Submit for Approval'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Import Selector & Table */}
      <GlassCard padding="none" className="overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200/60 bg-white/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search employees..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white/60 backdrop-blur-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              />
            </div>
            <div className="flex items-center gap-1 px-2 py-1.5 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-lg text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>{imports.length} imports</span>
            </div>
          </div>
          <button
            onClick={() => setImportFlowOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-900/10"
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
        </div>

        {/* Import table */}
        <div className="px-4 py-3 border-b border-slate-200/60 bg-white/30">
          <ImportTable
            imports={imports}
            selectedImportId={selectedImport?.id ?? null}
            onSelectImport={handleSelectImport}
            onToggleActive={(imp) => {
              attendanceApi.toggleImportActive(imp.id).then(() => {
                attendanceApi.listImports({ limit: 1000 }).then((list) => {
                  const filtered = periodId
                    ? (list ?? []).filter((i) => i.payrollPeriodId === periodId)
                    : (list ?? []);
                  setImports(filtered);
                });
              }).catch(() => {});
            }}
          />
        </div>

        {/* Table */}
        {detailLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-sm">{error}</div>
        ) : importDetail && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/60 bg-white/30">
                  <th className="px-4 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Employee</th>
                  <th className="px-4 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider text-right">Hours</th>
                  <th className="px-4 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider text-right">Absent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {paginatedSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      No employees found
                    </td>
                  </tr>
                ) : (
                  paginatedSummaries.map((row, i) => {
                    const initials = getEmployeeInitials(row);
                    return (
                      <tr
                        key={row.id || i}
                        onClick={() => navigate(`/attendance/${row.employeeId}?importId=${selectedImport?.id}`)}
                        className="hover:bg-slate-50/50 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <InitialAvatar
                              firstName={initials.first}
                              lastName={initials.last}
                              size="sm"
                            />
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{buildEmployeeName(row)}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{row.department || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums">{formatHourValue(row.regularHours)}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600 tabular-nums">
                          {formatHourValue(row.absenceHours)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {importDetail && !detailLoading && totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/60 bg-white/30">
            <p className="text-xs text-slate-400">
              Showing {paginatedSummaries.length} of {filteredSummaries.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded-lg hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-slate-300 text-xs">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={cn(
                        'w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                        p === safePage
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-100',
                      )}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded-lg hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {importFlowOpen && (
        <AttendanceImportFlow
          folders={folders}
          existingImports={imports}
          onComplete={handleImportComplete}
          onCancel={() => setImportFlowOpen(false)}
        />
      )}
    </div>
  );
};
