import React from 'react';
import { cn } from '../../../lib/utils';

interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Toggle component with label and optional helper text.
 * Renders a styled switch for boolean input values.
 */
export const Toggle: React.FC<ToggleProps> = ({
  label,
  checked,
  onChange,
  helperText,
  disabled = false,
  className,
}) => {
  const id = label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-3">
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:ring-offset-2',
            checked ? 'bg-emerald-500' : 'bg-slate-200',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
              checked ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
        {label && (
          <label htmlFor={id} className="text-sm font-bold text-slate-700 cursor-pointer select-none">
            {label}
          </label>
        )}
      </div>
      {helperText && (
        <p className="text-xs text-slate-400 ml-14">{helperText}</p>
      )}
    </div>
  );
};
