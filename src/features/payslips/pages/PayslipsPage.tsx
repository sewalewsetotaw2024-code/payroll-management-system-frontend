import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Users, 
  CheckCircle2, 
  Clock, 
  Download, 
  Mail, 
  Trash2, 
  ChevronRight, 
  X,
  Eye,
  Filter
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { StatCardProps } from '../../../types/ui.types';

interface PayslipBatch {
  id: string;
  name: string;
  period: string;
  employeeCount: number;
  createdDate: string;
  totalGross: number;
  totalNet: number;
  status: 'Draft' | 'Generated';
}

const mockEmployees = [
  { id: '1', name: 'Abebe Kebede', department: 'Engineering', gross: 89200, net: 63000 },
  { id: '2', name: 'Tigist Alemu', department: 'Finance', gross: 68400, net: 49500 },
  { id: '3', name: 'Dawit Haile', department: 'Sales', gross: 95800, net: 66400 },
  { id: '4', name: 'Sara Mohammed', department: 'HR', gross: 58500, net: 42700 },
  { id: '5', name: 'Yohannes Tadesse', department: 'Engineering', gross: 78600, net: 56500 },
];

export const PayslipsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  
  const [batches, setBatches] = useState<PayslipBatch[]>([
    {
      id: '1',
      name: 'March 2026 - Full Time Employees',
      period: 'March 2026',
      employeeCount: 5,
      createdDate: '2026-04-01',
      totalGross: 390500,
      totalNet: 278100,
      status: 'Generated'
    },
    {
      id: '2',
      name: 'March 2026 - Contractors',
      period: 'March 2026',
      employeeCount: 2,
      createdDate: '2026-04-02',
      totalGross: 145000,
      totalNet: 118000,
      status: 'Draft'
    }
  ]);

  const activeBatch = batches.find(b => b.id === activeBatchId);

  const toggleEmployee = (id: string) => {
    const next = new Set(selectedEmployees);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEmployees(next);
  };

  const selectAll = () => setSelectedEmployees(new Set(mockEmployees.map(e => e.id)));
  const deselectAll = () => setSelectedEmployees(new Set());

  return (
    <div className="space-y-8 pb-10">
      {!activeBatchId ? (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Payslip Generation</h1>
              <p className="text-slate-500 text-sm">Create batches and generate payslips for groups of employees</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create New Batch
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Total Batches" value={batches.length.toString()} icon={FileText} iconColor="text-emerald-600" />
            <StatCard label="Total Employees" value="7" icon={Users} iconColor="text-emerald-600" />
            <StatCard label="Generated" value={batches.filter(b => b.status === 'Generated').length.toString()} icon={CheckCircle2} iconColor="text-emerald-500" />
            <StatCard label="Draft" value={batches.filter(b => b.status === 'Draft').length.toString()} icon={Clock} iconColor="text-amber-500" />
          </div>

          {/* Batches Section */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">Payslip Batches</h3>
            </div>
            <div className="p-6 space-y-4">
              {batches.map(batch => (
                <div key={batch.id} className="p-6 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{batch.name}</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          batch.status === 'Generated' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {batch.status}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" /> {batch.employeeCount} employees
                        </div>
                        <div className="flex items-center gap-1.5">
                          Period: {batch.period}
                        </div>
                        <div className="flex items-center gap-1.5">
                          Created: {batch.createdDate}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-6 pt-2">
                        <div className="text-xs">
                          <p className="text-emerald-600 font-bold uppercase tracking-widest text-[9px]">Total Gross</p>
                          <p className="text-emerald-700 font-medium">ETB {batch.totalGross.toLocaleString()}</p>
                        </div>
                        <div className="text-xs">
                          <p className="text-emerald-600 font-bold uppercase tracking-widest text-[9px]">Total Net</p>
                          <p className="text-emerald-700 font-medium">ETB {batch.totalNet.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setActiveBatchId(batch.id)}
                        className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        View Details
                      </button>
                      {batch.status === 'Generated' ? (
                        <>
                          <button className="px-4 py-2 text-sm font-bold text-white bg-[#047857] rounded-lg flex items-center gap-2 hover:bg-[#036246]">
                            <Download className="w-4 h-4" /> Download All
                          </button>
                          <button className="px-4 py-2 text-sm font-bold text-white bg-[#047857] rounded-lg flex items-center gap-2 hover:bg-[#036246]">
                            <Mail className="w-4 h-4" /> Email All
                          </button>
                        </>
                      ) : (
                        <button className="px-4 py-2 text-sm font-bold text-white bg-[#047857] rounded-lg flex items-center gap-2 hover:bg-[#036246]">
                          Generate Payslips
                        </button>
                      )}
                      <button className="p-2 text-rose-500 border border-slate-100 rounded-lg hover:bg-rose-50 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveBatchId(null)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{activeBatch?.name}</h2>
              <p className="text-sm text-slate-500">Managing {activeBatch?.employeeCount} employee payslips</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
               <button className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                Export to CSV
              </button>
               <button className="btn-primary">
                Finalize & Send Emails
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
             <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Employee</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Department</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Gross</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Net</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {mockEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{emp.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-medium">EMP-ID: 00{emp.id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-50 font-medium">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase">{emp.department}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800 font-bold text-right font-mono">ETB {emp.gross.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-emerald-600 font-bold text-right font-mono">ETB {emp.net.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </motion.div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Create New Payslip Batch</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Batch Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., April 2026 - Full Time"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Payroll Period</label>
                    <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all bg-white font-medium">
                      <option>April 2026</option>
                      <option>March 2026</option>
                      <option>February 2026</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800">Select Employees</h4>
                    <div className="flex items-center gap-3 text-xs font-bold">
                       <button onClick={selectAll} className="text-emerald-600 hover:underline">Select All</button>
                       <button onClick={deselectAll} className="text-slate-400 hover:underline">Deselect All</button>
                    </div>
                  </div>
                  
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-3 w-10 text-center">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              checked={selectedEmployees.size === mockEmployees.length}
                              onChange={e => e.target.checked ? selectAll() : deselectAll()}
                            />
                          </th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Employee</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Department</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Gross Salary</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Net Salary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {mockEmployees.map(emp => (
                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-center">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                checked={selectedEmployees.has(emp.id)}
                                onChange={() => toggleEmployee(emp.id)}
                              />
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700">{emp.name}</td>
                            <td className="px-6 py-4 text-sm text-slate-500">{emp.department}</td>
                            <td className="px-6 py-4 text-sm text-emerald-600 font-medium text-right font-mono">ETB {emp.gross.toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm text-emerald-600 font-medium text-right font-mono">ETB {emp.net.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                  <p className="text-emerald-900 font-bold text-sm">
                    {selectedEmployees.size} employees selected
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button className="px-6 py-2.5 text-sm font-bold text-slate-100 bg-slate-700 rounded-xl hover:bg-slate-800 transition-colors shadow-lg">
                  Save as Draft
                </button>
                <button className="px-6 py-2.5 text-sm font-bold text-white bg-[#047857] rounded-xl flex items-center gap-2 hover:bg-[#036246] transition-colors shadow-lg">
                  <FileText className="w-4 h-4" /> Create & Generate Payslips
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, iconColor }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900">{value}</p>
    </div>
    <div className={cn("w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform", iconColor)}>
      <Icon className="w-6 h-6" />
    </div>
  </div>
);
