import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection } from './shared';
import { OvertimeView } from './OvertimeView';

import { getDefaultOvertimeRules } from '../constants';
import type { OvertimeRule } from '../types/configuration.types';

/**
 * OvertimeConfiguration component for managing overtime pay multipliers by category.
 * Supports inline editing of overtime rates with immediate save to backend,
 * and global settings that apply across all categories.
 */
export const OvertimeConfiguration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: overtimeRules, loading, saving, error } = useAppSelector((s) => s.configuration.overtimeRules);

  const [localRules, setLocalRules] = useState<OvertimeRule[]>(getDefaultOvertimeRules());

  useEffect(() => {
    const defaults = getDefaultOvertimeRules();
    if (overtimeRules.length > 0) {
      setLocalRules(defaults.map((d) => overtimeRules.find((r) => r.category === d.category) || d));
    }
  }, [overtimeRules]);

  /** Updates a single rate locally and immediately persists to the backend. */
  const handleUpdateRate = useCallback(
    (index: number, rate: number) => {
      const updated = localRules.map((r, i) => (i === index ? { ...r, rate } : r));
      setLocalRules(updated);
      dispatch(configurationActions.saveOvertimeRulesRequest(updated));
    },
    [localRules, dispatch],
  );

  /** Updates a global field across all rules and immediately persists. */
  const handleUpdateGlobal = useCallback(
    (field: string, value: any) => {
      const updated = localRules.map((r) => ({ ...r, [field]: value }));
      setLocalRules(updated);
      dispatch(configurationActions.saveOvertimeRulesRequest(updated));
    },
    [localRules, dispatch],
  );

  /** Saves all rules (fallback for manual save button). */
  const handleSave = useCallback(() => {
    dispatch(configurationActions.saveOvertimeRulesRequest(localRules));
  }, [dispatch, localRules]);

  const overtimeRendererState = {
    data: localRules,
    loading,
    error: error ? { status: 500, message: error } : null,
    isRefreshing: saving,
  };

  return (
    <ConfigSection
      id="overtime"
      title="Overtime Rules"
      description="Configure overtime pay multipliers by category"
      showBadge={overtimeRules.length > 0 && !loading}
    >
      <DataRenderer
        state={overtimeRendererState}
        onRetry={() => dispatch(configurationActions.fetchOvertimeRulesRequest())}
        isEmpty={() => false}
        renderSuccess={() => (
          <OvertimeView
            rules={localRules}
            saving={saving}
            onUpdateRate={handleUpdateRate}
            onSave={handleSave}
            onUpdateGlobal={handleUpdateGlobal}
          />
        )}
      />
    </ConfigSection>
  );
};
