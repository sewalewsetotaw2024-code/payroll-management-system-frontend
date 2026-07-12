import React from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { LeaveSyncLog } from '../types/leave.types';

interface Props {
    syncing: boolean;
    lastResult: { typesSynced: number; balancesSynced: number; applicationsSynced: number } | null;
    syncLogs: LeaveSyncLog[];
    onSync: () => void;
}

export const LeaveSyncPanel: React.FC<Props> = ({ syncing, lastResult, syncLogs, onSync }) => {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'SUCCESS': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'FAILED': return <XCircle className="w-4 h-4 text-rose-500" />;
            default: return <Clock className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Leave Data Sync</h3>
                <p className="text-sm text-slate-500 mb-4">
                    Pull the latest leave types, balances, and approved applications from the Employee Management System.
                </p>

                <button
                    onClick={onSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync from Employee Module'}
                </button>

                {lastResult && (
                    <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                        <p className="text-sm font-medium text-emerald-800">Sync completed</p>
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500">Types:</span>{' '}
                                <span className="font-medium">{lastResult.typesSynced}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Balances:</span>{' '}
                                <span className="font-medium">{lastResult.balancesSynced}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Applications:</span>{' '}
                                <span className="font-medium">{lastResult.applicationsSynced}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Sync History</h3>
                {syncLogs.length === 0 ? (
                    <p className="text-sm text-slate-400">No sync logs yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Records</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {syncLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 text-slate-600">
                                            {new Date(log.syncedAt).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-800">{log.employeeCount}</td>
                                        <td className="px-4 py-3 text-center">
                                            {getStatusIcon(log.status)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                                            {log.errorDetails || '—'}
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
