import React from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  isUp: boolean;
  icon: React.ReactNode;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, isUp, icon, color }) => {
  return (
    <div className="glass-card p-6 flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ring-1",
          isUp 
            ? "bg-brand-50 text-emerald-700 ring-emerald-500/20" 
            : "bg-rose-50 text-rose-700 ring-rose-500/20"
        )}>
          {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <h4 className={cn("text-2xl font-bold mt-1 tracking-tight font-mono", color || "text-slate-900")}>{value}</h4>
      </div>
    </div>
  );
};

export const DashboardStats: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard 
        title="Total Payroll" 
        value="ETB 1,245,000" 
        trend="+12.5%" 
        isUp={true} 
        icon={<DollarSign className="w-5 h-5" />} 
      />
      <StatCard 
        title="Total Employees" 
        value="156" 
        trend="+4" 
        isUp={true} 
        icon={<Users className="w-5 h-5" />} 
      />
      <StatCard 
        title="Average Salary" 
        value="ETB 8,500" 
        trend="-2.1%" 
        isUp={false} 
        icon={<TrendingUp className="w-5 h-5" />} 
      />
      <StatCard 
        title="Pending Approvals" 
        value="12" 
        trend="Due in 2 days" 
        isUp={false} 
        color="text-amber-600"
        icon={<Clock className="w-5 h-5" />} 
      />
    </div>
  );
};
