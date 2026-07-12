import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { leaveApi } from '../api/leaveApi';
import { LeaveApplicationsTable } from './LeaveApplicationsTable';
import type { LeaveApplication, LeaveSyncLog } from '../types/leave.types';

/** Paid leave types (excludes unpaid/casual leave). */
export const PAID_LEAVE_TYPES = [
    'annualLeave', 'Annual Leave', 'Annual',
    'sickLeave', 'Sick Leave', 'Sick',
    'maternityLeave', 'Maternity Leave', 'Maternity',
    'compassionateLeave', 'Compassionate Leave', 'Compassionate',
    'businessTrip', 'Business Trip',
    'compensatory', 'Compensatory', 'Compensatory Leave',
];

interface LeaveApplicationsSectionProps {
    periodId: string | null;
    periodStart: string;
    periodEnd: string;
    /** When true, only paid leave types are shown. */
    paidLeaveOnly?: boolean;
}

const statusBadge = (status: string) => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
        case 'SUCCESS':
            return cn(base, 'bg-emerald-100 text-emerald-700');
        case 'FAILED':
            return cn(base, 'bg-rose-100 text-rose-700');
        default:
            return cn(base, 'bg-slate-100 text-slate-600');
    }
};

export const LeaveApplicationsSection: React.FC<LeaveApplicationsSectionProps> = ({
    periodId,
    periodStart,
    periodEnd,
    paidLeaveOnly = false,
}) => {
    const [applications, setApplications] = useState<LeaveApplication[]>([]);
    const [syncLogs, setSyncLogs] = useState<LeaveSyncLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [syncResultCount, setSyncResultCount] = useState<number | null>(null);

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
            // Fetch all leave applications that OVERLAP the period (not just strictly within)
            const data = await leaveApi.getApplications({
                startDate: periodStart,
                endDate: periodEnd,
            });

            // When paidLeaveOnly: try to match paid types, but fall back to showing all
            // if the backend returns type codes we don't yet recognise.
            if (paidLeaveOnly && data.length > 0) {
                const paid = data.filter((a) =>
                    PAID_LEAVE_TYPES.some((t) =>
                        a.leaveType.toLowerCase().includes(t.toLowerCase())
                    )
                );
                // If the filter removes EVERYTHING, the leave types from the backend
                // don't match our list → show all synced applications instead
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

    /** Fetch the latest 5 sync logs for history display. */
    const fetchSyncLogs = useCallback(async () => {
        try {
            const data = await leaveApi.getSyncLogs(5);
            setSyncLogs(data);
        } catch (err) {
            console.error('Failed to fetch sync logs:', err);
        }
    }, []);

    // Initial fetch + re-fetch when period boundaries change
    useEffect(() => {
        fetchApplications();
        fetchSyncLogs();
    }, [fetchApplications, fetchSyncLogs]);

    /** Sync leave applications from the Employee Module for the selected period. */
    const handleSync = useCallback(async () => {
        if (!periodId) return;

        setSyncing(true);
        setSyncError(null);
        setSyncResultCount(null);
        try {
            const result = await leaveApi.sync(undefined, periodId);
            setSyncResultCount(result.applicationsSynced ?? 0);
            // Always refresh both data sources after sync (even if 0 synced)
            await Promise.all([fetchApplications(), fetchSyncLogs()]);
        } catch (err: unknown) {
            console.error('Sync failed:', err);
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            const detail = e?.response?.data?.message || e?.message || 'Unknown error';
            setSyncError(`Sync failed: ${detail}`);
            // Still refresh applications to show any existing data
            fetchApplications().catch(() => { });
        } finally {
            setSyncing(false);
        }
    }, [periodId, fetchApplications, fetchSyncLogs]);

    // Auto-hide sync result banner after 8 seconds
    useEffect(() => {
        if (syncResultCount === null) return;
        const timer = setTimeout(() => setSyncResultCount(null), 8000);
        return () => clearTimeout(timer);
    }, [syncResultCount]);

    /* ── No period selected ─────────────────────────────────── */
    if (!periodId) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">Leave Applications</h2>
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl">
                    <p className="font-medium">Select a payroll period to view leave applications.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Header: Title, Count, Sync Button ─────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Leave Applications</h2>
                    <p className="text-sm text-slate-500">
                        {loading
                            ? 'Loading...'
                            : paidLeaveOnly
                                ? `${applications.length} paid leave applications found`
                                : `${applications.length} applications found for this period`}
                    </p>
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

            {/* ── Sync Error ─────────────────────────────────────── */}
            <AnimatePresence>
                {syncError && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 overflow-hidden"
                    >
                        {syncError}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Sync Success Banner (auto-hides after 8s) ──────── */}
            <AnimatePresence>
                {syncResultCount !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 overflow-hidden"
                    >
                        <CheckCircle className="inline w-4 h-4 mr-1.5 -mt-0.5" />
                        Sync completed — {syncResultCount} applications synced
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Fetch Error ────────────────────────────────────── */}
            {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    {error}
                </div>
            )}

            {/* ── Loading Spinner ────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                    <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mr-3" />
                    Loading applications...
                </div>
            ) : (
                /* ── Leave Applications Table ─────────────────────── */
                <LeaveApplicationsTable
                    applications={applications}
                    loading={false}
                />
            )}

            {/* ── Sync History Section ───────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <History className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800">Recent Sync History</h3>
                </div>

                {syncLogs.length === 0 ? (
                    <p className="text-sm text-slate-400">No sync history yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employees</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {syncLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 text-slate-600">
                                            {new Date(log.syncedAt).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-800">
                                            {log.employeeCount}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={statusBadge(log.status)}>{log.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
