import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Info, 
  Settings, 
  Trash2,
  Check,
  MoreVertical,
  Filter
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  notificationActions,
  selectAllNotifications,
  selectUnreadCount,
} from '../store/notificationSlice';
import type { AppNotification } from '../store/notificationSlice';

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

function getTypeIcon(type: AppNotification['type']) {
  switch (type) {
    case 'success': return <CheckCircle2 className="w-6 h-6" />;
    case 'urgent': return <AlertCircle className="w-6 h-6" />;
    case 'warning': return <Clock className="w-6 h-6" />;
    default: return <Info className="w-6 h-6" />;
  }
}

type FilterType = 'All' | 'Unread' | 'Urgent';

// ── Component ────────────────────────────────────────────────────────────────

export const NotificationsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectAllNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);

  const [filter, setFilter] = useState<FilterType>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  const categories = useMemo(
    () => ['All', ...new Set(notifications.map(n => n.category))],
    [notifications],
  );

  const filteredNotifications = useMemo(
    () => notifications.filter(notification => {
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

  return (
    <div className="space-y-8 pb-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600" /> Notifications
          </h1>
          <p className="text-slate-500 text-sm">Stay updated with payroll activities and system alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm active:scale-95"
          >
            <Check className="w-4 h-4" /> Mark all as read
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className={cn(
                "px-4 py-2 text-sm font-bold border rounded-xl transition-all flex items-center gap-2 shadow-sm active:scale-95",
                categoryFilter !== 'All' 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
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
                        "w-full px-4 py-2 text-left text-sm font-bold transition-colors",
                        categoryFilter === cat ? "text-emerald-700 bg-emerald-50" : "text-slate-600 hover:bg-slate-50"
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
      <div className="flex items-center gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit border border-slate-200">
        {(['All', 'Unread', 'Urgent'] as FilterType[]).map((tab) => (
          <button 
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "px-6 py-2 text-sm font-bold rounded-xl transition-all",
              filter === tab 
                ? "bg-white text-emerald-700 shadow-sm border border-slate-100" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            {tab}
            {tab === 'Unread' && unreadCount > 0 && (
               <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full">
                 {unreadCount}
               </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleMarkAsRead(notification.id)}
                className={cn(
                  "p-6 rounded-3xl border transition-all flex items-start gap-5 relative group cursor-pointer bg-white",
                  notification.read ? "border-slate-100" : "border-emerald-100 bg-emerald-50/10 shadow-sm",
                  !notification.read && "after:content-[''] after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:w-1 after:h-12 after:bg-emerald-500 after:rounded-r-full"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  notification.type === 'success' ? "bg-emerald-100 text-emerald-600" :
                  notification.type === 'urgent' ? "bg-rose-100 text-rose-600" :
                  notification.type === 'warning' ? "bg-amber-100 text-amber-600" :
                  "bg-blue-100 text-blue-600"
                )}>
                  {getTypeIcon(notification.type)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {notification.category}
                      </span>
                      {!notification.read && (
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {relativeTime(notification.createdAt)}
                    </span>
                  </div>
                  <h3 className={cn("text-slate-900 font-bold", !notification.read ? "text-lg" : "text-base")}>
                    {notification.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">
                    {notification.message}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors md:opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center space-y-4 bg-white border border-dashed border-slate-200 rounded-[2.5rem]"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Bell className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-slate-900">No notifications found</p>
                <p className="text-sm text-slate-400">Try changing your filter settings</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Load More */}
      <div className="text-center pt-4">
        <button className="text-sm font-bold text-slate-400 hover:text-emerald-600 transition-colors leading-relaxed tracking-wide">
          View older notifications
        </button>
      </div>

      {/* Quick Settings */}
      <div className="p-8 bg-[#047857] rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 mt-12 relative overflow-hidden shadow-2xl shadow-emerald-900/40">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full"></div>
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-white shadow-inner">
             <Settings className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-bold text-xl">Notification Settings</h4>
            <p className="text-emerald-100 text-sm mt-1 opacity-90 leading-snug">Configure your email and system alert preferences</p>
          </div>
        </div>
        <button className="px-8 py-3 bg-white text-[#047857] font-bold rounded-2xl hover:bg-emerald-50 transition-all active:scale-95 shadow-lg shadow-black/5 whitespace-nowrap">
           Manage Alerts
        </button>
      </div>
    </div>
  );
};
