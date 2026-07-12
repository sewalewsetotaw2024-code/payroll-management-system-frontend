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
    <div className="glass-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-700">
          {icon}
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
          isUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
        )}>
          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <h4 className={cn("text-2xl font-bold mt-1", color || "text-slate-900")}>{value}</h4>
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
