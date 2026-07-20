import React from "react";
import { cn } from "../../../lib/utils";
import type { StatCardProps } from "../../../types/ui.types";
import { GlassCard } from "../../../components/ui";

/**
 * StatCard component for the Approval Workflow feature.
 * Redesigned to follow the 'Emerald Ledger' direction with glassmorphism and mono fonts.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  subColor,
  icon: Icon,
  iconColor,
}) => (
  <GlassCard className="p-6 ledger-border hover:shadow-ledger transition-all group overflow-hidden border-none shadow-glass">
    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-slate-50/50 group-hover:scale-110 transition-transform duration-500" />
    
    <div className="flex items-start justify-between mb-5 relative z-10">
      <div className={cn(
        "w-11 h-11 rounded-2xl flex items-center justify-center transition-all group-hover:rotate-6 shadow-sm",
        "bg-white border border-slate-100"
      )}>
        <Icon className={cn("w-5.5 h-5.5", iconColor || 'text-brand-primary')} />
      </div>
    </div>

    <div className="flex items-baseline gap-1 relative z-10">
      <p className="text-3xl font-black text-slate-900 tracking-tighter mono-value">
        {value}
      </p>
    </div>

    <div className="mt-2 relative z-10 flex items-center justify-between gap-2">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] truncate">
        {label}
      </p>
      {subValue && (
        <span className={cn(
          "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-inner",
          subColor || 'bg-slate-100 text-slate-500'
        )}>
          {subValue}
        </span>
      )}
    </div>
  </GlassCard>
);
