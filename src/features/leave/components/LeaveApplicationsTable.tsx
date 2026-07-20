import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { LeaveApplication } from '../types/leave.types';

interface LeaveApplicationsTableProps {
    applications: LeaveApplication[];
    loading: boolean;
}

const statusBadge = (status: string) => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
        case 'APPROVED':
            return cn(base, 'bg-brand-100 text-emerald-700');
        case 'PENDING':
            return cn(base, 'bg-amber-100 text-amber-700');
        case 'REJECTED':
            return cn(base, 'bg-rose-100 text-rose-700');
        default:
            return cn(base, 'bg-slate-100 text-slate-600');
    }
};

const formatDate = (dateStr: string): string =>
    new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

export const LeaveApplicationsTable: React.FC<LeaveApplicationsTableProps> = ({
    applications,
    loading,
}) => {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const leaveTypes = [...new Set(applications.map((a) => a.leaveType))].sort();

    const filtered = applications.filter((a) => {
        const name = a.employee
            ? `${a.employee.firstName} ${a.employee.lastName}`.toLowerCase()
            : '';
        return !search || name.includes(search.toLowerCase());
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48 text-slate-400">
                <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full mr-3" />
                Loading applications...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl">
                    <p className="font-medium">No leave applications found</p>
                    <p className="text-sm mt-1">
                        Sync leave data from the Employee Module to see applications here.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200/50">Employee</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid Leave Days</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((a, idx) => (
                                <tr key={a.id} className={cn("hover:bg-brand-50/60 transition-colors border-b border-slate-100", idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white')}>
                                    <td className="px-4 py-3 font-medium text-slate-800 border-r border-slate-200/50">
                                        {a.employee
                                            ? `${a.employee.firstName} ${a.employee.lastName}`
                                            : <span className="text-slate-400 text-xs">Unknown Employee</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                                        {a.requestedDays}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
