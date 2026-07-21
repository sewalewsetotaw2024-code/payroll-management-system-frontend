import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Info, 
  Trash2,
  Check,
  Filter,
  RefreshCw,
  Calendar,
  FileText,
  Users,
  Settings
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  notificationActions,
  selectAllNotifications,
  selectUnreadCount,
  selectNotificationsLoading,
  selectNotificationsError,
} from '../store/notificationSlice';
import type { Notification } from '../../../api/notifications';

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

function getTypeIndicator(type: string) {
  switch (type) {
    case 'urgent': return <span className="w-2 h-2 bg-rose-500 rounded-full shrink-0" />;
    case 'success': return <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />;
    case 'warning': return <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0" />;
    default: return null;
  }
}

type FilterType = 'All' | 'Unread' | 'Urgent';

// ── Component ────────────────────────────────────────────────────────────────

export const NotificationsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectAllNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const loading = useAppSelector(selectNotificationsLoading);
  const error = useAppSelector(selectNotificationsError);

  const [filter, setFilter] = useState<FilterType>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  // Fetch notifications on mount
  useEffect(() => {
    dispatch(notificationActions.fetchNotificationsRequest());
    dispatch(notificationActions.fetchUnreadCountRequest());
  }, [dispatch]);

  const categories = useMemo(
    () => ['All', ...new Set(notifications.map(n => n.category))],
    [notifications],
  );

  const filteredNotifications = useMemo(
    () => notifications.filter((notification: Notification) => {
      let statusMatch = true;
      if (filter === 'Unread') statusMatch = !notification.read;
      else if (filter === 'Urgent') statusMatch = notification.type === 'urgent';
      const categoryMatch = categoryFilter === 'All' ? true : notification.category === categoryFilter;
      return statusMatch && categoryMatch;
    }),
    [notifications, filter, categoryFilter],
  );

  const handleMarkAllAsRead = () => dispatch(notificationActions.markAllAsRead());
  const handleMarkAsRead = (id: string) => dispatch(notificationActions.markAsRead(id));
  const handleDelete = (id: string) => dispatch(notificationActions.removeNotification(id));
  const handleRefresh = () => {
    dispatch(notificationActions.fetchNotificationsRequest());
    dispatch(notificationActions.fetchUnreadCountRequest());
  };

  const stats = useMemo(() => ({
    total: notifications.length,
    unread: unreadCount,
    urgent: notifications.filter(n => n.type === 'urgent').length,
  }), [notifications, unreadCount]);

  return (
    <div className="space-y-6 pb-10 max-w-5xl mx-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 border border-white bg-white/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <Bell className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 border border-white bg-white/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unread</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.unread}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 border border-white bg-white/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgent</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{stats.urgent}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">Stay updated with payroll activities and system alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
          </button>
          <button 
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Mark all read
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className={cn(
                "px-4 py-2.5 text-sm font-bold border rounded-xl transition-all flex items-center gap-2 shadow-sm active:scale-95",
                categoryFilter !== 'All' 
                  ? "bg-brand-50 border-brand-200 text-emerald-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <Filter className="w-4 h-4" /> {categoryFilter === 'All' ? 'Filter' : categoryFilter}
            </button>

            {showCategoryMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCategoryMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in duration-150 origin-top-right">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategoryFilter(cat);
                        setShowCategoryMenu(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-sm font-bold transition-colors capitalize",
                        categoryFilter === cat ? "text-emerald-700 bg-brand-50" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/50">
        {(['All', 'Unread', 'Urgent'] as FilterType[]).map((tab) => (
          <button 
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "px-6 py-2.5 text-sm font-bold rounded-xl transition-all",
              filter === tab 
                ? "bg-white text-emerald-700 shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            {tab}
            {tab === 'Unread' && unreadCount > 0 && (
               <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full font-black">
                 {unreadCount}
               </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-medium">
            Failed to load notifications: {error}
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                onClick={() => handleMarkAsRead(notification.id)}
                className={cn(
                  "p-5 rounded-2xl border transition-all flex items-start gap-4 relative group cursor-pointer",
                  notification.read 
                    ? "bg-white border-slate-100" 
                    : "bg-brand-50/30 border-brand-100 shadow-sm"
                )}
              >
                {/* Category Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  getCategoryColor(notification.category)
                )}>
                  {getCategoryIcon(notification.category)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {notification.category}
                        </span>
                        {getTypeIndicator(notification.type)}
                        {!notification.read && (
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        )}
                      </div>
                      <h3 className={cn(
                        "text-slate-900 leading-snug",
                        !notification.read ? "font-bold text-[15px]" : "font-semibold text-sm"
                      )}>
                        {notification.title}
                      </h3>
                      {notification.message && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                        {relativeTime(notification.createdAt)}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-bold text-slate-700">No notifications found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Settings */}
      <div className="p-8 bg-gradient-to-br from-primary via-primary to-brand-800 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-xl shadow-brand-900/30">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full"></div>
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
             <Settings className="w-7 h-7" />
          </div>
          <div>
            <h4 className="font-bold text-lg">Notification Settings</h4>
            <p className="text-white/70 text-sm mt-1">Configure your notification preferences</p>
          </div>
        </div>
        <button className="px-6 py-3 bg-white text-primary font-bold rounded-xl hover:bg-brand-50 transition-all active:scale-95 shadow-lg whitespace-nowrap">
           Manage Settings
        </button>
      </div>
    </div>
  );
};
