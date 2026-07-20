import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bell, Search, ExternalLink, User } from 'lucide-react';
import { cn } from '../lib/utils';
import type { AuthUser } from '../features/auth/types/auth.types';

interface HeaderProps {
  activeTab: string;
  user?: AuthUser | null;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, user }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  const userName = user?.employee?.full_name || "Guest User";
  const userRole = user?.role?.name || "Member";
  const userInitials = user?.employee?.full_name
    ? user.employee.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : "GU";

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
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "relative p-3 rounded-2xl transition-all",
                showNotifications ? "bg-brand-primary text-white shadow-lg shadow-brand-900/20" : "glass text-slate-500 hover:text-brand-primary hover:bg-white"
              )}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white ring-2 ring-rose-500/20 animate-pulse"></span>
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                ></div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute right-0 mt-4 w-80 glass rounded-3xl shadow-2xl z-50 overflow-hidden origin-top-right border border-white"
                >
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md">
                    <h4 className="font-bold text-slate-900">Notifications</h4>
                    <span className="text-[10px] font-bold bg-brand-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wider">3 New</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto py-2 custom-scrollbar">
                    <NotificationPreview
                      title="Payroll Processed"
                      time="2h ago"
                      type="success"
                      message="Monthly payroll for March has been cleared."
                    />
                    <NotificationPreview
                      title="Approval Needed"
                      time="5h ago"
                      type="urgent"
                      message="5 leaves require your immediate attention."
                    />
                    <NotificationPreview
                      title="System Update"
                      time="1d ago"
                      type="info"
                      message="New compliance features are now live."
                    />
                  </div>
                  <button
                    onClick={() => {
                      navigate('/notifications');
                      setShowNotifications(false);
                    }}
                    className="w-full p-5 text-sm font-bold text-center text-brand-primary hover:bg-brand-50 transition-colors border-t border-slate-100 flex items-center justify-center gap-2"
                  >
                    View All Activity <ExternalLink className="w-4 h-4" />
                  </button>
                </motion.div>
              </>
            )}
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

const NotificationPreview = ({ title, time, type, message }: { title: string, time: string, type: 'success' | 'urgent' | 'info', message: string }) => (
  <div className="px-6 py-4 hover:bg-brand-50/50 transition-colors cursor-pointer flex items-start gap-4 border-b border-slate-50 last:border-none">
    <div className={cn(
      "w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 shadow-sm",
      type === 'success' ? "bg-emerald-500 shadow-brand-500/20" :
      type === 'urgent' ? "bg-rose-500 shadow-rose-500/20" : "bg-blue-500 shadow-blue-500/20"
    )}></div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-sm font-bold text-slate-900 truncate">{title}</p>
        <p className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{time}</p>
      </div>
      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{message}</p>
    </div>
  </div>
);
