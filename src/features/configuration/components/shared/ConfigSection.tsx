import React, { ReactNode } from 'react';
import { motion } from 'motion/react';

interface ConfigSectionProps {
  id: string;
  title: ReactNode;
  description: ReactNode;
  showBadge?: boolean;
  badgeText?: string;
  actionButton?: ReactNode;
  children: ReactNode;
}

/**
 * ConfigSection component with animated header, badge, and optional action button.
 * Wraps configuration feature content in a standardized collapsible section layout.
 *
 * @param props - Component props including id, title, description, badge, action, and children.
 * @returns A configuration section layout wrapper.
 */
export const ConfigSection: React.FC<ConfigSectionProps> = ({
  id,
  title,
  description,
  showBadge = false,
  badgeText = 'Active System',
  actionButton,
  children,
}) => (
  <motion.div
    key={id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-6"
  >
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        {showBadge && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider shrink-0 border border-emerald-100/50 self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {badgeText}
          </span>
        )}
      </div>
      {actionButton}
    </header>
    {children}
  </motion.div>
);
