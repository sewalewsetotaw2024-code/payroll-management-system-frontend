import React from 'react';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Info 
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface RecentNotificationsProps {
  onViewAll?: () => void;
}

const NOTIFICATIONS = [
  { 
    title: 'March payroll pending approval', 
    subtitle: 'Due in 2 days', 
    time: '2 hours ago', 
    icon: Clock, 
    color: 'text-amber-500', 
    bg: 'bg-amber-50' 
  },
  { 
    title: '3 employees with tax calculation errors', 
    subtitle: 'Critical attention required', 
    time: '4 hours ago', 
    icon: AlertCircle, 
    color: 'text-rose-500', 
    bg: 'bg-rose-50' 
  },
  { 
    title: 'Pension report submitted to POESSA', 
    subtitle: 'Reference #ETH-9928-P', 
    time: '1 day ago', 
    icon: CheckCircle2, 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-50' 
  },
  { 
    title: 'Bonus distribution completed for Q1', 
    subtitle: 'All eligible staff processed', 
    time: '2 days ago', 
    icon: Info, 
    color: 'text-sky-500', 
    bg: 'bg-sky-50' 
  }
];

export const RecentNotifications: React.FC<RecentNotificationsProps> = ({ onViewAll }) => {
  return (
    <div className="glass-card p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800">Recent Notifications</h3>
        <button className="text-xs text-emerald-600 font-semibold hover:underline">Mark all as read</button>
      </div>
      <div className="space-y-6">
        {NOTIFICATIONS.map((notification, i) => (
          <div key={i} className="flex gap-4 group cursor-pointer">
            <div className={cn(
              "w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
              notification.bg,
              notification.color
            )}>
              <notification.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm font-semibold text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">
                  {notification.title}
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-1">{notification.subtitle}</p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-2">{notification.time}</p>
            </div>
          </div>
        ))}
      </div>
      <button 
        onClick={onViewAll}
        className="w-full bg-slate-50 mt-8 py-2.5 border border-slate-100 rounded-xl text-sm font-semibold text-slate-600 hover:bg-[#ECFDF5] transition-colors"
      >
        View All Notifications
      </button>
    </div>
  );
};
