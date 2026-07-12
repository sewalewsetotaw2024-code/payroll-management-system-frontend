import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight, Pencil, Check, X, Play, Pause, Archive } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { GlassCard, StatusBadge, InitialAvatar } from '../../../components/ui';
import { toast } from '../../../components/ui/Toast';
import { renameBatch, activateBatch, closeBatch, archiveBatch } from '../api';
import type { PayrollBatch } from '../types';

interface BatchCardProps {
  batch: PayrollBatch;
  onRenamed?: (id: string, name: string) => void;
  onStatusChanged?: (id: string, status: PayrollBatch['status']) => void;
}

export const BatchCard: React.FC<BatchCardProps> = ({ batch, onRenamed, onStatusChanged }) => {
  const navigate = useNavigate();
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
    } catch {
      // Error handled by API layer
    } finally {
      setTransitioning(false);
    }
  };

  const transitionButtons = (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {batch.status === 'DRAFT' && (
        <button
          onClick={(e) => handleTransition(e, () => activateBatch(batch.id!))}
          disabled={transitioning || saving}
          className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
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
      onClick={() => !editing && !transitioning && navigate(`/payroll-batch/${batch.id}`)}
      className="flex flex-col gap-3 w-full group relative overflow-hidden"
    >
      {/* Top accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <InitialAvatar
            firstName={batch.name?.charAt(0) ?? 'B'}
            lastName=""
            size="md"
            variant="indigo"
          />
          <div className="min-w-0 flex-1">
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
                  className="text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 min-w-0 w-full"
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
                  disabled={saving}
                  className="p-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setEditValue(batch.name);
                    setEditing(false);
                  }}
                  className="p-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 truncate">{batch.name}</h3>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                  className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer shrink-0"
                  title="Rename batch"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">
                {batch._count.employees} {batch._count.employees === 1 ? 'employee' : 'employees'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={batch.status} />
          {transitionButtons}
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Employee initials strip */}
      {batch.employees && batch.employees.length > 0 && (
        <div className="flex items-center -space-x-1.5 pt-1">
          {batch.employees.slice(0, 5).map((emp: any, i: number) => (
            <div
              key={emp.id || i}
              className={cn(
                'w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white/80',
                i % 4 === 0 && 'bg-gradient-to-br from-emerald-500 to-emerald-600',
                i % 4 === 1 && 'bg-gradient-to-br from-indigo-500 to-purple-500',
                i % 4 === 2 && 'bg-gradient-to-br from-amber-500 to-orange-500',
                i % 4 === 3 && 'bg-gradient-to-br from-sky-500 to-cyan-500',
              )}
            >
              {(emp.firstName?.charAt(0) ?? '').toUpperCase()}
              {(emp.lastName?.charAt(0) ?? '').toUpperCase()}
            </div>
          ))}
          {batch._count.employees > 5 && (
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-slate-500 bg-slate-100 ring-2 ring-white/80">
              +{batch._count.employees - 5}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};
