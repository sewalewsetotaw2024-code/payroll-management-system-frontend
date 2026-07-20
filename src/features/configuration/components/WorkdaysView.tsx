import React from 'react';
import { Calendar, CalendarDays, Clock, Hourglass } from 'lucide-react';
import { Input } from '../../../components/ui';
import { ConfigSaveButton } from './shared/ConfigSaveButton';

interface WorkdaysViewProps {
  defaultMonthlyWorkdays: number;
  weeklyWorkingDays: number;
  dailyWorkingHours: number;
  saving: boolean;
  onMonthlyWorkdaysChange: (value: number) => void;
  onWeeklyWorkingDaysChange: (value: number) => void;
  onDailyWorkingHoursChange: (value: number) => void;
  onSave: () => void;
}

/**
 * WorkdaysView component displaying the workdays configuration form.
 * Shows inputs for monthly, weekly, and daily work schedules with a save button.
 */
export const WorkdaysView: React.FC<WorkdaysViewProps> = ({
  defaultMonthlyWorkdays,
  weeklyWorkingDays,
  dailyWorkingHours,
  saving,
  onMonthlyWorkdaysChange,
  onWeeklyWorkingDaysChange,
  onDailyWorkingHoursChange,
  onSave,
}) => (
  <div className="space-y-6">
    <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-brand-50 rounded-lg text-emerald-600">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Monthly</span>
          </div>
          <Input
            label="Monthly Workdays"
            type="number"
            value={defaultMonthlyWorkdays}
            onChange={(e) => onMonthlyWorkdaysChange(Number(e.target.value))}
            className="bg-slate-50/50"
            helperText="Standard working days per month"
          />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <CalendarDays className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Weekly</span>
          </div>
          <Input
            label="Working Days"
            type="number"
            value={weeklyWorkingDays}
            onChange={(e) => onWeeklyWorkingDaysChange(Number(e.target.value))}
            className="bg-slate-50/50"
            helperText="Working days per week"
          />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Daily</span>
          </div>
          <Input
            label="Working Hours"
            type="number"
            value={dailyWorkingHours}
            onChange={(e) => onDailyWorkingHoursChange(Number(e.target.value))}
            className="bg-slate-50/50"
            helperText="Standard hours per working day"
          />
        </div>
      </div>

      <div className="bg-slate-50/50 rounded-2xl p-6 flex items-start gap-4 border border-slate-100">
        <Hourglass className="w-5 h-5 text-slate-400 mt-1" />
        <div>
          <p className="text-sm font-bold text-slate-800">Calculation Logic</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            These values set the baseline for salary calculations, overtime rates, and absence deductions. 
            Standardizing these ensures consistency across the entire payroll system.
          </p>
        </div>
      </div>
    </div>

    <div className="flex justify-end pt-6 border-t border-slate-100">
      <ConfigSaveButton onClick={onSave} saving={saving} label="Save Configuration" />
    </div>
  </div>
);
