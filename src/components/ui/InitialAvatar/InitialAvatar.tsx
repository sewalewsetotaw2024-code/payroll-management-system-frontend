import React from 'react';
import { cn } from '../../../lib/utils';

interface InitialAvatarProps {
  firstName: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'emerald' | 'indigo' | 'amber' | 'slate';
  className?: string;
}

const sizeMap = {
  sm: 'w-7 h-7 text-[10px] rounded-lg',
  md: 'w-8 h-8 text-[11px] rounded-lg',
  lg: 'w-9 h-9 text-[13px] rounded-xl',
  xl: 'w-[52px] h-[52px] text-[22px] rounded-xl',
};

const variantMap = {
  emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  indigo: 'bg-gradient-to-br from-indigo-500 to-purple-500',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-500',
  slate: 'bg-gradient-to-br from-slate-400 to-slate-500',
};

export const InitialAvatar: React.FC<InitialAvatarProps> = ({
  firstName,
  lastName,
  size = 'md',
  variant = 'emerald',
  className,
}) => {
  const initial = (firstName?.charAt(0) ?? '').toUpperCase();
  const second = (lastName?.charAt(0) ?? '').toUpperCase();
  return (
    <div
      className={cn(
        'flex items-center justify-center text-white font-bold shrink-0',
        sizeMap[size],
        variantMap[variant],
        className,
      )}
    >
      {initial}{second}
    </div>
  );
};
