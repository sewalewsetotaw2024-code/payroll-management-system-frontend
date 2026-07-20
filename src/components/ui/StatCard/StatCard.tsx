import React from 'react';
import { cn } from '../../../lib/utils';
import { GlassCard } from '../GlassCard';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    direction: 'up' | 'down';
    value: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning';
  className?: string;
}

const variantBorderMap = {
  default: 'border-slate-200',
  primary: 'border-indigo-200',
  success: 'border-brand-200',
  warning: 'border-amber-200',
};

const variantAccentMap = {
  default: 'bg-slate-200',
  primary: 'bg-indigo-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
};

const iconContainerMap = {
  default: 'bg-slate-100 text-slate-600',
  primary: 'bg-indigo-50 text-indigo-600',
  success: 'bg-brand-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
};

const trendColorMap = {
  up: 'text-emerald-600',
  down: 'text-rose-500',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  variant = 'default',
  className,
}) => {
  return (
    <GlassCard className={cn('relative overflow-hidden', className)}>
      {/* Top accent line */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-[3px]',
          variantAccentMap[variant],
        )}
      />

      <div className="flex items-start justify-between pt-1">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  'text-xs font-medium',
                  trendColorMap[trend.direction],
                )}
              >
                {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-xs text-slate-400">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
              iconContainerMap[variant],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
