import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calculator, Users, Clock, AlertCircle, Search, ChevronLeft, ChevronRight, Download, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Skeleton, Button } from '../../../components/ui';
import { attendanceApi } from '../api/attendanceApi';
import { motion, AnimatePresence } from 'motion/react';
import type {
    AttendanceImport,
    AttendanceMonthlySummary,
    CombinedPeriodSummary,
    ImportDetail,
} from '../types/attendance.types';
import { exportAttendanceSummaryToXlsx } from '../utils/exportAttendanceSummary';

interface AttendancePeriodSummarySectionProps {
    periodId: string | null;
    periodName: string;
}

export const AttendancePeriodSummarySection: React.FC<AttendancePeriodSummarySectionProps> = ({
    periodId,
    periodName,
}) => {
    const [imports, setImports] = useState<AttendanceImport[]>([]);
    const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
    const [importDetail, setImportDetail] = useState<ImportDetail | null>(null);
    const [summary, setSummary] = useState<CombinedPeriodSummary | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [importLoading, setImportLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'hourly' | 'monthly'>('monthly');
    const STANDARD_HOURS = 8;

    // ── Fetch imports filtered to current payroll period ──
    const fetchImports = useCallback(async () => {
        if (!periodId) {
            setImports([]);
            setImportLoading(false);
            return;
        }
        setImportLoading(true);
        try {
            const list = await attendanceApi.listImports({ limit: 50 });
            const filtered = list.filter((imp) => imp.payrollPeriodId === periodId);
            setImports(filtered);
            if (filtered.length > 0 && !selectedImportId) {
                setSelectedImportId(filtered[0].id);
            } else if (filtered.length === 0) {
                setSelectedImportId(null);
            }
        } catch {
            setError('Failed to load attendance imports.');
        } finally {
            setImportLoading(false);
        }
    }, [periodId]);

    useEffect(() => { fetchImports(); }, [fetchImports]);

    // ── Load import detail + summary whenever import changes ──
    useEffect(() => {
        if (!selectedImportId) return;
        setDetailLoading(true);
        setImportDetail(null);
        setSummary(null);

        Promise.all([
            attendanceApi.getImportById(selectedImportId).catch(() => null),
            attendanceApi.getSummary(selectedImportId).catch(() => null),
        ]).then(([detail, sum]) => {
            if (detail) setImportDetail(detail);
            if (sum) setSummary(sum);
        }).finally(() => setDetailLoading(false));
    }, [selectedImportId]);

    // Reset page on search change
    useEffect(() => { setCurrentPage(1); }, [search, importDetail]);

    // ── Calculate summary ──
    const handleCalculateSummary = async () => {
        if (!selectedImportId) return;
        setCalculating(true);
        setError(null);
        try {
            const res = await attendanceApi.calculateSummary(selectedImportId);
            setSummary(res);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setError(e?.response?.data?.message || e?.message || 'Calculation failed');
        } finally {
            setCalculating(false);
        }
    };

    // ── Build lookup map for summary data ──
    const summaryMap = useMemo(() => {
        const map = new Map<string, { absentDays?: number; paidLeaveDays?: number; paidLeaveHours?: number; workingDays?: number; actualDays?: number; totalHours?: number; basicSalary?: number; grossSalary?: number; totalAllowances?: number }>();
        (summary?.employees ?? []).forEach((emp) => {
            map.set(emp.employeeId, {
                absentDays: emp.absentDays,
                paidLeaveDays: emp.paidLeaveDays,
                paidLeaveHours: emp.paidLeaveHours,
                workingDays: emp.workingDays,
                actualDays: emp.actualDays,
                totalHours: emp.totalHours,
                basicSalary: emp.basicSalary,
                grossSalary: emp.grossSalary,
                totalAllowances: emp.totalAllowances,
            });
        });
        return map;
    }, [summary]);

    const summaries: AttendanceMonthlySummary[] = importDetail?.monthlySummaries ?? [];

    const filteredSummaries = useMemo(() => {
        if (!search.trim()) return summaries;
        const q = search.trim().toLowerCase();
        return summaries.filter((s) => {
            const name = [s.employee?.firstName, s.employee?.lastName, s.employeeName]
                .filter(Boolean).join(' ').toLowerCase();
            return name.includes(q);
        });
    }, [summaries, search]);

    const totalPages = Math.max(1, Math.ceil(filteredSummaries.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedSummaries = filteredSummaries.slice((safePage - 1) * pageSize, safePage * pageSize);

    const getEmployeeName = (s: AttendanceMonthlySummary) =>
        [s.employee?.firstName, s.employee?.lastName].filter(Boolean).join(' ') || s.employeeName || 'Unknown Employee';

    const getInitials = (s: AttendanceMonthlySummary) => ({
        first: s.employee?.firstName?.charAt(0) ?? s.employeeName?.charAt(0) ?? '?',
        last: s.employee?.lastName?.charAt(0) ?? '',
    });

    // ── Stats ──
    const totalEmployees = summaries.length;
    const totalAbsentHrs = summaries.reduce((sum, s) => sum + Number(s.absenceHours ?? 0), 0);
    const totalRegularHrs = summaries.reduce((sum, s) => sum + Number(s.regularHours ?? 0), 0);

    const formatNumber = (n: number) => n.toLocaleString('en-US');
    const formatHours = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    // ── Empty state ──
    if (!periodId) {
        return (
            <div className="p-12 text-center glass rounded-[3rem] border-white shadow-xl">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Calculator className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Matrix Context Missing</h3>
                <p className="text-slate-500 font-medium max-w-md mx-auto">
                    Select a valid payroll period from the gateway above to view active attendance summaries.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-6">
            {/* ── Command Strip: Import Selector + Calculate ── */}
            <div className="glass rounded-[2.5rem] p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-white shadow-xl bg-white/40">
                <div className="flex items-center gap-4 pl-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Context</span>
                    <div className="relative group">
                        <select
                            value={selectedImportId ?? ''}
                            onChange={(e) => setSelectedImportId(e.target.value)}
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
                    {/* View mode toggle - Professional Glassy */}
                    <div className="glass bg-white/60 p-1 rounded-2xl flex items-center shadow-inner border-white/50">
                        <button
                            onClick={() => setViewMode('monthly')}
                            className={cn(
                                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                                viewMode === 'monthly' ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setViewMode('hourly')}
                            className={cn(
                                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                                viewMode === 'hourly' ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Hourly
                        </button>
                    </div>

                    <Button
                        onClick={handleCalculateSummary}
                        disabled={!selectedImportId || calculating}
                        className="px-8 shadow-xl shadow-brand-900/10 h-10 text-[10px] uppercase font-black tracking-widest rounded-xl"
                    >
                        {calculating ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating...</>
                        ) : (
                            <><Calculator className="w-4 h-4" /> Run Matrix</>
                        )}
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => exportAttendanceSummaryToXlsx(summary, viewMode, periodName)}
                        disabled={!summary || !summary.employees || summary.employees.length === 0}
                        className="px-6 h-10 border-white shadow-lg text-[10px] uppercase font-black tracking-widest rounded-xl"
                    >
                        <Download className="w-4 h-4" /> Export
                    </Button>
                </div>
            </div>

            {/* ── Error Notification ── */}
            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="glass bg-rose-50 border-rose-100 rounded-[2rem] p-5 flex items-center gap-4 shadow-sm"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                            <AlertCircle className="w-5 h-5 text-rose-500" />
                        </div>
                        <p className="text-rose-800 text-sm font-bold">{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Loading Skeletons ── */}
            {(importLoading || detailLoading) && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-32 rounded-[2rem]" />
                        <Skeleton className="h-32 rounded-[2rem]" />
                        <Skeleton className="h-32 rounded-[2rem]" />
                    </div>
                    <Skeleton className="h-96 rounded-[3rem]" />
                </div>
            )}

            {/* ── Content Canvas ── */}
            {!importLoading && !detailLoading && summaries.length > 0 && (
                <div className="space-y-10">
                    {/* ── Summary Stats Bento ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[
                            { label: ' PERSONNEL Strength', value: formatNumber(totalEmployees), icon: Users, color: 'text-brand-primary', bg: 'bg-white/50' },
                            { label: viewMode === 'hourly' ? 'TOTAL CAPACITY (HRS)' : 'TOTAL CAPACITY (DAYS)', value: formatHours(viewMode === 'hourly' ? totalRegularHrs : totalRegularHrs / STANDARD_HOURS), icon: Clock, color: 'text-brand-secondary', bg: 'bg-white/50' },
                            { label: viewMode === 'hourly' ? 'ABSENCE DEFICIT (HRS)' : 'ABSENCE DEFICIT (DAYS)', value: formatHours(viewMode === 'hourly' ? totalAbsentHrs : totalAbsentHrs / STANDARD_HOURS), icon: AlertCircle, color: 'text-rose-500', bg: 'bg-white/50' },
                        ].map((stat, i) => (
                            <motion.div 
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass rounded-[2rem] p-8 shadow-xl border-white group hover:-translate-y-1 transition-all duration-300 flex flex-col gap-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div className={cn("w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center ring-1 ring-slate-100 group-hover:scale-110 transition-transform", stat.color)}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</span>
                                </div>
                                <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">{stat.value}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* ── Table Matrix ── */}
                    <div className="glass rounded-[3rem] shadow-2xl border-white overflow-hidden bg-white/30 backdrop-blur-md">
                        {/* Matrix Toolbar */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/40">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Filter Personnel Matrix..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-80 pl-12 pr-6 py-3 bg-white/50 border-none rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold text-slate-700 placeholder:text-slate-400 shadow-sm"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="px-4 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                                    {filteredSummaries.length} Records In-Scope
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-white/60 border-b border-slate-100">
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-200/50">Personnel Identity</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-200/50 text-right">Absence Log</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-200/50 text-right">Governed Absence</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Deployment Yield</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedSummaries.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-32 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No active personnel data available</td>
                                        </tr>
                                    ) : (
                                        paginatedSummaries.map((row, i) => {
                                            const initials = getInitials(row);
                                            const name = getEmployeeName(row);
                                            const sumData = summaryMap.get(row.employeeId);
                                            const rowBg = i % 2 === 0 ? 'bg-white/20' : 'bg-transparent';

                                            const paidLeaveHrs = Number(row.annualLeaveHours ?? 0)
                                                + Number(row.sickLeaveHours ?? 0)
                                                + Number(row.casualLeaveHours ?? 0)
                                                + Number(row.maternityLeaveHours ?? 0)
                                                + Number(row.compassionateLeaveHours ?? 0)
                                                + Number(row.businessTripHours ?? 0)
                                                + Number(row.compensatoryHours ?? 0);

                                            let absentDisplay = '';
                                            let paidDisplay = '';
                                            let totalDisplay = '';

                                            if (viewMode === 'hourly') {
                                                const absHrs = Number(row.absenceHours ?? 0);
                                                absentDisplay = `${absHrs.toFixed(1)}h`;
                                                const displayPaidHrs = (sumData?.paidLeaveHours != null && sumData.paidLeaveHours > 0)
                                                    ? sumData.paidLeaveHours
                                                    : paidLeaveHrs;
                                                paidDisplay = `${displayPaidHrs.toFixed(1)}h`;
                                                const totalVal = sumData?.totalHours != null
                                                    ? sumData.totalHours
                                                    : Number(row.regularHours ?? 0) + displayPaidHrs;
                                                totalDisplay = `${totalVal.toFixed(1)}h`;
                                            } else {
                                                const rawAbsHrs = Number(row.absenceHours ?? 0);
                                                const absDays = (sumData?.absentDays != null && (sumData.absentDays > 0 || rawAbsHrs === 0))
                                                    ? sumData.absentDays
                                                    : rawAbsHrs / STANDARD_HOURS;
                                                absentDisplay = `${absDays.toFixed(1)}d`;
                                                const displayPaidDays = (sumData?.paidLeaveDays != null && sumData.paidLeaveDays > 0)
                                                    ? sumData.paidLeaveDays
                                                    : paidLeaveHrs / STANDARD_HOURS;
                                                paidDisplay = `${displayPaidDays.toFixed(1)}d`;
                                                const rawRegHrs = Number(row.regularHours ?? 0);
                                                const totalVal = (sumData?.actualDays != null && (sumData.actualDays > 0 || rawRegHrs === 0))
                                                    ? sumData.actualDays
                                                    : (rawRegHrs + (displayPaidDays * STANDARD_HOURS)) / STANDARD_HOURS;
                                                totalDisplay = `${totalVal.toFixed(1)}d`;
                                            }

                                            return (
                                                <tr key={row.id || i} className={cn(rowBg, "hover:bg-brand-primary/5 transition-all group cursor-default border-b border-slate-50/50")}>
                                                    <td className="px-8 py-5 border-r border-slate-200/50">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 flex items-center justify-center font-black text-[10px] text-brand-primary group-hover:scale-110 transition-transform">
                                                                {initials.first}{initials.last}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-black text-slate-900 tracking-tight">{name}</div>
                                                                {row.department && (
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{row.department}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 border-r border-slate-200/50 text-right">
                                                        <span className={cn("text-sm font-black font-mono tracking-tight", parseFloat(absentDisplay) > 0 ? "text-rose-500" : "text-slate-900")}>
                                                            {absentDisplay}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 border-r border-slate-200/50 text-right">
                                                        <span className="text-sm font-black font-mono text-slate-900 tracking-tight">
                                                            {paidDisplay}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <span className="text-sm font-black font-mono text-brand-primary tracking-tight">
                                                            {totalDisplay}
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
                        {filteredSummaries.length > 0 && (
                            <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-white/40">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    Syncing <span className="text-slate-900 font-mono">{paginatedSummaries.length}</span> of <span className="text-slate-900 font-mono">{filteredSummaries.length}</span> personnel
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={safePage <= 1}
                                        className="w-10 h-10 rounded-2xl glass border-white flex items-center justify-center text-slate-400 hover:text-brand-primary disabled:opacity-30 transition-all shadow-sm active:scale-90"
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
                                        className="w-10 h-10 rounded-2xl glass border-white flex items-center justify-center text-slate-400 hover:text-brand-primary disabled:opacity-30 transition-all shadow-sm active:scale-90"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
