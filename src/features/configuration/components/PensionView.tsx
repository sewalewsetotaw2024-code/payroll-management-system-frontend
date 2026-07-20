import React from 'react';
import { Users, Building2, Calendar, ShieldCheck, Percent, BadgePercent, ArrowRight } from 'lucide-react';
import { Input, Select } from '../../../components/ui';
import { ConfigSaveButton } from './shared/ConfigSaveButton';

interface PensionViewProps {
  employeeRate: number;
  employerRate: number;
  basis: string;
  mandatoryForForeigners: boolean;
  effectiveDate: string;
  saving: boolean;
  onEmployeeRateChange: (rate: number) => void;
  onEmployerRateChange: (rate: number) => void;
  onBasisChange: (basis: string) => void;
  onMandatoryForForeignersChange: (value: boolean) => void;
  onEffectiveDateChange: (date: string) => void;
  onSave: () => void;
}

/**
 * PensionView component displaying the pension configuration form.
 * Includes rate summary hero, employee/employer rate cards, calculation basis, and compliance toggle.
 */
export const PensionView: React.FC<PensionViewProps> = ({
  employeeRate,
  employerRate,
  basis,
  mandatoryForForeigners,
  effectiveDate,
  saving,
  onEmployeeRateChange,
  onEmployerRateChange,
  onBasisChange,
  onMandatoryForForeignersChange,
  onEffectiveDateChange,
  onSave,
}) => {
  const totalRate = (Number(employeeRate) || 0) + (Number(employerRate) || 0);

  return (
    <div className="space-y-6">
      {/* Rate Summary Hero */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-[2rem] p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Pension Contribution</p>
            <p className="text-4xl font-black tracking-tight">{(totalRate * 100).toFixed(1)}%</p>
            <p className="text-emerald-200 text-sm font-bold mt-1">
              Employee: {(Number(employeeRate) * 100).toFixed(1)}% + Employer: {(Number(employerRate) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
            <Percent className="w-7 h-7 text-emerald-200" />
          </div>
        </div>
        <div className="mt-6 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(totalRate * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Rate Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 border border-sky-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-sm text-slate-800">Employee Share</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Deducted from salary</p>
            </div>
          </div>
          <Input
            label="Rate (decimal)"
            type="number"
            value={employeeRate}
            onChange={(e) => onEmployeeRateChange(Number(e.target.value))}
            icon={<BadgePercent className="w-4 h-4" />}
            step={0.01}
            min={0}
            max={1}
            className="bg-slate-50/50"
          />
          <p className="text-xs text-sky-600 font-medium ml-1">
            {(Number(employeeRate) * 100).toFixed(1)}% of {basis === 'BASIC' ? 'basic salary' : 'gross salary'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-sm text-slate-800">Employer Share</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company contribution</p>
            </div>
          </div>
          <Input
            label="Rate (decimal)"
            type="number"
            value={employerRate}
            onChange={(e) => onEmployerRateChange(Number(e.target.value))}
            icon={<Building2 className="w-4 h-4" />}
            step={0.01}
            min={0}
            max={1}
            className="bg-slate-50/50"
          />
          <p className="text-xs text-sky-600 font-medium ml-1">
            {(Number(employerRate) * 100).toFixed(1)}% of {basis === 'BASIC' ? 'basic salary' : 'gross salary'}
          </p>
        </div>
      </div>

      {/* Configuration Details */}
      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Calculation Basis"
            value={basis}
            onChange={(e) => onBasisChange(e.target.value)}
            options={[
              { value: 'BASIC', label: 'Basic Salary' },
              { value: 'GROSS', label: 'Gross Salary' },
            ]}
            className="bg-slate-50/50"
          />
          <Input
            label="Effective Date"
            type="date"
            value={effectiveDate}
            onChange={(e) => onEffectiveDateChange(e.target.value)}
            icon={<Calendar className="w-4 h-4" />}
            className="bg-slate-50/50"
          />
        </div>
      </div>

      {/* Mandatory Compliance */}
      <div className="flex items-center gap-4 p-6 bg-brand-50/50 rounded-[1.5rem] border border-emerald-100/80 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-slate-800">Mandatory Compliance</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Enable if pension is mandatory for all employees, including foreign nationals
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={mandatoryForForeigners}
            onChange={(e) => onMandatoryForForeignersChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 peer-focus:ring-2 peer-focus:ring-emerald-300 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-6 border-t border-slate-100">
        <ConfigSaveButton onClick={onSave} saving={saving} label="Save Pension Configuration" />
      </div>
    </div>
  );
};
