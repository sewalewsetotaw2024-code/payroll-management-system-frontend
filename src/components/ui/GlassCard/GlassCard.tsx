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
        'glass rounded-3xl transition-all duration-300',
        paddingMap[padding],
        isInteractive && 'hover:bg-white/90 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-primary/20 focus-visible:outline-none',
        className,
      )}
    >
      {children}
    </Component>
  );
};
