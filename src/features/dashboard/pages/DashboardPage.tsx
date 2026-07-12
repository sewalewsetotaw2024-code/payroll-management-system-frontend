import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar,
  Loader2
} from 'lucide-react';
import { cn } from '../../../lib/utils';

// Sub-components
import { DashboardStats } from '../components/DashboardStats';
import { ProcessingToast } from '../components/ProcessingToast';
import { PayrollTrendsChart, TaxDistributionChart, DeptCostChart } from '../components/DashboardCharts';
import { RecentNotifications } from '../components/RecentNotifications';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('May');
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const handleProcessPayroll = () => {
    setProcessingStatus('processing');
    setTimeout(() => {
      setProcessingStatus('success');
      setTimeout(() => setProcessingStatus('idle'), 3000);
    }, 2500);
  };

  return (
    <div className="space-y-8 relative">
      {/* Toast Feedback */}
      <ProcessingToast 
        status={processingStatus} 
        onClose={() => setProcessingStatus('idle')} 
      />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 text-shadow-sm">Dashboard Overview</h1>
          <p className="text-slate-500">Welcome back. Here's what's happening with your payroll today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card flex items-center gap-2 pr-2 pl-4 py-1 text-sm text-slate-600 bg-white/80">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-semibold border-none focus:ring-0 cursor-pointer py-1"
            >
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <option key={m} value={m.substring(0, 3)}>{m} 2026</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleProcessPayroll}
            disabled={processingStatus !== 'idle'}
            className={cn(
              "btn-primary transition-all active:scale-95",
              processingStatus !== 'idle' && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            {processingStatus === 'processing' ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </span>
            ) : "Process Payroll"}
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <DashboardStats />

      {/* First two charts together */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <PayrollTrendsChart />
        </div>
        <div>
          <TaxDistributionChart />
        </div>
      </div>

      {/* Third chart and notifications together */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="lg:col-span-2">
          <DeptCostChart />
        </div>
        <div className="lg:col-span-1">
          <RecentNotifications onViewAll={() => navigate('/notifications')} />
        </div>
      </div>
    </div>
  );
};

