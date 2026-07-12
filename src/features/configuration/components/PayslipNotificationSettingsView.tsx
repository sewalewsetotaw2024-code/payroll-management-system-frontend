import React from 'react';
import {
  Bell, Mail, MessageSquare, Smartphone, Globe, Calendar,
  FileText, File, Plus, X,
} from 'lucide-react';
import { Toggle, Select, Button } from '../../../components/ui';
import { ConfigSaveButton } from './shared/ConfigSaveButton';
import {
  DIGEST_FREQUENCY_OPTIONS,
  PAYSLIP_FORMAT_OPTIONS,
  DELIVERY_TRIGGER_OPTIONS,
} from '../constants';
import type { DigestFrequency, PayslipFormat, DeliveryTrigger } from '../types/configuration.types';

interface PayslipNotificationSettingsViewProps {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  digestFrequency: string;
  payslipFormat: string;
  deliveryTriggers: string[];
  saving: boolean;
  onEmailToggle: (value: boolean) => void;
  onSmsToggle: (value: boolean) => void;
  onPushToggle: (value: boolean) => void;
  onInAppToggle: (value: boolean) => void;
  onDigestFrequencyChange: (value: string) => void;
  onPayslipFormatChange: (value: string) => void;
  onAddTrigger: (value: string) => void;
  onRemoveTrigger: (value: string) => void;
  onSave: () => void;
}

/** Sub-component for a toggle card in the notification channels grid. */
const ChannelCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent: string;
}> = ({ icon, label, description, checked, onChange, accent }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${accent}`}>{icon}</div>
      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
    <Toggle
      label={label}
      checked={checked}
      onChange={onChange}
      helperText={description}
    />
  </div>
);

/**
 * PayslipNotificationSettingsView component — redesigned with 4 notification channels,
 * delivery triggers, payslip format, and digest frequency.
 */
export const PayslipNotificationSettingsView: React.FC<PayslipNotificationSettingsViewProps> = ({
  emailNotifications,
  smsNotifications,
  pushNotifications,
  inAppNotifications,
  digestFrequency,
  payslipFormat,
  deliveryTriggers,
  saving,
  onEmailToggle,
  onSmsToggle,
  onPushToggle,
  onInAppToggle,
  onDigestFrequencyChange,
  onPayslipFormatChange,
  onAddTrigger,
  onRemoveTrigger,
  onSave,
}) => {
  const availableTriggers = DELIVERY_TRIGGER_OPTIONS.filter(
    (opt) => !deliveryTriggers.includes(opt.value),
  );

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-8 space-y-8">
        {/* ═══ Section 1: Notification Channels ═══ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
              <Bell className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Notification Channels
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ChannelCard
              icon={<Mail className="w-4 h-4" />}
              label="Email"
              description="Send payslip notifications via email"
              checked={emailNotifications}
              onChange={onEmailToggle}
              accent="bg-blue-50 text-blue-600"
            />
            <ChannelCard
              icon={<MessageSquare className="w-4 h-4" />}
              label="SMS"
              description="Send payslip notifications via SMS"
              checked={smsNotifications}
              onChange={onSmsToggle}
              accent="bg-emerald-50 text-emerald-600"
            />
            <ChannelCard
              icon={<Smartphone className="w-4 h-4" />}
              label="Push"
              description="Send push notifications to mobile app"
              checked={pushNotifications}
              onChange={onPushToggle}
              accent="bg-violet-50 text-violet-600"
            />
            <ChannelCard
              icon={<Globe className="w-4 h-4" />}
              label="In-App"
              description="Show notifications inside the app"
              checked={inAppNotifications}
              onChange={onInAppToggle}
              accent="bg-amber-50 text-amber-600"
            />
          </div>
        </div>

        {/* ═══ Section 2: Delivery Triggers ═══ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Delivery Triggers
              </span>
              <p className="text-[11px] text-slate-400">Events that trigger a notification to be sent</p>
            </div>
          </div>

          {/* Selected triggers */}
          <div className="flex flex-wrap gap-2">
            {deliveryTriggers.length === 0 ? (
              <span className="text-xs text-slate-400 py-2">No triggers selected — add one below</span>
            ) : (
              deliveryTriggers.map((trigger) => {
                const meta = DELIVERY_TRIGGER_OPTIONS.find((o) => o.value === trigger);
                return (
                  <span
                    key={trigger}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200"
                  >
                    {meta?.label ?? trigger}
                    <button
                      onClick={() => onRemoveTrigger(trigger)}
                      className="p-0.5 hover:bg-slate-200 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })
            )}
          </div>

          {/* Add trigger */}
          {availableTriggers.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => { if (e.target.value) onAddTrigger(e.target.value); e.target.value = ''; }}
                value=""
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">Add trigger…</option>
                {availableTriggers.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.description}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ═══ Section 3: Format & Schedule ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Digest Frequency</span>
            </div>
            <Select
              value={digestFrequency}
              onChange={(e) => onDigestFrequencyChange(e.target.value)}
              options={DIGEST_FREQUENCY_OPTIONS}
              className="bg-slate-50/50"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Payslip Format</span>
            </div>
            <Select
              value={payslipFormat}
              onChange={(e) => onPayslipFormatChange(e.target.value)}
              options={PAYSLIP_FORMAT_OPTIONS}
              className="bg-slate-50/50"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                <File className="w-4 h-4" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Template</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Custom email templates will be available in a future update. Default template is used currently.
            </p>
          </div>
        </div>

        {/* ═══ Section 4: Info ═══ */}
        <div className="bg-slate-50/50 rounded-2xl p-6 flex items-start gap-4 border border-slate-100">
          <Bell className="w-5 h-5 text-slate-400 mt-1" />
          <div>
            <p className="text-sm font-bold text-slate-800">Notification Preferences</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Configure how and when employees receive payslip notifications across all channels.
              Delivery triggers control which events generate notifications. Digest frequency controls
              how often summary notifications are sent.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-slate-100">
        <ConfigSaveButton onClick={onSave} saving={saving} label="Save Settings" />
      </div>
    </div>
  );
};
