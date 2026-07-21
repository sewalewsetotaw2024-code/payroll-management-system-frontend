import React, { useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Info,
  Calendar,
  FileText,
  Users,
  Settings
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  notificationActions,
  selectAllNotifications,
  selectUnreadCount,
} from '../../notifications/store/notificationSlice';
import type { Notification } from '../../../api/notifications';

interface RecentNotificationsProps {
  onViewAll?: () => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getCategoryIcon(category: Notification['category']) {
  switch (category) {
    case 'attendance': return <Calendar className="w-4 h-4" />;
    case 'payroll': return <FileText className="w-4 h-4" />;
    case 'payslip': return <Users className="w-4 h-4" />;
    case 'approval': return <CheckCircle2 className="w-4 h-4" />;
    case 'system': return <Settings className="w-4 h-4" />;
    default: return <Bell className="w-4 h-4" />;
  }
}

function getCategoryColor(category: Notification['category']) {
  switch (category) {
    case 'attendance': return 'bg-blue-100 text-blue-600';
    case 'payroll': return 'bg-emerald-100 text-emerald-600';
    case 'payslip': return 'bg-purple-100 text-purple-600';
    case 'approval': return 'bg-amber-100 text-amber-600';
    case 'system': return 'bg-slate-100 text-slate-600';
    default: return 'bg-slate-100 text-slate-600';
  }
}

export const RecentNotifications: React.FC<RecentNotificationsProps> = ({ onViewAll }) => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectAllNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);

  useEffect(() => {
    dispatch(notificationActions.fetchNotificationsRequest());
  }, [dispatch]);

  const recentNotifications = notifications.slice(0, 4);

  return (
    <div className="glass-card p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-slate-800">Recent Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={() => dispatch(notificationActions.markAllAsRead())}
            className="text-xs text-emerald-600 font-bold hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>
      
      {recentNotifications.length > 0 ? (
        <div className="space-y-4">
          {recentNotifications.map((notification) => (
            <div 
              key={notification.id}
              onClick={() => {
                if (!notification.read) {
                  dispatch(notificationActions.markAsRead(notification.id));
                }
              }}
              className={cn(
                "flex gap-3 p-3 rounded-xl transition-all cursor-pointer group",
                !notification.read ? "bg-brand-50/50" : "hover:bg-slate-50"
              )}
            >
              <div className={cn(
                "w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
                getCategoryColor(notification.category)
              )}>
                {getCategoryIcon(notification.category)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className={cn(
                    "text-sm leading-tight",
                    !notification.read ? "font-bold text-slate-900" : "font-medium text-slate-700"
                  )}>
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 mt-1.5" />
                  )}
                </div>
                {notification.message && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{notification.message}</p>
                )}
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1.5">
                  {relativeTime(notification.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm text-slate-400 font-medium">No notifications yet</p>
        </div>
      )}
      
      <button 
        onClick={onViewAll}
        className="w-full bg-slate-50 mt-6 py-2.5 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-brand-50 hover:border-brand-100 hover:text-emerald-700 transition-colors"
      >
        View All Notifications
      </button>
    </div>
  );
};
