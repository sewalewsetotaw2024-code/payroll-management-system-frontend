import React, { ReactNode } from 'react';

interface ConfigEmptyStateProps {
  icon: ReactNode;
  title: string;
  message: string;
}

/**
 * ConfigEmptyState component for displaying an empty state placeholder.
 * Renders an icon, title, and message when no configuration data exists.
 *
 * @param props - Component props containing icon, title, and message.
 * @returns An empty state UI element.
 */
export const ConfigEmptyState: React.FC<ConfigEmptyStateProps> = ({ icon, title, message }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-dashed border-slate-200 rounded-[32px]">
    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
      {icon}
    </div>
    <h4 className="text-base font-bold text-slate-900">{title}</h4>
    <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">{message}</p>
  </div>
);
