import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, CheckCircle, Search, ChevronLeft, ChevronRight, Eye, FileText, Clock, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { leaveApi } from '../api/leaveApi';
import type { LeaveApplication } from '../types/leave.types';

/** Paid leave types (excludes unpaid/casual leave). */
export const PAID_LEAVE_TYPES = [
    'annualLeave', 'Annual Leave', 'Annual',
    'sickLeave', 'Sick Leave', 'Sick',
    'maternityLeave', 'Maternity Leave', 'Maternity',
    'compassionateLeave', 'Compassionate Leave', 'Compassionate',
    'businessTrip', 'Business Trip',
    'compensatory', 'Compensatory', 'Compensatory Leave',
];

type LeaveStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    APPROVED: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981', label: 'Approved' },
    PENDING: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6', label: 'Pending' },
    REJECTED: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444', label: 'Rejected' },
};

const leaveTypeColors: Record<string, { bg: string; text: string }> = {
    'Annual Leave': { bg: '#D1FAE5', text: '#065F46' },
    'Sick Leave': { bg: '#FEF3C7', text: '#92400E' },
    'Maternity Leave': { bg: '#FCE7F3', text: '#9D174D' },
    'Paternity Leave': { bg: '#DBEAFE', text: '#1E40AF' },
    'Compassionate Leave': { bg: '#F3E8FF', text: '#6B21A8' },
    'Business Trip': { bg: '#E0E7FF', text: '#3730A3' },
    'Unpaid Leave': { bg: '#F3F4F6', text: '#6B7280' },
};

const getLeaveTypeStyle = (leaveType: string) => {
    const key = Object.keys(leaveTypeColors).find(
        (k) => leaveType.toLowerCase().includes(k.toLowerCase())
    );
    return key ? leaveTypeColors[key] : { bg: '#F3F4F6', text: '#6B7280' };
};

const formatDate = (dateStr: string): string =>
    new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

interface LeaveApplicationsSectionProps {
    periodId: string | null;
    periodStart: string;
    periodEnd: string;
    /** When true, only paid leave types are shown. */
    paidLeaveOnly?: boolean;
}

export const LeaveApplicationsSection: React.FC<LeaveApplicationsSectionProps> = ({
    periodId,
    periodStart,
    periodEnd,
    paidLeaveOnly = false,
}) => {
    const [applications, setApplications] = useState<LeaveApplication[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [syncResultCount, setSyncResultCount] = useState<number | null>(null);

    // Table state
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    /**
     * Fetch leave applications within the selected period.
     * Skipped when periodStart or periodEnd are empty/null.
     */
    const fetchApplications = useCallback(async () => {
        if (!periodStart || !periodEnd) {
            setApplications([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await leaveApi.getApplications({
                startDate: periodStart,
                endDate: periodEnd,
            });

            if (paidLeaveOnly && data.length > 0) {
                const paid = data.filter((a) =>
                    PAID_LEAVE_TYPES.some((t) =>
                        a.leaveType.toLowerCase().includes(t.toLowerCase())
                    )
                );
                setApplications(paid.length > 0 ? paid : data);
            } else {
                setApplications(data);
            }
        } catch (err) {
            console.error('Failed to fetch leave applications:', err);
            setError('Failed to load leave applications. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [periodStart, periodEnd, paidLeaveOnly]);

    // Initial fetch + re-fetch when period boundaries change
    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const handleSync = useCallback(async () => {
        if (!periodId) return;

        setSyncing(true);
        setSyncError(null);
        setSyncResultCount(null);
        try {
            const result = await leaveApi.sync(undefined, periodId);
            setSyncResultCount(result.applicationsSynced ?? 0);
            await fetchApplications();
        } catch (err: unknown) {
            console.error('Sync failed:', err);
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            const detail = e?.response?.data?.message || e?.message || 'Unknown error';
            setSyncError(`Sync failed: ${detail}`);
            fetchApplications().catch(() => { });
        } finally {
            setSyncing(false);
        }
    }, [periodId, fetchApplications]);

    // Auto-hide sync result banner after 8 seconds
    useEffect(() => {
        if (syncResultCount === null) return;
        const timer = setTimeout(() => setSyncResultCount(null), 8000);
        return () => clearTimeout(timer);
    }, [syncResultCount]);

    // Reset page on search/filter change
    useEffect(() => { setCurrentPage(1); }, [search, typeFilter]);

    // Filter + paginate
    const leaveTypes = useMemo(
        () => [...new Set(applications.map((a) => a.leaveType))].sort(),
        [applications]
    );

    const filtered = useMemo(() => {
        return applications.filter((a) => {
            const name = a.employee
                ? `${a.employee.firstName} ${a.employee.lastName}`.toLowerCase()
                : '';
            const matchesSearch = !search || name.includes(search.toLowerCase());
            const matchesType = !typeFilter || a.leaveType === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [applications, search, typeFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const getInitials = (app: LeaveApplication) => ({
        first: app.employee?.firstName?.charAt(0) ?? '?',
        last: app.employee?.lastName?.charAt(0) ?? '',
    });

    const getEmployeeName = (app: LeaveApplication) =>
        app.employee
            ? `${app.employee.firstName} ${app.employee.lastName}`
            : 'Unknown Employee';

    /* ── No period selected ── */
    if (!periodId) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                        <RefreshCw className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Leave Applications</h3>
                    <p className="text-slate-500 text-sm max-w-md">
                        Select a payroll period to view leave applications.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* ── Header: Title, Count, Sync Button ── */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-white/50">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-800">
                        {loading ? 'Loading...' : `${filtered.length} leave application(s)`}
                    </span>
                </div>
                <Button
                    onClick={handleSync}
                    isLoading={syncing}
                    size="md"
                >
                    <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
                    {syncing ? 'Syncing...' : 'Sync from Employee Module'}
                </Button>
            </div>

            {/* ── Sync Error ── */}
            <AnimatePresence>
                {syncError && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        className="mx-5 mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 overflow-hidden"
                    >
                        {syncError}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Sync Success Banner ── */}
            <AnimatePresence>
                {syncResultCount !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        className="mx-5 mt-3 text-sm text-emerald-700 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 overflow-hidden"
                    >
                        <CheckCircle className="inline w-4 h-4 mr-1.5 -mt-0.5" />
                        Sync completed — {syncResultCount} applications synced
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Fetch Error ── */}
            {error && (
                <div className="mx-5 mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    {error}
                </div>
            )}

            {/* ── Loading ── */}
            {loading ? (
                <div className="p-12 flex justify-center">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* ── Toolbar ── */}
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div style={{ position: 'relative' }}>
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" style={{ pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search employee..."
                                    style={{
                                        width: '220px', padding: '7px 12px 7px 34px', border: '1px solid #E5E7EB',
                                        borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', color: '#111827',
                                        background: '#fff', outline: 'none', transition: 'all 150ms ease',
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.boxShadow = '0 0 0 3px rgba(5,150,105,0.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    style={{
                                        padding: '7px 32px 7px 12px', border: '1px solid #E5E7EB', borderRadius: '6px',
                                        fontSize: '13px', fontFamily: 'inherit', color: '#111827', background: '#fff',
                                        cursor: 'pointer', outline: 'none', appearance: 'none',
                                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%239CA3AF%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E")',
                                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                                    }}
                                >
                                    <option value="">All Leave Types</option>
                                    {leaveTypes.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── Leave Stats ── */}
                    {!loading && applications.length > 0 && (
                        <div className="px-5 pt-5">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(() => {
                                    const total = applications.length;
                                    const approved = applications.filter((a) => a.status === 'APPROVED').length;
                                    const pending = applications.filter((a) => a.status === 'PENDING').length;
                                    const rejected = applications.filter((a) => a.status === 'REJECTED').length;
                                    const fmt = (n: number) => n.toLocaleString('en-US');
                                    return [
                                        { label: 'Total Applications', value: fmt(total), icon: FileText, iconBg: 'bg-brand-100 text-emerald-600' },
                                        { label: 'Approved', value: fmt(approved), icon: CheckCircle, iconBg: 'bg-brand-100 text-emerald-600' },
                                        { label: 'Pending', value: fmt(pending), icon: Clock, iconBg: 'bg-amber-100 text-amber-600' },
                                        { label: 'Rejected', value: fmt(rejected), icon: XCircle, iconBg: 'bg-rose-100 text-rose-600' },
                                    ].map((stat) => (
                                        <div key={stat.label} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.12em]">{stat.label}</p>
                                                <div className={`w-8 h-8 rounded-xl ${stat.iconBg} flex items-center justify-center shadow-sm`}>
                                                    <stat.icon className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <p className="text-xl font-black text-slate-800 tracking-tight">{stat.value}</p>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {/* ── Table ── */}
                    {paginated.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-sm">
                            No leave applications found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th className="border-r border-slate-200/50" style={{ background: '#F9FAFB', padding: '12px 20px', textAlign: 'left', fontSize: '11.5px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E5E7EB' }}>Employee</th>
                                        <th className="border-r border-slate-200/50" style={{ background: '#F9FAFB', padding: '12px 20px', textAlign: 'left', fontSize: '11.5px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E5E7EB' }}>Leave Type</th>
                                        <th className="border-r border-slate-200/50" style={{ background: '#F9FAFB', padding: '12px 20px', textAlign: 'left', fontSize: '11.5px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E5E7EB' }}>Start Date</th>
                                        <th className="border-r border-slate-200/50" style={{ background: '#F9FAFB', padding: '12px 20px', textAlign: 'left', fontSize: '11.5px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E5E7EB' }}>End Date</th>
                                        <th className="border-r border-slate-200/50" style={{ background: '#F9FAFB', padding: '12px 20px', textAlign: 'right', fontSize: '11.5px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E5E7EB' }}>Days</th>
                                        <th className="border-r border-slate-200/50" style={{ background: '#F9FAFB', padding: '12px 20px', textAlign: 'left', fontSize: '11.5px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E5E7EB' }}>Status</th>
                                        <th style={{ width: '80px', background: '#F9FAFB', padding: '12px 20px', textAlign: 'left', fontSize: '11.5px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E5E7EB' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((app, i) => {
                                        const initials = getInitials(app);
                                        const name = getEmployeeName(app);
                                        const statusInfo = statusConfig[app.status] ?? { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF', label: app.status };
                                        const typeStyle = getLeaveTypeStyle(app.leaveType);
                                        const rowBg = i % 2 === 0 ? 'bg-slate-50/40' : 'bg-white';

                                        return (
                                            <tr key={app.id} className={`${rowBg} hover:bg-brand-50/60 transition-colors duration-150`}>
                                                <td className="border-r border-slate-200/50" style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            width: '36px', height: '36px', borderRadius: '50%',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontWeight: 600, fontSize: '13px', flexShrink: 0,
                                                            background: '#D1FAE5', color: '#059669',
                                                        }}>
                                                            {initials.first}{initials.last}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 500, color: '#111827', fontSize: '13.5px', lineHeight: 1.3 }}>{name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="border-r border-slate-200/50" style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>
                                                    <span style={{
                                                        display: 'inline-flex', padding: '2px 10px', borderRadius: '9999px',
                                                        fontSize: '12px', fontWeight: 500,
                                                        background: typeStyle.bg, color: typeStyle.text,
                                                    }}>
                                                        {app.leaveType}
                                                    </span>
                                                </td>
                                                <td className="border-r border-slate-200/50" style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle', fontSize: '13.5px', color: '#111827' }}>
                                                    {formatDate(app.startDate)}
                                                </td>
                                                <td className="border-r border-slate-200/50" style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle', fontSize: '13.5px', color: '#111827' }}>
                                                    {formatDate(app.endDate)}
                                                </td>
                                                <td className="border-r border-slate-200/50" style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle', fontSize: '13.5px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                                                    {app.requestedDays}
                                                </td>
                                                <td className="border-r border-slate-200/50" style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '2px 10px', borderRadius: '9999px', fontSize: '11.5px', fontWeight: 500,
                                                        background: statusInfo.bg, color: statusInfo.text,
                                                    }}>
                                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusInfo.dot, flexShrink: 0 }} />
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button
                                                            title="View"
                                                            style={{ width: '30px', height: '30px', borderRadius: '4px', border: 'none', background: 'transparent', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease' }}
                                                            className="hover:bg-[#F9FAFB] hover:text-[#111827]"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Pagination ── */}
                    {filtered.length > 0 && (
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', color: '#9CA3AF' }}>
                            <span>Showing {paginated.length} of {filtered.length} records</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={safePage <= 1}
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #E5E7EB',
                                        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: safePage > 1 ? 'pointer' : 'not-allowed', opacity: safePage > 1 ? 1 : 0.3,
                                        color: '#6B7280', fontFamily: 'inherit',
                                    }}
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                    .map((p, idx, arr) => (
                                        <React.Fragment key={p}>
                                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                <span style={{ padding: '0 4px', color: '#D1D5DB', fontSize: '12px' }}>...</span>
                                            )}
                                            <button
                                                onClick={() => setCurrentPage(p)}
                                                style={{
                                                    width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #E5E7EB',
                                                    background: p === safePage ? '#059669' : '#fff',
                                                    color: p === safePage ? '#fff' : '#6B7280',
                                                    fontWeight: 500, fontSize: '13px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontFamily: 'inherit',
                                                }}
                                            >
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={safePage >= totalPages}
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #E5E7EB',
                                        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: safePage < totalPages ? 'pointer' : 'not-allowed', opacity: safePage < totalPages ? 1 : 0.3,
                                        color: '#6B7280', fontFamily: 'inherit',
                                    }}
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
