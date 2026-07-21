import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Search, ExternalLink, CheckCircle2, AlertCircle, Clock, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  notificationActions,
  selectAllNotifications,
  selectUnreadCount,
} from '../features/notifications/store/notificationSlice';
import type { Notification } from '../api/notifications';
import type { AuthUser } from '../features/auth/types/auth.types';

interface HeaderProps {
  activeTab: string;
  user?: AuthUser | null;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getNotificationIcon(category: Notification['category'], type: string) {
  if (type === 'urgent') return <AlertCircle className="w-4 h-4" />;
  if (type === 'success') return <CheckCircle2 className="w-4 h-4" />;
  if (type === 'warning') return <Clock className="w-4 h-4" />;
  return <Info className="w-4 h-4" />;
}

function getNotificationColor(category: Notification['category'], type: string) {
  if (type === 'urgent') return 'bg-rose-100 text-rose-600';
  if (type === 'success') return 'bg-emerald-100 text-emerald-600';
  if (type === 'warning') return 'bg-amber-100 text-amber-600';
  if (category === 'attendance') return 'bg-blue-100 text-blue-600';
  if (category === 'payroll') return 'bg-brand-100 text-emerald-600';
  return 'bg-slate-100 text-slate-600';
}

export const Header: React.FC<HeaderProps> = ({ activeTab, user }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectAllNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications on mount and when dropdown opens
  useEffect(() => {
    dispatch(notificationActions.fetchUnreadCountRequest());
    dispatch(notificationActions.fetchNotificationsRequest());
  }, [dispatch]);

  useEffect(() => {
    if (showNotifications) {
      dispatch(notificationActions.fetchNotificationsRequest());
    }
  }, [showNotifications, dispatch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  const userName = user?.employee?.full_name || "Guest User";
  const userRole = user?.role?.name || "Member";
  const userInitials = user?.employee?.full_name
    ? user.employee.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : "GU";

  const recentNotifications = notifications.slice(0, 5);
  const hasUnread = unreadCount > 0;

  return (
    <header className="h-20 bg-transparent flex items-center justify-between px-6 sm:px-8 shrink-0 z-10">
      <div className="flex items-center gap-6 pl-12 lg:pl-0">
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-400">
          <span>Home</span>
          <span className="text-slate-200">/</span>
          <span className="text-brand-primary">{activeTab.replace('-', ' ')}</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight hidden lg:block">
          {activeTab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </h2>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <div className="relative group hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-brand-primary" />
          <input
            type="text"
            placeholder="Search everything..."
            className="pl-12 pr-6 py-2.5 glass border-none rounded-2xl text-sm w-48 lg:w-80 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "relative p-3 rounded-2xl transition-all",
                showNotifications ? "bg-brand-primary text-white shadow-lg shadow-brand-900/20" : "glass text-slate-500 hover:text-brand-primary hover:bg-white"
              )}
            >
              <Bell className="w-5 h-5" />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3 w-96 glass rounded-3xl shadow-2xl z-50 overflow-hidden origin-top-right border border-white"
                >
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-slate-900">Notifications</h4>
                      {hasUnread && (
                        <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {hasUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(notificationActions.markAllAsRead());
                        }}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-[400px] overflow-y-auto">
                    {recentNotifications.length > 0 ? (
                      recentNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => {
                            if (!notification.read) {
                              dispatch(notificationActions.markAsRead(notification.id));
                            }
                            if (notification.link) {
                              navigate(notification.link);
                            }
                            setShowNotifications(false);
                          }}
                          className={cn(
                            "px-5 py-4 hover:bg-brand-50/50 transition-colors cursor-pointer flex items-start gap-3 border-b border-slate-50 last:border-none",
                            !notification.read && "bg-brand-50/20"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                            getNotificationColor(notification.category, notification.type)
                          )}>
                            {getNotificationIcon(notification.category, notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={cn(
                                "text-sm truncate",
                                !notification.read ? "font-bold text-slate-900" : "font-medium text-slate-700"
                              )}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
                              )}
                            </div>
                            {notification.message && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{notification.message}</p>
                            )}
                            <p className="text-[10px] text-slate-400 font-medium mt-1">{relativeTime(notification.createdAt)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-400 font-medium">No notifications yet</p>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      navigate('/notifications');
                      setShowNotifications(false);
                    }}
                    className="w-full p-4 text-sm font-bold text-center text-brand-primary hover:bg-brand-50 transition-colors border-t border-slate-100 flex items-center justify-center gap-2"
                  >
                    View all notifications <ExternalLink className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button className="flex items-center gap-2 p-1.5 glass rounded-2xl hover:bg-white transition-all group">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
              {userInitials}
            </div>
            <div className="pr-2 hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-none">{userName}</p>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-1 capitalize">{userRole.toLowerCase()}</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
