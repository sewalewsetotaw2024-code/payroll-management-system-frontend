import React from 'react';
import { cn } from '../../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, noPadding }) => {
  return (
    <div className={cn(
      "bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden",
      !noPadding && "p-8",
      className
    )}>
      {children}
    </div>
  );
};
