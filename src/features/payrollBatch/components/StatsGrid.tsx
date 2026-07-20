import React from 'react';
import { Users, Package, CalendarRange, UserX } from 'lucide-react';

interface StatsGridProps {
  activeBatches: number;
  totalEmployees: number;
  employeesInBatches: number;
  unassigned: number;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  activeBatches,
  totalEmployees,
  employeesInBatches,
  unassigned,
}) => {
  const stats = [
    {
      icon: <Users className="w-5 h-5" />,
      iconBg: 'bg-blue-50 text-blue-600',
      value: activeBatches,
      label: 'Active Batches',
    },
    {
      icon: <Package className="w-5 h-5" />,
      iconBg: 'bg-brand-50 text-emerald-600',
      value: totalEmployees,
      label: 'Total Employees',
    },
    {
      icon: <CalendarRange className="w-5 h-5" />,
      iconBg: 'bg-amber-50 text-amber-600',
      value: employeesInBatches,
      label: 'Employees in Batches',
    },
    {
      icon: <UserX className="w-5 h-5" />,
      iconBg: 'bg-red-50 text-red-500',
      value: unassigned,
      label: 'Unassigned',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-white rounded-xl p-5 shadow-sm border border-slate-100/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4"
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.iconBg}`}>
            {stat.icon}
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums leading-none mb-1">
              {stat.value}
            </div>
            <div className="text-xs font-medium text-slate-500">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
