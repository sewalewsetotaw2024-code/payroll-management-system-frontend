import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-10">
      <div className="flex items-center gap-4 text-sm pl-14 sm:pl-0">
        <span className="text-slate-400">Home</span>
        <span className="text-slate-300">/</span>
        <span className="font-medium capitalize text-slate-800">{activeTab.replace('-', ' ')} Panel</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search module..."
            className="pl-10 pr-4 py-1.5 bg-slate-100 border-none rounded-full text-xs w-36 sm:w-48 lg:w-64 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-[#047857] rounded-full uppercase tracking-tight">FY 2026 ACTIVE</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              "relative p-2 rounded-xl transition-all",
              showNotifications ? "bg-emerald-50 text-emerald-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            )}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h4 className="font-bold text-slate-800">Notifications</h4>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">3 New</span>
                </div>
                <div className="max-h-96 overflow-y-auto py-2">
                  <NotificationPreview
                    title="Payroll Processed"
                    time="2h ago"
                    type="success"
                  />
                  <NotificationPreview
                    title="Approval Needed"
                    time="5h ago"
                    type="urgent"
                  />
                  <NotificationPreview
                    title="System Update"
                    time="1d ago"
                    type="info"
                  />
                </div>
                <button
                  onClick={() => {
                    navigate('/notifications');
                    setShowNotifications(false);
                  }}
                  className="w-full p-4 text-xs font-bold text-center text-emerald-600 hover:bg-emerald-50 transition-colors border-t border-slate-100 flex items-center justify-center gap-2"
                >
                  View All Notifications <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

const NotificationPreview = ({ title, time, type }: { title: string, time: string, type: 'success' | 'urgent' | 'info' }) => (
  <div className="px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3">
    <div className={cn(
      "w-2 h-2 rounded-full mt-1.5 shrink-0",
      type === 'success' ? "bg-emerald-500" :
      type === 'urgent' ? "bg-rose-500" : "bg-blue-500"
    )}></div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-800 truncate">{title}</p>
      <p className="text-[10px] text-slate-400 font-medium">{time}</p>
    </div>
  </div>
);
