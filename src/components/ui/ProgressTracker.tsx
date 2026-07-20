import React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface ProgressStep {
  label: string;
  status: 'completed' | 'active' | 'pending';
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
  className?: string;
}

/** 4-step progress indicator for the Attendance Summary section.
 *  Shows import → summary → OT → submit flow.
 *  Each step shows its status icon + label. */
export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ steps, className }) => {
  return (
    <div className={cn("flex items-center gap-0 w-full", className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;

        return (
          <React.Fragment key={i}>
            {/* Step indicator */}
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all text-xs font-bold",
                  step.status === 'completed' && "bg-emerald-500 text-white",
                  step.status === 'active' && "bg-brand-100 text-emerald-700 border-2 border-brand-500",
                  step.status === 'pending' && "bg-slate-100 text-slate-400 border border-slate-200",
                )}
              >
                {step.status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap transition-colors",
                  step.status === 'completed' && "text-emerald-600",
                  step.status === 'active' && "text-emerald-700",
                  step.status === 'pending' && "text-slate-400",
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 rounded-full transition-colors",
                  step.status === 'completed' ? "bg-emerald-400" : "bg-slate-200",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
