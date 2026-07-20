import React, { useState, useRef, useEffect } from 'react';
import { Users, Pencil, Check, X, Play, Pause, Archive, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { GlassCard } from '../../../components/ui';
import { toast } from '../../../components/ui/Toast';
import { renameBatch, activateBatch, closeBatch, archiveBatch, deleteBatch } from '../api';
import type { PayrollBatch } from '../types';

interface BatchCardProps {
  batch: PayrollBatch;
  onClick?: () => void;
  onRenamed?: (id: string, name: string) => void;
  onStatusChanged?: (id: string, status: PayrollBatch['status']) => void;
  onDeleted?: (id: string) => void;
}

const statusConfig: Record<PayrollBatch['status'], { dot: string; bg: string; text: string; label: string }> = {
  DRAFT: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', label: 'Draft' },
  ACTIVE: { dot: 'bg-emerald-500', bg: 'bg-brand-50', text: 'text-emerald-700', label: 'Active' },
  CLOSED: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Closed' },
  ARCHIVED: { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-600', label: 'Archived' },
};

export const BatchCard: React.FC<BatchCardProps> = ({ batch, onClick, onRenamed, onStatusChanged, onDeleted }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(batch.name);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === batch.name) {
      setEditing(false);
      setEditValue(batch.name);
      return;
    }
    setSaving(true);
    try {
      await renameBatch(batch.id!, trimmed);
      setEditing(false);
      onRenamed?.(batch.id!, trimmed);
      toast.success(`Batch renamed to "${trimmed}"`);
    } catch {
      setEditValue(batch.name);
      toast.error('Failed to rename batch');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditValue(batch.name);
      setEditing(false);
    }
  };

  const handleTransition = async (e: React.MouseEvent, action: () => Promise<PayrollBatch>) => {
    e.stopPropagation();
    setTransitioning(true);
    try {
      const updated = await action();
      onStatusChanged?.(batch.id!, updated.status);
      toast.success(`Batch "${batch.name}" ${updated.status.toLowerCase()}`);
    } catch {
      toast.error(`Failed to update batch status`);
    } finally {
      setTransitioning(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${batch.name}"? This will remove all employee assignments.`)) return;
    setTransitioning(true);
    try {
      await deleteBatch(batch.id!);
      onDeleted?.(batch.id!);
      toast.success(`Batch "${batch.name}" deleted`);
    } catch {
      toast.error('Failed to delete batch');
    } finally {
      setTransitioning(false);
    }
  };

  const status = statusConfig[batch.status];

  const transitionButtons = (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {batch.status === 'DRAFT' && (
        <button
          onClick={(e) => handleTransition(e, () => activateBatch(batch.id!))}
          disabled={transitioning || saving}
          className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-brand-50 border border-brand-200 rounded-md hover:bg-brand-100 transition-colors cursor-pointer disabled:opacity-50"
          title="Activate batch"
        >
          <Play className="w-3 h-3 inline mr-0.5" />
          Activate
        </button>
      )}
      {batch.status === 'ACTIVE' && (
        <button
          onClick={(e) => handleTransition(e, () => closeBatch(batch.id!))}
          disabled={transitioning || saving}
          className="px-2 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50"
          title="Close batch"
        >
          <Pause className="w-3 h-3 inline mr-0.5" />
          Close
        </button>
      )}
      {batch.status === 'CLOSED' && (
        <button
          onClick={(e) => handleTransition(e, () => archiveBatch(batch.id!))}
          disabled={transitioning || saving}
          className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          title="Archive batch"
        >
          <Archive className="w-3 h-3 inline mr-0.5" />
          Archive
        </button>
      )}
    </div>
  );

  return (
    <GlassCard
      hover
      onClick={onClick}
      className="flex flex-col w-full group relative overflow-hidden cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2 h-2 rounded-full shrink-0', status.dot)} />
          {editing ? (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                disabled={saving}
                className="text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 min-w-0 w-28"
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
                disabled={saving}
                className="p-1 rounded-md bg-brand-50 text-emerald-600 hover:bg-brand-100 transition-colors cursor-pointer shrink-0"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setEditValue(batch.name);
                  setEditing(false);
                }}
                className="p-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <h3 className="text-sm font-bold text-slate-900 truncate">{batch.name}</h3>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', status.bg, status.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
            {status.label}
          </span>
          {!editing && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              title="Rename"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Rows */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">Total Employees</span>
          <span className="text-sm font-bold text-slate-900">{batch._count.employees}</span>
        </div>
      </div>

      {/* Employee initials strip */}
      {batch.employees && batch.employees.length > 0 && (
        <div className="flex items-center -space-x-1 mb-3">
          {batch.employees.slice(0, 5).map((emp: any, i: number) => (
            <div
              key={emp.id || i}
              className={cn(
                'w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white',
                i % 4 === 0 && 'bg-gradient-to-br from-brand-500 to-brand-600',
                i % 4 === 1 && 'bg-gradient-to-br from-indigo-500 to-purple-500',
                i % 4 === 2 && 'bg-gradient-to-br from-amber-500 to-orange-500',
                i % 4 === 3 && 'bg-gradient-to-br from-sky-500 to-cyan-500',
              )}
            >
              {(emp.firstName?.charAt(0) ?? '').toUpperCase()}
            </div>
          ))}
          {batch._count.employees > 5 && (
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-slate-500 bg-slate-100 ring-2 ring-white">
              +{batch._count.employees - 5}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-500 font-medium">
            {batch._count.employees} {batch._count.employees === 1 ? 'employee' : 'employees'}
          </span>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {transitionButtons}
          <button
            onClick={handleDelete}
            disabled={transitioning}
            className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
            title="Delete batch"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
};
