import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection } from './shared';
import { PensionView } from './PensionView';
import { toast } from '../../../components/ui/Toast';
import type { PensionRule } from '../types/configuration.types';

/**
 * PensionConfiguration component for managing employee/employer pension contribution rates.
 * Supports setting rates, calculation basis, mandatory compliance, and effective date.
 */
export const PensionConfiguration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: pensionRules, loading, saving, error } = useAppSelector((s) => s.configuration.pensionRules);

  const current = pensionRules.length > 0
    ? [...pensionRules].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0]
    : undefined;
  const [employeeRate, setEmployeeRate] = useState<number>(0.07);
  const [employerRate, setEmployerRate] = useState<number>(0.11);
  const [basis, setBasis] = useState<string>('BASIC');
  const [mandatoryForForeigners, setMandatoryForForeigners] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (current) {
      setEmployeeRate(Number(current.employeeRate) || 0.07);
      setEmployerRate(Number(current.employerRate) || 0.11);
      setBasis(current.basis);
      setMandatoryForForeigners(current.mandatoryForForeigners);
      setEffectiveDate(current.effectiveDate?.slice(0, 10) || '');
    }
  }, [current]);

  const handleSave = () => {
    if (employeeRate < 0 || employeeRate > 1) {
      toast.error('Employee contribution must be between 0 and 1');
      return;
    }
    if (employerRate < 0 || employerRate > 1) {
      toast.error('Employer contribution must be between 0 and 1');
      return;
    }
    if (employeeRate + employerRate > 1) {
      toast.error('Total contribution (employee + employer) cannot exceed 100%');
      return;
    }
    if (!effectiveDate) {
      toast.error('Effective date is required');
      return;
    }
    const payload: PensionRule[] = [{
      id: current?.id,
      employeeRate,
      employerRate,
      basis: basis as PensionRule['basis'],
      mandatoryForForeigners,
      remittanceDeadlineDays: current?.remittanceDeadlineDays ?? 30,
      effectiveDate,
    }];
    dispatch(configurationActions.savePensionRulesRequest(payload));
  };

  const pensionState = {
    data: pensionRules,
    loading,
    error: error ? { status: 500, message: error } : null,
    isRefreshing: saving,
  };

  return (
    <ConfigSection
      id="pension"
      title="Pension Configuration"
      description="Set employee and employer pension contribution rates"
      showBadge={!!current && !loading}
      badgeText="Active Policy"
    >
      <DataRenderer
        state={pensionState}
        onRetry={() => dispatch(configurationActions.fetchPensionRulesRequest())}
        isEmpty={() => false}
        renderSuccess={() => (
          <PensionView
            employeeRate={employeeRate}
            employerRate={employerRate}
            basis={basis}
            mandatoryForForeigners={mandatoryForForeigners}
            effectiveDate={effectiveDate}
            saving={saving}
            onEmployeeRateChange={setEmployeeRate}
            onEmployerRateChange={setEmployerRate}
            onBasisChange={setBasis}
            onMandatoryForForeignersChange={setMandatoryForForeigners}
            onEffectiveDateChange={setEffectiveDate}
            onSave={handleSave}
          />
        )}
      />
    </ConfigSection>
  );
};
