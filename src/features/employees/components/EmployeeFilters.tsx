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
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto text-slate-700">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white font-bold text-slate-700 appearance-none min-w-[150px] cursor-pointer hover:bg-slate-50 transition-colors"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <select 
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white font-bold text-slate-700 appearance-none min-w-[130px] cursor-pointer hover:bg-slate-50 transition-colors"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              "px-4 py-2 border rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95",
              showAdvanced 
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
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
                <select className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white font-bold text-slate-700">
                  <option>All Grades</option>
                  <option>Level 1-2</option>
                  <option>Level 3-5</option>
                  <option>Senior/Lead</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salary Range</label>
                <select className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white font-bold text-slate-700">
                  <option>All Ranges</option>
                  <option>Under 15k ETB</option>
                  <option>15k - 40k ETB</option>
                  <option>Above 40k ETB</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hire Period</label>
                <select className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white font-bold text-slate-700">
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
