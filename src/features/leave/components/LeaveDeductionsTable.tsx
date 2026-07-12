import React from 'react';
import { Calculator } from 'lucide-react';
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
                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mr-3" />
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
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
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
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Employee</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Leave Type</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600">Days</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600">Deduction </th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Period</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {deductions.map((d) => (
                                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        {d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{d.leaveType}</td>
                                    <td className="px-4 py-3 text-right text-slate-800">{d.leaveDays}</td>
                                    <td className="px-4 py-3 text-right font-medium text-rose-600">
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
