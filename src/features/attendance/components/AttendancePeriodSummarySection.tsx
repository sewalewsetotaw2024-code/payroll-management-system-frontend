import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calculator, FileBarChart2, Clock, Users, Search, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Button, Skeleton, GlassCard, InitialAvatar } from '../../../components/ui';
import { attendanceApi } from '../api/attendanceApi';
import type {
    AttendanceImport,
    AttendanceMonthlySummary,
    CombinedPeriodSummary,
    ImportDetail,
} from '../types/attendance.types';

interface AttendancePeriodSummarySectionProps {
    periodId: string | null;
    periodName: string;
}

export const AttendancePeriodSummarySection: React.FC<AttendancePeriodSummarySectionProps> = ({
    periodId,
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

    // ── Stats ──
    const totalEmployees = summaries.length;
    const totalAbsentHrs = summaries.reduce((sum, s) => sum + Number(s.absenceHours ?? 0), 0);
    const totalRegularHrs = summaries.reduce((sum, s) => sum + Number(s.regularHours ?? 0), 0);

    // ── Empty state ──
    if (!periodId) {
        return (
            <GlassCard className="text-center py-12">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <FileBarChart2 className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">Attendance Summary</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Select a payroll period to view attendance summaries.
                </p>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Header Card: Import selector + Calculate button ── */}
            <GlassCard>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-2 flex-1">
                        <span className="text-sm font-bold text-slate-700">Attendance Summary</span>
                        {imports.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Import:</span>
                                <select
                                    value={selectedImportId ?? ''}
                                    onChange={(e) => setSelectedImportId(e.target.value)}
                                    className="text-sm bg-white/60 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                                >
                                    {imports.map((imp) => (
                                        <option key={imp.id} value={imp.id}>
                                            {imp.periodLabel || `Import ${new Date(imp.importedAt).toLocaleDateString()}`} · {imp.totalRecords ?? 0} records
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* ── Hourly / Monthly toggle ── */}
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('monthly')}
                                className={cn(
                                    'px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer',
                                    viewMode === 'monthly'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600',
                                )}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setViewMode('hourly')}
                                className={cn(
                                    'px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer',
                                    viewMode === 'hourly'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600',
                                )}
                            >
                                Hourly
                            </button>
                        </div>

                        <Button
                            onClick={handleCalculateSummary}
                            isLoading={calculating}
                            disabled={!selectedImportId || calculating}
                            size="md"
                        >
                            <Calculator className="w-4 h-4" />
                            {calculating ? 'Calculating...' : 'Calculate Summary'}
                        </Button>
                    </div>
                </div>
            </GlassCard>

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* ── Loading skeletons ── */}
            {(importLoading || detailLoading) && (
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-24 rounded-xl" />
                        <Skeleton className="h-24 rounded-xl" />
                        <Skeleton className="h-24 rounded-xl" />
                    </div>
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            )}

            {/* ── No imports for this period ── */}
            {!importLoading && imports.length === 0 && (
                <GlassCard className="text-center py-12">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <FileBarChart2 className="w-6 h-6 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No Attendance Imports</h3>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                        No biometric attendance data imported for this payroll period.
                        Import attendance data for this period from the Attendance Data tab.
                    </p>
                </GlassCard>
            )}

            {/* ── Summary stats ── */}
            {!importLoading && !detailLoading && summaries.length > 0 && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {([
                            { label: 'Employees', value: totalEmployees, icon: Users },
                            {
                                label: viewMode === 'hourly' ? 'Total Regular Hours' : 'Total Regular Days',
                                value: viewMode === 'hourly'
                                    ? totalRegularHrs.toFixed(1)
                                    : (totalRegularHrs / STANDARD_HOURS).toFixed(1),
                                icon: Clock,
                            },
                            {
                                label: viewMode === 'hourly' ? 'Total Absent Hours' : 'Total Absent Days',
                                value: viewMode === 'hourly'
                                    ? totalAbsentHrs.toFixed(1)
                                    : (totalAbsentHrs / STANDARD_HOURS).toFixed(1),
                                icon: AlertCircle,
                            },
                        ] as const).map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                            >
                                <GlassCard>
                                    <div className="flex items-start justify-between mb-3">
                                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                            <stat.icon className="w-4 h-4 text-slate-500" />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">{stat.value}</p>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>

                    {/* ── Table ── */}
                    <GlassCard padding="none" className="overflow-hidden">
                        {/* Search + info bar */}
                        <div className="p-4 border-b border-slate-200/60 bg-white/40 flex items-center justify-between gap-3">
                            <div className="relative max-w-xs flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                                />
                            </div>
                            {!summary && (
                                <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
                                    Run "Calculate Summary" for computed totals
                                </span>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-white/30 border-b border-slate-200/60">
                                        <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Employee</th>
                                        <th className="text-right px-4 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                                            {viewMode === 'hourly' ? 'Absent Hours' : 'Absent Days'}
                                        </th>
                                        <th className="text-right px-4 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                                            {viewMode === 'hourly' ? 'Paid Leave Hrs' : 'Paid Leave Days'}
                                        </th>
                                        <th className="text-right px-4 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                                            {viewMode === 'hourly' ? 'Total Hours' : 'Total Days'}
                                            <span className="ml-1 normal-case font-normal text-[9px] text-slate-300">
                                                {viewMode === 'hourly' ? '(regular + leave)' : '(workdays−absent+leave)'}
                                            </span>
                                        </th>

                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/80">
                                    {paginatedSummaries.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                                                No employees found
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedSummaries.map((row, i) => {
                                            const name = getEmployeeName(row);
                                            const sumData = summaryMap.get(row.employeeId);

                                            // Compute paid leave hours once (shared by both modes)
                                            const paidLeaveHrs = Number(row.annualLeaveHours ?? 0)
                                                + Number(row.sickLeaveHours ?? 0)
                                                + Number(row.casualLeaveHours ?? 0)
                                                + Number(row.maternityLeaveHours ?? 0)
                                                + Number(row.compassionateLeaveHours ?? 0)
                                                + Number(row.businessTripHours ?? 0)
                                                + Number(row.compensatoryHours ?? 0);

                                            // ── Determine absent / paid / total display based on viewMode ──
                                            let absentDisplay = '';
                                            let paidDisplay = '';
                                            let totalDisplay = '';

                                            if (viewMode === 'hourly') {
                                                const absHrs = Number(row.absenceHours ?? 0);
                                                absentDisplay = `${absHrs.toFixed(1)} hrs`;
                                                // Use stored paidLeaveHours from summary (includes LeaveApplication data)
                                                const displayPaidHrs = (sumData?.paidLeaveHours != null && sumData.paidLeaveHours > 0)
                                                    ? sumData.paidLeaveHours
                                                    : paidLeaveHrs;
                                                paidDisplay = `${displayPaidHrs.toFixed(1)} hrs`;
                                                const totalVal = sumData?.totalHours != null
                                                    ? sumData.totalHours
                                                    : Number(row.regularHours ?? 0) + displayPaidHrs;
                                                totalDisplay = `${totalVal.toFixed(1)} hrs`;
                                            } else {
                                                const rawAbsHrs = Number(row.absenceHours ?? 0);
                                                const absDays = (sumData?.absentDays != null && (sumData.absentDays > 0 || rawAbsHrs === 0))
                                                    ? sumData.absentDays
                                                    : rawAbsHrs / STANDARD_HOURS;
                                                absentDisplay = `${absDays.toFixed(1)} days`;
                                                // Use stored paidLeaveDays from summary (includes LeaveApplication data)
                                                const displayPaidDays = (sumData?.paidLeaveDays != null && sumData.paidLeaveDays > 0)
                                                    ? sumData.paidLeaveDays
                                                    : paidLeaveHrs / STANDARD_HOURS;
                                                paidDisplay = `${displayPaidDays.toFixed(1)} days`;
                                                const rawRegHrs = Number(row.regularHours ?? 0);
                                                const totalVal = (sumData?.actualDays != null && (sumData.actualDays > 0 || rawRegHrs === 0))
                                                    ? sumData.actualDays
                                                    : (rawRegHrs + (displayPaidDays * STANDARD_HOURS)) / STANDARD_HOURS;
                                                totalDisplay = `${totalVal.toFixed(1)} days`;
                                            }


                                            return (
                                                <tr key={row.id || i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <InitialAvatar
                                                                firstName={row.employee?.firstName ?? name.charAt(0)}
                                                                lastName={row.employee?.lastName ?? ''}
                                                                size="sm"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-800">{name}</p>
                                                                {row.department && (
                                                                    <p className="text-[11px] text-slate-400">{row.department}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600 tabular-nums text-sm">
                                                        {absentDisplay}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600 tabular-nums text-sm">
                                                        {paidDisplay}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums text-sm">
                                                        {totalDisplay}
                                                    </td>

                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-4 py-3 bg-white/40 border-t border-slate-200/60 flex items-center justify-between gap-4">
                            <p className="text-xs text-slate-400">
                                Showing {paginatedSummaries.length} of {filteredSummaries.length} employees
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={safePage <= 1}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                                        safePage <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-white/60',
                                    )}
                                >
                                    Prev
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                    .map((p, idx, arr) => (
                                        <React.Fragment key={p}>
                                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                <span className="px-1 text-slate-300">...</span>
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
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                                        safePage >= totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-white/60',
                                    )}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </>
            )}
        </div>
    );
};
