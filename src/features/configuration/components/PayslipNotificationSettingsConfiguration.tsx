import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';
import { DataRenderer } from '../../../components/core/renderers/DataRenderer';
import { ConfigSection } from './shared';
import { PayslipNotificationSettingsView } from './PayslipNotificationSettingsView';
import type { PayslipNotificationSettings, DeliveryTrigger } from '../types/configuration.types';

/**
 * Parses deliveryTriggers from the API — handles both JSON string and array formats.
 */
function parseDeliveryTriggers(settings: PayslipNotificationSettings | null): string[] {
  if (!settings?.deliveryTriggers) return ['PAYSLIP_GENERATED', 'MONTHLY_DIGEST'];
  if (Array.isArray(settings.deliveryTriggers)) return settings.deliveryTriggers as string[];
  try {
    const parsed = JSON.parse(settings.deliveryTriggers as string);
    return Array.isArray(parsed) ? parsed : ['PAYSLIP_GENERATED', 'MONTHLY_DIGEST'];
  } catch {
    return ['PAYSLIP_GENERATED', 'MONTHLY_DIGEST'];
  }
}

/**
 * PayslipNotificationSettingsConfiguration component — expanded with push, in-app,
 * delivery triggers, payslip format, and email template fields.
 */
export const PayslipNotificationSettingsConfiguration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: settings, loading, saving, error } = useAppSelector((s) => s.configuration.payslipNotificationSettings);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [inAppNotifications, setInAppNotifications] = useState(false);
  const [digestFrequency, setDigestFrequency] = useState('WEEKLY');
  const [payslipFormat, setPayslipFormat] = useState('PDF');
  const [deliveryTriggers, setDeliveryTriggers] = useState<string[]>(['PAYSLIP_GENERATED', 'MONTHLY_DIGEST']);

  useEffect(() => {
    if (settings) {
      setEmailNotifications(settings.emailNotifications);
      setSmsNotifications(settings.smsNotifications);
      setPushNotifications(settings.pushNotifications);
      setInAppNotifications(settings.inAppNotifications);
      setDigestFrequency(settings.digestFrequency);
      setPayslipFormat(settings.payslipFormat);
      setDeliveryTriggers(parseDeliveryTriggers(settings));
    }
  }, [settings]);

  const handleAddTrigger = useCallback((value: string) => {
    setDeliveryTriggers((prev) => (prev.includes(value) ? prev : [...prev, value]));
  }, []);

  const handleRemoveTrigger = useCallback((value: string) => {
    setDeliveryTriggers((prev) => prev.filter((t) => t !== value));
  }, []);

  const handleSave = useCallback(() => {
    const payload: Record<string, any> = {
      emailNotifications,
      smsNotifications,
      pushNotifications,
      inAppNotifications,
      digestFrequency,
      payslipFormat,
      deliveryTriggers,
    };
    dispatch(configurationActions.savePayslipNotificationSettingsRequest(payload as any));
  }, [emailNotifications, smsNotifications, pushNotifications, inAppNotifications, digestFrequency, payslipFormat, deliveryTriggers, dispatch]);

  const state = {
    data: settings,
    loading,
    error: error ? { status: 500, message: error } : null,
    isRefreshing: saving,
  };

  return (
    <ConfigSection
      id="payslip-notifications"
      title="Payslip Notification Settings"
      description="Configure how employees receive payslip notifications across channels"
      showBadge={!!settings && !loading}
      badgeText="Configured"
    >
      <DataRenderer
        state={state}
        onRetry={() => dispatch(configurationActions.fetchPayslipNotificationSettingsRequest())}
        isEmpty={() => false}
        renderSuccess={() => (
          <PayslipNotificationSettingsView
            emailNotifications={emailNotifications}
            smsNotifications={smsNotifications}
            pushNotifications={pushNotifications}
            inAppNotifications={inAppNotifications}
            digestFrequency={digestFrequency}
            payslipFormat={payslipFormat}
            deliveryTriggers={deliveryTriggers}
            saving={saving}
            onEmailToggle={setEmailNotifications}
            onSmsToggle={setSmsNotifications}
            onPushToggle={setPushNotifications}
            onInAppToggle={setInAppNotifications}
            onDigestFrequencyChange={setDigestFrequency}
            onPayslipFormatChange={setPayslipFormat}
            onAddTrigger={handleAddTrigger}
            onRemoveTrigger={handleRemoveTrigger}
            onSave={handleSave}
          />
        )}
      />
    </ConfigSection>
  );
};
