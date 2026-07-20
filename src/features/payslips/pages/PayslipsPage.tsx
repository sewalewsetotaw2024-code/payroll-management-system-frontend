import React from 'react';
import { FileText, Receipt } from 'lucide-react';
import { MyPayslipsTab } from '../components/MyPayslipsTab';
import { useAppSelector } from '../../../store/hooks';
import { useNavigate } from 'react-router-dom';

const ADMIN_ROLES = new Set([
  'HR_GENERALIST', 'HR_CS_MANAGER', 'HR_CS_DIRECTOR',
  'FINANCE_OFFICER', 'FINANCE_MANAGER',
  'ADMIN',
]);

export const PayslipsPage: React.FC = () => {
  const navigate = useNavigate();
  const userRole = useAppSelector((state) => state.auth.user?.role?.name ?? null);
  const canManageTemplates = userRole ? ADMIN_ROLES.has(userRole) : false;

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 px-4 md:px-8">
      {/* Refined Professional Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            <span>Official Records</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Encrypted</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Payroll Documents
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5 max-w-2xl">
            Secure access to your monthly payslips and compensation statements.
          </p>
        </div>

        {canManageTemplates && (
          <button
            onClick={() => navigate('/payslip-templates')}
            className="inline-flex items-center gap-2.5 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-700 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Manage Templates
          </button>
        )}
      </div>

      <MyPayslipsTab />
    </div>
  );
};
