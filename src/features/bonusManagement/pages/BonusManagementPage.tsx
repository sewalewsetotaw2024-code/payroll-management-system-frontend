import React, { useState } from 'react';
import { 
  Zap, 
  Target, 
  Scale, 
  Settings2, 
  ChevronRight, 
  Plus, 
  Info,
  Check
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion } from 'motion/react';

export const BonusManagementPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    { id: 1, label: 'Eligibility Rules', icon: Target },
    { id: 2, label: 'PMS Mapping', icon: Scale },
    { id: 3, label: 'Tax Configuration', icon: Settings2 },
    { id: 4, label: 'Generation', icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bonus & Merit Management</h1>
          <p className="text-slate-500">Reg. No. 1395/2025 Compliant Merit-Based Bonus Engine.</p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                activeStep === step.id 
                  ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/20" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <step.icon className="w-4 h-4" />
              <span className="hidden lg:inline">{step.label}</span>
              {activeStep > step.id && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {activeStep === 1 && <EligibilityStep />}
          {activeStep === 2 && <PMSStep />}
          {activeStep === 3 && <TaxConfigStep />}
          {activeStep === 4 && <GenerationStep />}
        </div>

        {/* Sidebar Context */}
        <div className="space-y-6">
          <div className="glass-card p-6 bg-emerald-950 text-white">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              Calculation Logic
            </h4>
            <div className="space-y-4">
              <div className="p-3 bg-white/10 rounded-lg">
                <p className="text-xs text-emerald-200 uppercase tracking-wider mb-1">Target Strategy</p>
                <select className="bg-transparent border-none text-sm font-bold w-full focus:ring-0">
                  <option className="text-slate-900">Percentage of Basic</option>
                  <option className="text-slate-900">Fixed Amount</option>
                  <option className="text-slate-900">Net-to-Gross Simulation</option>
                </select>
              </div>
              <div className="p-3 bg-white/10 rounded-lg">
                <p className="text-xs text-emerald-200 uppercase tracking-wider mb-1">Impact Analysis</p>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-bold">ETB 450k</span>
                  <span className="text-xs text-emerald-300 mb-1">+5.2% vs Prev</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              Legal Guardrails
            </h4>
            <ul className="space-y-3 text-xs text-slate-500 leading-relaxed">
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                Bonus payments are aggregated with regular income for tax calculation in the specific month.
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                Proration applied for tenure under 1 year unless waived.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const EligibilityStep = () => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    <div className="glass-card p-6">
      <h3 className="font-bold text-slate-800 mb-6">Visual Eligibility Builder</h3>
      <div className="space-y-4">
        <RuleRow label="Performance (PMS)" operator="Greater than" value="70%" />
        <RuleRow label="Tenure" operator="Is at least" value="12 Months" />
        <RuleRow label="Department" operator="InCLUDES" value="All Departments" />
        <div className="pt-4 flex justify-center">
          <button className="text-emerald-700 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-brand-50 px-4 py-2 rounded-full transition-colors">
            <Plus className="w-4 h-4" /> Add Or Filter
          </button>
        </div>
      </div>
    </div>
  </motion.div>
);

const PMSStep = () => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-bold text-slate-800">Performance Mapping (0-100)</h3>
        <button className="btn-secondary py-1 text-xs">Reset All</button>
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-2">PMS Rating Range</div>
          <div>Bonus Value</div>
          <div className="text-right">Action</div>
        </div>
        <PMSMappingRow range="91 - 100" value="1.5x Basic" color="bg-emerald-600" />
        <PMSMappingRow range="81 - 90" value="1.2x Basic" color="bg-emerald-500" />
        <PMSMappingRow range="71 - 80" value="1.0x Basic" color="bg-emerald-400" />
        <PMSMappingRow range="0 - 70" value="No Bonus" color="bg-slate-200" />
      </div>
    </div>
  </motion.div>
);

const TaxConfigStep = () => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-slate-700">
    <div className="glass-card p-8">
      <h3 className="font-bold text-slate-900 mb-8">Bonus Taxation Strategy</h3>
      <div className="space-y-8">
        <div className="flex items-center justify-between p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:border-brand-500 hover:ring-4 hover:ring-brand-500/10 transition-all cursor-pointer">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-brand-100 text-emerald-700 rounded-2xl flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Fully Taxable (Standard)</p>
              <p className="text-sm text-slate-500">Aggregated with month's salary – Highly Compliant</p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-emerald-600 flex items-center justify-center p-1">
            <div className="w-full h-full bg-emerald-600 rounded-full" />
          </div>
        </div>
        
        <div className="flex items-center justify-between p-6 rounded-2xl border border-slate-100 bg-white opacity-60">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Custom Threshold</p>
              <p className="text-sm text-slate-500">Exclude first ETB 10,000 from taxation</p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-slate-200" />
        </div>
      </div>
    </div>
  </motion.div>
);

const GenerationStep = () => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    <div className="glass-card p-12 text-center flex flex-col items-center">
      <div className="w-20 h-20 bg-brand-100 text-emerald-700 rounded-full flex items-center justify-center mb-6">
        <Zap className="w-10 h-10" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Generate Bonus Batch?</h3>
      <p className="text-slate-500 max-w-sm mb-8">
        This will calculate merit-based bonuses for 156 employees based on the current configuration.
      </p>
      <div className="flex gap-4">
        <button className="btn-secondary">Export Simulation</button>
        <button className="btn-primary px-8">Process & Create Batch</button>
      </div>
    </div>
  </motion.div>
);

const RuleRow = ({ label, operator, value }: { label: string, operator: string, value: string }) => (
  <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
    <div className="flex-1">
      <p className="text-xs font-bold text-slate-400 uppercase mb-1">{label}</p>
      <p className="font-semibold text-slate-900">{label}</p>
    </div>
    <div className="bg-white px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-emerald-700">
      {operator}
    </div>
    <div className="flex-1">
      <input type="text" defaultValue={value} className="w-full bg-white px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
    </div>
    <button className="p-2 text-slate-300 hover:text-rose-500"><Plus className="w-4 h-4 rotate-45" /></button>
  </div>
);

const PMSMappingRow = ({ range, value, color }: { range: string, value: string, color: string }) => (
  <div className="grid grid-cols-4 items-center gap-4 py-2">
    <div className="col-span-2 flex items-center gap-4">
      <div className={cn("w-2 h-8 rounded-full", color)}></div>
      <span className="font-bold text-slate-700">{range}</span>
    </div>
    <div className="font-mono text-sm font-bold text-emerald-700">{value}</div>
    <div className="text-right">
      <button className="text-slate-400 hover:text-emerald-700"><ChevronRight className="w-4 h-4 ml-auto" /></button>
    </div>
  </div>
);
