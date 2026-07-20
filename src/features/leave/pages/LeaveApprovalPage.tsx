import React from 'react';
import { CalendarDays, Clock, ShieldCheck, Inbox } from 'lucide-react';
import { LeaveApplicationsSection } from '../components/LeaveApplicationsSection';
import { motion } from 'motion/react';
import { Button } from '../../../components/ui';

/**
 * LeaveApprovalPage — Dedicated page for Department Managers to
 * view and manage leave applications scoped to their department.
 */
const LeaveApprovalPage: React.FC = () => {
  return (
    <div className="space-y-10 pb-12 relative">
      {/* Premium Header */}
      <div className="glass rounded-[3rem] p-10 bg-brand-primary text-white relative overflow-hidden shadow-2xl border-white/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
                <CalendarDays className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">Absence Matrix</h1>
                <p className="text-emerald-100 font-bold text-xs uppercase tracking-widest mt-2">Governance & Approval Portal</p>
              </div>
            </div>
            <p className="text-emerald-50/80 text-sm max-w-xl font-medium leading-relaxed">
              Managing organizational bandwidth through precise leave entitlement tracking and multi-tier approval workflows.
            </p>
          </div>

          <div className="flex gap-4">
            <Button variant="secondary" className="px-8 shadow-lg border-white bg-white/10 text-white hover:bg-white/20 border-white/20">
              <Inbox className="w-4 h-4" /> Entitlement Report
            </Button>
          </div>
        </div>
      </div>

      {/* Applications Canvas */}
      <div className="glass rounded-[3rem] shadow-2xl border-white overflow-hidden bg-white/30 backdrop-blur-md">
        <div className="p-8 border-b border-slate-100 bg-white/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 shadow-sm">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 tracking-tight text-xl">
                Pending Governance
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Awaiting managerial validation
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="px-4 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100">
              Awaiting Action
            </span>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8"
        >
          <LeaveApplicationsSection
            periodId={null}
            periodStart=""
            periodEnd=""
          />
        </motion.div>
      </div>
    </div>
  );
};

export default LeaveApprovalPage;
