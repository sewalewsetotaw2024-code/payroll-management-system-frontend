import React from 'react';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { EmployeeStatus } from '../../../types/api.types';

/**
 * Props for the EmployeeFilters component.
 */
interface EmployeeFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedDept: string;
  setSelectedDept: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (value: boolean) => void;
  departments: string[];
}

/**
 * EmployeeFilters component that provides search, department filter, status filter,
 * and an optional advanced filters panel with collapsible animation.
 */
export const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedDept,
  setSelectedDept,
  selectedStatus,
  setSelectedStatus,
  showAdvanced,
  setShowAdvanced,
  departments
}) => {
  const statuses = ['All Status', ...Object.values(EmployeeStatus)];

  return (
    <div className="flex flex-col gap-6">
      <div className="glass rounded-[2rem] p-3 flex flex-col md:flex-row gap-3 items-center shadow-lg border-white">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search directory..." 
            className="w-full pl-12 pr-6 py-3.5 bg-white border-2 border-brand-200 focus:border-brand-400 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold text-slate-700 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none group-hover:text-brand-primary transition-colors" />
            <select 
              className="pl-10 pr-10 py-3.5 bg-white border-2 border-brand-200 focus:border-brand-400 rounded-2xl text-xs focus:ring-4 focus:ring-brand-primary/10 font-bold text-slate-700 appearance-none min-w-[180px] cursor-pointer hover:bg-white/60 transition-all"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="relative group">
            <select 
              className="px-6 py-3.5 bg-white border-2 border-brand-200 focus:border-brand-400 rounded-2xl text-xs focus:ring-4 focus:ring-brand-primary/10 font-bold text-slate-700 appearance-none min-w-[140px] cursor-pointer hover:bg-white/60 transition-all text-center"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              "px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95",
              showAdvanced 
                ? "bg-brand-primary text-white shadow-lg shadow-brand-900/20" 
                : "bg-white/40 text-slate-500 hover:bg-white/60 hover:text-slate-800 shadow-sm"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Advanced
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50/80 border border-slate-100 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Grade</label>
                <select className="w-full p-2.5 border-2 border-brand-200 focus:border-brand-400 rounded-xl text-sm bg-white font-bold text-slate-700">
                  <option>All Grades</option>
                  <option>Level 1-2</option>
                  <option>Level 3-5</option>
                  <option>Senior/Lead</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salary Range</label>
                <select className="w-full p-2.5 border-2 border-brand-200 focus:border-brand-400 rounded-xl text-sm bg-white font-bold text-slate-700">
                  <option>All Ranges</option>
                  <option>Under 15k ETB</option>
                  <option>15k - 40k ETB</option>
                  <option>Above 40k ETB</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hire Period</label>
                <select className="w-full p-2.5 border-2 border-brand-200 focus:border-brand-400 rounded-xl text-sm bg-white font-bold text-slate-700">
                  <option>All Time</option>
                  <option>Last 6 Months</option>
                  <option>Last Year</option>
                  <option>Older</option>
                </select>
              </div>
              <div className="flex items-end pb-0.5">
                <button className="text-sm font-bold text-rose-600 hover:text-rose-700 underline underline-offset-4 decoration-2 decoration-rose-100">Reset Advanced</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
