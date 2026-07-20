import React from 'react';
import { cn } from '../../../lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/** Color tokens shared across status categories */
const BADGE_SUCCESS = 'bg-brand-50 text-emerald-700';
const BADGE_WARNING = 'bg-amber-50 text-amber-700';
const BADGE_DANGER = 'bg-rose-50 text-rose-700';
const BADGE_NEUTRAL = 'bg-slate-100 text-slate-600';
const BADGE_MUTED = 'bg-slate-50 text-slate-400';

/**
 * Maps domain statuses (UPPER_SNAKE for lifecycle, PascalCase for attendance)
 * to their corresponding badge colour tokens.
 */
const STATUS_STYLES: Record<string, string> = {
  ACTIVE: BADGE_SUCCESS,
  DRAFT: BADGE_NEUTRAL,
  CLOSED: BADGE_WARNING,
  ARCHIVED: BADGE_MUTED,
  Present: BADGE_SUCCESS,
  Partial: BADGE_WARNING,
  Absent: BADGE_DANGER,
  APPROVED: BADGE_SUCCESS,
  PENDING: BADGE_WARNING,
  REJECTED: BADGE_DANGER,
  OPEN: BADGE_SUCCESS,
};

/**
 * Renders a colored pill badge for a given status string.
 * Supports attendance, approval, and employee lifecycle statuses.
 * Falls back to a neutral DRAFT style for unrecognised statuses.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const style = STATUS_STYLES[status] ?? BADGE_NEUTRAL;
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase',
        style,
        className,
      )}
    >
      {status}
    </span>
  );
};
