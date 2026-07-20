import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Users,
  Clock,
  AlertCircle,
  Upload,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Send,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Skeleton, GlassCard, StatusBadge, InitialAvatar } from '../../../components/ui';
import { attendanceApi } from '../api/attendanceApi';
import { toast } from '../../../components/ui/Toast';
import { AttendanceImportFlow } from '../../dataManagement/components/AttendanceImportFlow';
import { ImportTable } from './ImportTable';
import { folderApi } from '../../dataManagement/api/folderApi';
import { formatHourValue } from '../../../lib/parseBiometricWorkbook';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { attendanceActions, selectAllImports, selectAttendanceError, selectAttendanceLoading, selectImportLoading, selectSelectedImport } from '../store/attendanceSlice';
import type { AttendanceImport, AttendanceMonthlySummary, ImportDetail } from '../types/attendance.types';
import type { FolderTreeNode } from '../../dataManagement/types/folder.types';

interface AttendanceSummarySectionProps {
  importId?: string;
  periodId?: string | null;
  triggerImport?: boolean;
  onImportConsumed?: () => void;
}

const getAvatarColor = (name: string) => {
  const colors = ['green', 'blue', 'orange', 'purple', 'red'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const statusConfig: Record<string, { className: string; dot: string; label: string }> = {
  APPROVED: { className: 'bg-brand-50 text-emerald-700', dot: '#10B981', label: 'Approved' },
  PENDING: { className: 'bg-blue-50 text-blue-700', dot: '#3B82F6', label: 'Pending' },
  REJECTED: { className: 'bg-red-50 text-red-700', dot: '#EF4444', label: 'Flagged' },
  DRAFT: { className: 'bg-slate-50 text-slate-600', dot: '#9CA3AF', label: 'Draft' },
};

export const AttendanceSummarySection: React.FC<AttendanceSummarySectionProps> = ({
  importId, periodId, triggerImport, onImportConsumed,
}) => {
  const dispatch = useAppDispatch();
  const imports = useAppSelector(selectAllImports);
  const selectedImport = useAppSelector(selectSelectedImport);
  const loading = useAppSelector(selectAttendanceLoading);
  const detailLoading = useAppSelector(selectImportLoading);
  const error = useAppSelector(selectAttendanceError);
  const [importDetail, setImportDetail] = useState<ImportDetail | null>(null);
  const [importFlowOpen, setImportFlowOpen] = useState(false);
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const activeLoadRef = useRef(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  // Open import flow when parent triggers it
  useEffect(() => {
    if (triggerImport) {
      setImportFlowOpen(true);
      if (onImportConsumed) onImportConsumed();
    }
  }, [triggerImport, onImportConsumed]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const list = (await attendanceApi.listImports({ limit: 1000 })) ?? [];
        if (cancelled) return;
        const filtered = periodId
          ? list.filter((imp) => imp.payrollPeriodId === periodId)
          : list;
        dispatch(attendanceActions.fetchImportsSuccess(filtered));

        if (filtered.length > 0) {
          const activeImport = filtered.find(i => i.isActive) ?? filtered[0];
          dispatch(attendanceActions.fetchImportByIdRequest(activeImport.id));
          try {
            const detail = await attendanceApi.getImportById(activeImport.id);
            if (!cancelled) {
              setImportDetail(detail);
              dispatch(attendanceActions.fetchImportByIdSuccess(detail));
            }
          } catch {
            if (!cancelled) {
              dispatch(attendanceActions.fetchImportByIdFailure('Failed to load attendance data for the selected period.'));
            }
          }
        } else {
          setImportDetail(null);
          dispatch(attendanceActions.clearSelectedImport());
        }
      } catch {
        if (!cancelled) {
          dispatch(attendanceActions.fetchImportsFailure('Failed to load attendance imports.'));
        }
      }
    };

    loadData();
    folderApi.list().then((tree) => {
      setFolders(Array.isArray(tree) ? tree : []);
    }).catch(() => setFolders([]));

    return () => { cancelled = true; };
  }, [dispatch, periodId]);

  const handleSelectImport = async (imp: AttendanceImport) => {
    if (imp.id === selectedImport?.id) return;
    setCurrentPage(1);

    const loadId = ++activeLoadRef.current;
    try {
      dispatch(attendanceActions.fetchImportByIdRequest(imp.id));
      const detail = await attendanceApi.getImportById(imp.id);
      if (loadId === activeLoadRef.current) {
        setImportDetail(detail);
        dispatch(attendanceActions.fetchImportByIdSuccess(detail));
      }
    } catch {
      if (loadId === activeLoadRef.current) {
        dispatch(attendanceActions.fetchImportByIdFailure('Failed to load attendance data.'));
        setImportDetail(null);
      }
    }
  };

  const handleImportComplete = useCallback(async () => {
    try {
      const list = (await attendanceApi.listImports({ limit: 1000 })) ?? [];
      const filtered = periodId
        ? list.filter((imp) => imp.payrollPeriodId === periodId)
        : list;
      dispatch(attendanceActions.fetchImportsSuccess(filtered));
      if (filtered.length > 0) {
        const latest = filtered[0];
        dispatch(attendanceActions.fetchImportByIdRequest(latest.id));
        const detail = await attendanceApi.getImportById(latest.id);
        setImportDetail(detail);
        dispatch(attendanceActions.fetchImportByIdSuccess(detail));
      } else {
        setImportDetail(null);
        dispatch(attendanceActions.clearSelectedImport());
      }
    } catch (err: any) {
      dispatch(attendanceActions.fetchImportsFailure(err?.response?.data?.message || err?.message || 'Failed to refresh attendance data'));
    }
    setImportFlowOpen(false);
  }, [dispatch, periodId]);

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
      try { data = await response.json(); } catch { data = { message: `Server returned ${response.status} ${response.statusText}` }; }
      if (response.ok && data.success) {
        toast.success('Attendance submitted for approval successfully!');
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
    first: (s.employee?.firstName ?? s.employeeName ?? '?').charAt(0),
    last: (s.employee?.lastName ?? '').charAt(0),
  });

  const getStatus = (s: AttendanceMonthlySummary): keyof typeof statusConfig => {
    void s;
    return selectedImport?.status as keyof typeof statusConfig ?? 'DRAFT';
  };

  const filteredSummaries = useMemo(() => {
    if (!importDetail) return [];
    const q = searchQuery.toLowerCase();
    return importDetail.monthlySummaries.filter((s) => {
      if (!q) return true;
      const name = buildEmployeeName(s).toLowerCase();
      const dept = (s.department ?? '').toLowerCase();
      return name.includes(q) || dept.includes(q);
    }).filter((s) => {
      if (!statusFilter) return true;
      return (selectedImport?.status ?? '') === statusFilter;
    });
  }, [importDetail, searchQuery, statusFilter, selectedImport]);

  const getEmployeeCode = (s: AttendanceMonthlySummary): string => {
    // Attempt to generate a code from available data
    return s.employee?.id?.slice(0, 7).toUpperCase() ?? `EMP-${s.employeeId?.slice(0, 3).toUpperCase() ?? '000'}`;
  };

  const totalPages = Math.max(1, Math.ceil(filteredSummaries.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSummaries = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredSummaries.slice(start, start + pageSize);
  }, [filteredSummaries, safePage, pageSize]);

  const importHasRecords = (importDetail?.attendanceRecords?.length ?? 0) > 0;
  const summaryCalculated = importDetail?.attendancePeriodSummaries && importDetail.attendancePeriodSummaries.length > 0;
  const isSubmitted = selectedImport?.status === 'PENDING' || selectedImport?.status === 'APPROVED' || selectedImport?.status === 'REJECTED';

  if (loading && (!imports || imports.length === 0)) {
    return <div className="p-6"><Skeleton className="h-80 rounded-xl" /></div>;
  }

  if (!imports || imports.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Attendance Imports Found</h3>
          <p className="text-slate-500 text-sm max-w-md">No biometric attendance data imported for this payroll period.</p>
          <button
            onClick={() => setImportFlowOpen(true)}
            className="mt-6 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-brand-900/10 active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Import Attendance
          </button>
        </div>
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
  }

  return (
    <div className="space-y-6">
      {/* Submit bar - Glassy Command Strip */}
      {selectedImport && (
        <div className="glass rounded-[2rem] p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-white shadow-lg bg-white/40">
          <div className="flex items-center gap-4 pl-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Ingest</span>
            <div className="relative group">
              <select
                value={selectedImport.id}
                onChange={(e) => {
                  const imp = imports.find(i => i.id === e.target.value);
                  if (imp) handleSelectImport(imp);
                }}
                className="appearance-none bg-white/60 border-none rounded-xl pl-4 pr-10 py-2 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-brand-primary/10 transition-all cursor-pointer min-w-[240px]"
              >
                {imports.map((imp) => (
                  <option key={imp.id} value={imp.id}>
                    {imp.periodLabel || `Cycle ${new Date(imp.importedAt).toLocaleDateString()}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none group-hover:text-brand-primary" />
            </div>
          </div>
          
          <div className="flex items-center gap-3 pr-2">
            {isSubmitted && selectedImport?.status !== 'REJECTED' ? (
              <div className="flex items-center gap-2 px-6 py-2 bg-brand-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                {selectedImport?.status === 'APPROVED' ? 'Governance Approved' : 'Verified & Sent'}
              </div>
            ) : (
              <>
                {selectedImport?.status === 'REJECTED' && (
                  <div className="flex items-center gap-2 px-6 py-2 bg-rose-50 text-rose-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-100 shadow-sm">
                    <AlertCircle className="w-4 h-4" />
                    Record Flagged
                  </div>
                )}
                <button
                  onClick={handleSubmitForApproval}
                  disabled={submitting || !summaryCalculated}
                  className={cn(
                    "inline-flex items-center gap-2 px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-xl",
                    summaryCalculated && !submitting
                      ? "bg-brand-primary text-white hover:bg-brand-dark shadow-brand-900/20"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed",
                  )}
                >
                  {submitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Transmitting...</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> {selectedImport?.status === 'REJECTED' ? 'Resubmit Ledger' : 'Authorize Batch'}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toolbar - Search & Status */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search personnel..."
              className="w-full md:w-72 pl-12 pr-6 py-3 bg-white/50 border-none rounded-[1.5rem] text-sm focus:bg-white focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold text-slate-700 placeholder:text-slate-400 shadow-sm"
            />
          </div>
          <div className="relative group">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="appearance-none bg-white/50 border-none rounded-[1.5rem] px-8 py-3 pr-12 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-brand-primary/10 transition-all cursor-pointer shadow-sm"
            >
              <option value="">All Governance</option>
              <option value="APPROVED">Authorized</option>
              <option value="PENDING">Awaiting</option>
              <option value="DRAFT">Internal Draft</option>
              <option value="REJECTED">Flagged</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none group-hover:text-brand-primary" />
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={() => setImportFlowOpen(true)}
            className="w-12 h-12 flex items-center justify-center rounded-2xl glass border-white text-brand-primary hover:bg-white transition-all shadow-lg active:scale-90"
            title="Import Biometrics"
          >
            <Upload className="w-5 h-5" />
          </button>
          <button
            className="w-12 h-12 flex items-center justify-center rounded-2xl glass border-white text-slate-400 hover:text-brand-primary hover:bg-white transition-all shadow-lg active:scale-90"
            title="Sync Matrix"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Table Canvas */}
      {detailLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-6 glass rounded-[3rem] border-white">
          <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying Biometric Logs...</p>
        </div>
      ) : error ? (
        <div className="py-24 text-center glass rounded-[3rem] border-rose-100 text-rose-500 font-bold">{error}</div>
      ) : importDetail && (
        <div className="glass rounded-[2.5rem] shadow-xl border-white overflow-hidden bg-white/40">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-white/60 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-200/50">Engagement Window</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-200/50">Personnel</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-200/50">Time Utilization</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-200/50 text-right">Absence Log</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Governance</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-32 text-center">
                      <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No personnel records detected</p>
                    </td>
                  </tr>
                ) : (
                  paginatedSummaries.map((row, i) => {
                    const initials = getEmployeeInitials(row);
                    const name = buildEmployeeName(row);
                    const status = getStatus(row);
                    const statusInfo = statusConfig[status] ?? statusConfig.DRAFT;
                    const absentDays = Number(row.absenceHours ?? 0) > 0 ? Math.max(1, Math.round(Number(row.absenceHours) / 8)) : 0;
                    const hours = Number(row.regularHours ?? 0);
                    const maxHours = 200;
                    const barPct = Math.min(100, (hours / maxHours) * 100);
                    const barColor = barPct >= 75 ? 'var(--color-brand-primary)' : barPct >= 50 ? '#F59E0B' : '#EF4444';
                    const rowBg = i % 2 === 0 ? 'bg-white/20' : 'bg-transparent';

                    return (
                      <tr
                        key={row.id || i}
                        className={cn(rowBg, "hover:bg-brand-primary/5 transition-all group cursor-default border-b border-slate-50/50")}
                      >
                        <td className="px-8 py-5 border-r border-slate-200/50">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 tracking-tight">
                              {importDetail?.payrollPeriod?.name ?? selectedImport?.periodLabel ?? 'Master Cycle'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                              Ingested {new Date(selectedImport?.importedAt ?? new Date()).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 border-r border-slate-200/50">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 flex items-center justify-center font-black text-[10px] text-brand-primary group-hover:scale-110 transition-transform">
                              {initials.first}{initials.last}
                            </div>
                            <div>
                              <div className="text-sm font-black text-slate-900 tracking-tight">{name}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{getEmployeeCode(row)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 border-r border-slate-200/50">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[120px] ring-1 ring-slate-200/50">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${barPct}%` }}
                                transition={{ duration: 1, ease: "circOut" }}
                                className="h-full rounded-full shadow-sm"
                                style={{ background: barColor }} 
                              />
                            </div>
                            <span className="text-xs font-black text-slate-900 font-mono min-w-[65px] text-right">
                              {formatHourValue(hours)}<span className="text-[10px] text-slate-400 ml-1">h</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 border-r border-slate-200/50 text-right">
                          <span className={cn("text-sm font-black font-mono tracking-tight", absentDays > 0 ? "text-rose-500" : "text-slate-900")}>
                            {absentDays} <span className="text-[10px] text-slate-400 uppercase tracking-widest font-sans ml-1">Days</span>
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border",
                            status === 'APPROVED' ? "bg-brand-50 text-emerald-700 border-emerald-100" :
                            status === 'PENDING' ? "bg-blue-50 text-blue-700 border-blue-100" :
                            status === 'REJECTED' ? "bg-rose-50 text-rose-700 border-rose-100" :
                            "bg-slate-50 text-slate-600 border-slate-100"
                          )}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusInfo.dot }} />
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Canvas */}
          {importDetail && !detailLoading && totalPages > 0 && (
            <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-white/40">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Showing <span className="text-slate-900 font-mono">{paginatedSummaries.length}</span> of <span className="text-slate-900 font-mono">{filteredSummaries.length}</span> personnel
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="w-10 h-10 rounded-2xl glass border-white flex items-center justify-center text-slate-400 hover:text-brand-primary disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm active:scale-90"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-2 text-slate-300 font-black">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={cn(
                          "w-10 h-10 rounded-2xl text-xs font-black transition-all active:scale-90 shadow-sm",
                          p === safePage 
                            ? "bg-brand-primary text-white shadow-brand-900/20" 
                            : "glass border-white text-slate-500 hover:bg-white"
                        )}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="w-10 h-10 rounded-2xl glass border-white flex items-center justify-center text-slate-400 hover:text-brand-primary disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm active:scale-90"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
