import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection } from './shared';
import { WorkdaysView } from './WorkdaysView';
import { toast } from '../../../components/ui/Toast';
import type { WorkdaysConfig } from '../types/configuration.types';

/**
 * WorkdaysConfiguration component for managing standard working days and hours.
 * Provides inputs for monthly workdays, weekly working days, and daily working hours.
 */
export const WorkdaysConfiguration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: workdays, loading, saving, error } = useAppSelector((s) => s.configuration.workdays);

  const [defaultMonthlyWorkdays, setDefaultMonthlyWorkdays] = useState(30);
  const [weeklyWorkingDays, setWeeklyWorkingDays] = useState(5);
  const [dailyWorkingHours, setDailyWorkingHours] = useState(8);

  useEffect(() => {
    if (workdays) {
      setDefaultMonthlyWorkdays(workdays.defaultMonthlyWorkdays);
      setWeeklyWorkingDays(workdays.weeklyWorkingDays);
      setDailyWorkingHours(workdays.dailyWorkingHours);
    }
  }, [workdays]);

  const handleSave = () => {
    if (defaultMonthlyWorkdays < 1 || defaultMonthlyWorkdays > 31) {
      toast.error('Monthly workdays must be between 1 and 31');
      return;
    }
    if (weeklyWorkingDays < 1 || weeklyWorkingDays > 7) {
      toast.error('Weekly working days must be between 1 and 7');
      return;
    }
    if (dailyWorkingHours < 1 || dailyWorkingHours > 24) {
      toast.error('Daily working hours must be between 1 and 24');
      return;
    }
    const payload: WorkdaysConfig = { defaultMonthlyWorkdays, weeklyWorkingDays, dailyWorkingHours };
    dispatch(configurationActions.saveWorkdaysRequest(payload));
  };

  const workdaysState = {
    data: workdays,
    loading,
    error: error ? { status: 500, message: error } : null,
    isRefreshing: saving,
  };

  return (
    <ConfigSection
      id="workdays"
      title="Workdays Configuration"
      description="Define standard working days and hours"
      showBadge={!!workdays && !loading}
      badgeText="Active Standard"
    >
      <DataRenderer
        state={workdaysState}
        onRetry={() => dispatch(configurationActions.fetchWorkdaysRequest())}
        isEmpty={() => false}
        renderSuccess={() => (
          <WorkdaysView
            defaultMonthlyWorkdays={defaultMonthlyWorkdays}
            weeklyWorkingDays={weeklyWorkingDays}
            dailyWorkingHours={dailyWorkingHours}
            saving={saving}
            onMonthlyWorkdaysChange={setDefaultMonthlyWorkdays}
            onWeeklyWorkingDaysChange={setWeeklyWorkingDays}
            onDailyWorkingHoursChange={setDailyWorkingHours}
            onSave={handleSave}
          />
        )}
      />
    </ConfigSection>
  );
};
