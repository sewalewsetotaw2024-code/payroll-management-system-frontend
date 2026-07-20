import React from 'react';
import { cn } from '../../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  ...props
}) => {
  const variants = {
    primary: "bg-brand-primary text-white hover:bg-brand-dark border-2 border-brand-800/30 shadow-lg shadow-brand-900/10",
    secondary: "glass text-brand-primary hover:bg-white/80 border-2 border-brand-200 shadow-md",
    outline: "border-2 border-slate-200 text-slate-600 hover:bg-white/50 backdrop-blur-sm hover:border-slate-300",
    ghost: "text-slate-600 hover:bg-white/30 backdrop-blur-sm",
    danger: "bg-rose-500 text-white hover:bg-rose-600 border-2 border-rose-600/30 shadow-lg shadow-rose-900/10",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-7 py-3 text-sm",
    lg: "px-9 py-4 text-base",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none gap-2",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
};
