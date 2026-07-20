import React from 'react';
import { Calculator } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { LeaveDeduction } from '../types/leave.types';

interface Props {
    deductions: LeaveDeduction[];
    loading: boolean;
    onCalculate: () => void;
    calculating: boolean;
}

export const LeaveDeductionsTable: React.FC<Props> = ({ deductions, loading, onCalculate, calculating }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-48 text-slate-400">
                <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full mr-3" />
                Loading deductions...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                    {deductions.length} deduction{deductions.length !== 1 ? 's' : ''} found
                </p>
                <button
                    onClick={onCalculate}
                    disabled={calculating}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                    <Calculator className="w-4 h-4" />
                    {calculating ? 'Calculating...' : 'Calculate Deductions'}
                </button>
            </div>

            {deductions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg">
                    <p className="font-medium">No deductions calculated</p>
                    <p className="text-sm mt-1">Sync leave data first, then calculate deductions for the current period.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600 border-r border-slate-200/50">Employee</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600 border-r border-slate-200/50">Leave Type</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600 border-r border-slate-200/50">Days</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600 border-r border-slate-200/50">Deduction </th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Period</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deductions.map((d, idx) => (
                                <tr key={d.id} className={cn("hover:bg-brand-50/60 transition-colors border-b border-slate-100", idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white')}>
                                    <td className="px-4 py-3 font-medium text-slate-800 border-r border-slate-200/50">
                                        {d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 border-r border-slate-200/50">{d.leaveType}</td>
                                    <td className="px-4 py-3 text-right text-slate-800 border-r border-slate-200/50">{d.leaveDays}</td>
                                    <td className="px-4 py-3 text-right font-medium text-rose-600 border-r border-slate-200/50">
                                        {d.deductionAmount > 0 ? d.deductionAmount.toLocaleString() : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {d.payrollPeriod?.name || '—'}
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
