import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import type { LeaveBalance } from '../types/leave.types';

interface Props {
    balances: LeaveBalance[];
    loading: boolean;
}

export const LeaveBalancesTable: React.FC<Props> = ({ balances, loading }) => {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const leaveTypes = [...new Set(balances.map((b) => b.leaveType))].sort();

    const filtered = balances.filter((b) => {
        const name = b.employee
            ? `${b.employee.firstName} ${b.employee.lastName}`.toLowerCase()
            : '';
        const matchesSearch = name.includes(search.toLowerCase()) || b.leaveType.toLowerCase().includes(search.toLowerCase());
        const matchesType = !typeFilter || b.leaveType === typeFilter;
        return matchesSearch && matchesType;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48 text-slate-400">
                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mr-3" />
                Loading balances...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by employee or leave type..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                >
                    <option value="">All Types</option>
                    {leaveTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg">
                    <p className="font-medium">No leave balances found</p>
                    <p className="text-sm mt-1">Sync leave data from the Employee Module to see balances here.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Employee</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Leave Type</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Fiscal Year</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600">Entitlement</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600">Used</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600">Pending</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600">Remaining</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600">Expiry</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        {b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{b.leaveType}</td>
                                    <td className="px-4 py-3 text-slate-600">{b.fiscalYear}</td>
                                    <td className="px-4 py-3 text-right text-slate-800">{b.totalEntitlement}</td>
                                    <td className="px-4 py-3 text-right text-amber-600">{b.usedDays}</td>
                                    <td className="px-4 py-3 text-right text-orange-500">{b.pendingDays}</td>
                                    <td className="px-4 py-3 text-right font-medium text-emerald-600">{b.remainingDays}</td>
                                    <td className="px-4 py-3 text-right text-slate-400">
                                        {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}
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
