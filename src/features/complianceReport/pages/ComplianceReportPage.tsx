import React from 'react';
import { 
  LucideIcon,
  FileCheck, 
  Calendar, 
  Download, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  FileSpreadsheet,
  FileOutput
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { StatCardProps } from '../../../types/ui.types';

const taxReports = [
  { period: 'March 2026', amount: 18450000, employees: 1248, status: 'Generated', date: '2026-04-01' },
  { period: 'February 2026', amount: 17890000, employees: 1232, status: 'Submitted', date: '2026-03-01' },
  { period: 'January 2026', amount: 17450000, employees: 1220, status: 'Submitted', date: '2026-02-01' },
];

const pensionReports = [
  { period: 'March 2026', employee: 6020000, employer: 9460000, total: 15480000, status: 'Generated' },
  { period: 'February 2026', employee: 5880000, employer: 9240000, total: 15120000, status: 'Submitted' },
  { period: 'January 2026', employee: 5720000, employer: 8990000, total: 14710000, status: 'Submitted' },
];

export const ComplianceReportPage: React.FC = () => {
  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Statutory Compliance & Reports</h1>
          <p className="text-slate-500 text-sm">Tax and pension reports for MoR and POESSA</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Select Period
          </button>
          <button className="px-5 py-2 text-sm font-bold text-white bg-[#047857] rounded-xl hover:bg-[#036246] transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/10">
            <FileCheck className="w-4 h-4" /> Generate Reports
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Tax Reports" 
          value="12" 
          subValue="All submitted" 
          subColor="text-emerald-500"
          icon={FileText} 
          iconColor="text-emerald-500" 
        />
        <StatCard 
          label="Pension Reports" 
          value="12" 
          subValue="Up to date" 
          subColor="text-emerald-500"
          icon={CheckCircle2} 
          iconColor="text-emerald-500" 
        />
        <StatCard 
          label="Next Deadline" 
          value="May 5" 
          subValue="7 days remaining" 
          subColor="text-orange-500"
          icon={Clock} 
          iconColor="text-orange-500" 
        />
        <StatCard 
          label="Compliance Status" 
          value="100%" 
          subValue="All compliant" 
          subColor="text-emerald-500"
          icon={AlertCircle} 
          iconColor="text-emerald-500" 
        />
      </div>

      {/* Tax Reports Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Tax Reports (Ministry of Revenue)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Period</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Tax </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Employees</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generated On</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxReports.map((report, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors text-sm">
                  <td className="px-8 py-4 font-bold text-slate-800">{report.period}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700">{report.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center text-slate-500">{report.employees}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      report.status === 'Generated' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{report.date}</td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      {report.status === 'Generated' && (
                        <button className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-500 hover:text-emerald-700 transition-colors">
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pension Reports Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Pension Reports (POESSA)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Period</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Employee (7%)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Employer (11%)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pensionReports.map((report, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors text-sm">
                  <td className="px-8 py-4 font-bold text-slate-800">{report.period}</td>
                  <td className="px-6 py-4 text-right font-medium text-orange-600">{report.employee.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-medium text-orange-600">{report.employer.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">{report.total.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      report.status === 'Generated' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      {report.status === 'Generated' && (
                        <button className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-500 hover:text-emerald-700 transition-colors">
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Export Options */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Export Options</h3>
          <div className="space-y-4">
            <ExportButton label="Export as CSV" icon={FileOutput} />
            <ExportButton label="Export as Excel" icon={FileSpreadsheet} />
            <ExportButton label="Export as PDF" icon={FileText} />
          </div>
        </div>

        {/* Submission Tracking */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Submission Tracking</h3>
          <div className="space-y-4">
            <SubmissionItem label="Tax Report - March 2026" date="May 5, 2026" status="Pending" />
            <SubmissionItem label="Pension Report - March 2026" date="May 5, 2026" status="Pending" />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, subColor, icon: Icon, iconColor }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm group hover:shadow-md transition-all">
    <div className="flex items-start justify-between mb-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-3xl font-black text-slate-900">{value}</p>
      <p className={cn("text-[10px] font-bold", subColor)}>{subValue}</p>
    </div>
  </div>
);

const ExportButton: React.FC<{ label: string; icon: LucideIcon }> = ({ label, icon: Icon }) => (
  <button className="w-full flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/20 transition-all group">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-bold text-slate-700">{label}</span>
    </div>
    <Download className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
  </button>
);

const SubmissionItem: React.FC<{ label: string; date: string; status: string }> = ({ label, date, status }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
    <div>
      <p className="text-sm font-bold text-slate-800">{label}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">Due: {date}</p>
    </div>
    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">
      {status}
    </span>
  </div>
);

