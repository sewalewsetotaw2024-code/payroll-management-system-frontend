import React, { useState } from 'react';
import { DollarSign, Pencil, Trash2, Plus, ChevronDown, ChevronUp, RefreshCw, User } from 'lucide-react';
import { Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { CurrencyRate } from '../types/configuration.types';

interface CurrencyConfigurationViewProps {
  rates: CurrencyRate[];
  saving: boolean;
  onEdit: (rate: CurrencyRate) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  MANUAL: { label: 'Manual', color: 'bg-amber-50 text-amber-700' },
  AUTO_FETCH: { label: 'Auto', color: 'bg-blue-50 text-blue-700' },
};

/**
 * CurrencyConfigurationView component displaying currency exchange rates in a table
 * with source/override info and edit/delete actions.
 */
export const CurrencyConfigurationView: React.FC<CurrencyConfigurationViewProps> = ({
  rates,
  saving,
  onEdit,
  onDelete,
  onAdd,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Exchange Rates</h4>
          <p className="text-xs text-slate-500">Manage currency conversion rates with source tracking</p>
        </div>
        <Button onClick={onAdd} variant="primary" size="sm" className="rounded-full">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Rate
        </Button>
      </div>
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="w-10 px-2 border-r border-slate-200/50" />
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4 border-r border-slate-200/50">From</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4 border-r border-slate-200/50">To</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4 border-r border-slate-200/50">Rate</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4 border-r border-slate-200/50">Source</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4 border-r border-slate-200/50">Effective Date</th>
                <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                    No currency rates configured yet.
                  </td>
                </tr>
              ) : (
                rates.map((rate, idx) => {
                  const isExpanded = expandedId === rate.id;
                  const sourceMeta = SOURCE_LABELS[rate.source] ?? { label: rate.source, color: 'bg-slate-50 text-slate-600' };

                  return (
                    <React.Fragment key={rate.id}>
                      <tr className={cn(
                        "border-b border-slate-100",
                        idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white',
                        "hover:bg-brand-50/60 transition-colors",
                      )}>
                        <td className="px-2 py-4 border-r border-slate-200/50">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : rate.id!)}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4 border-r border-slate-200/50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-50 rounded-lg text-emerald-600">
                              <DollarSign className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-slate-900">
                              {rate.fromCurrency?.code ?? rate.fromCurrencyId}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-900 border-r border-slate-200/50">
                          {rate.toCurrency?.code ?? rate.toCurrencyId}
                        </td>
                        <td className="px-4 py-4 font-mono font-bold text-slate-900 border-r border-slate-200/50">
                          {Number(rate.rate).toFixed(6)}
                        </td>
                        <td className="px-4 py-4 border-r border-slate-200/50">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${sourceMeta.color}`}>
                            {rate.source === 'AUTO_FETCH' ? (
                              <RefreshCw className="w-3 h-3" />
                            ) : (
                              <User className="w-3 h-3" />
                            )}
                            {sourceMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-500 border-r border-slate-200/50">
                          {new Date(rate.effectiveDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onEdit(rate)}
                              className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDelete(rate.id!)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${rate.id}-detail`}>
                          <td colSpan={7} className="bg-slate-50/30 px-6 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                              <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate Info</span>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Rate:</span>
                                    <span className="font-semibold text-slate-800">{Number(rate.rate).toFixed(6)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Pair:</span>
                                    <span className="font-semibold text-slate-800">
                                      {rate.fromCurrency?.code ?? rate.fromCurrencyId}/{rate.toCurrency?.code ?? rate.toCurrencyId}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</span>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Source:</span>
                                    <span className="font-semibold text-slate-800">{sourceMeta.label}</span>
                                  </div>
                                  {rate.overrideReason && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Reason:</span>
                                      <span className="font-semibold text-slate-800 text-right max-w-[200px]">{rate.overrideReason}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dates</span>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Effective:</span>
                                    <span className="font-semibold text-slate-800">
                                      {new Date(rate.effectiveDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {rate.createdAt && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Created:</span>
                                      <span className="font-semibold text-slate-800">
                                        {new Date(rate.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
