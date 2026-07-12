import React from 'react';
import { cn } from '../../../lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  as?: 'div' | 'button';
  onClick?: () => void;
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  padding = 'md',
  hover = false,
  as: Component = 'div',
  onClick,
}) => {
  const isInteractive = hover || !!onClick;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Component
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={Component === 'div' && onClick ? 'button' : undefined}
      tabIndex={Component === 'div' && onClick ? 0 : undefined}
      className={cn(
        'bg-white/80 backdrop-blur-lg border border-slate-200 shadow-sm transition-colors duration-200',
        paddingMap[padding],
        isInteractive && 'hover:border-slate-300 hover:shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2',
        'rounded-xl',
        className,
      )}
    >
      {children}
    </Component>
  );
};
