import React, { useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings, Lock, Users, DollarSign, Bell, Calendar,
  Receipt, Shield, Wallet, TrendingDown, CalendarCheck, Clock,
  CalendarDays, CircleDollarSign, RefreshCw, Landmark, ChevronRight,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion } from 'motion/react';

// Sub-components
import { TaxConfiguration } from '../components/TaxConfiguration';
import { PensionConfiguration } from '../components/PensionConfiguration';
import { AllowancesConfiguration } from '../components/AllowancesConfiguration';
import { DeductionsConfiguration } from '../components/DeductionsConfiguration';
import { WorkdaysConfiguration } from '../components/WorkdaysConfiguration';
import { OvertimeConfiguration } from '../components/OvertimeConfiguration';
import { PayrollPeriodConfiguration } from '../components/PayrollPeriodConfiguration';
import { FiscalYearConfiguration } from '../components/FiscalYearConfiguration';

import { PayslipNotificationSettingsConfiguration } from '../components/PayslipNotificationSettingsConfiguration';
import { CurrencyConfiguration } from '../components/CurrencyConfiguration';
import { PayFrequencyConfiguration } from '../components/PayFrequencyConfiguration';

// Redux
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { configurationActions } from '../store/configurationSlice';

// ── Tab definitions with icons, labels, and grouping ──────────
interface TabDef {
  id: string;
  label: string;
  icon: React.ElementType;
  category: 'compensation' | 'time' | 'operations' | 'financial';
}

const tabs: TabDef[] = [
  // Compensation
  { id: 'tax',           label: 'Tax',             icon: Receipt,        category: 'compensation' },
  { id: 'pension',       label: 'Pension',         icon: Shield,         category: 'compensation' },
  { id: 'allowances',    label: 'Earning Types',   icon: Wallet,         category: 'compensation' },
  { id: 'deductions',    label: 'Deductions',      icon: TrendingDown,   category: 'compensation' },
  // Time & Attendance
  { id: 'workdays',      label: 'Workdays',        icon: CalendarCheck,  category: 'time' },
  { id: 'overtime',      label: 'Overtime',        icon: Clock,          category: 'time' },
  { id: 'fiscal',        label: 'Fiscal Year',     icon: CalendarDays,   category: 'time' },
  { id: 'period',        label: 'Payroll Period',  icon: Calendar,       category: 'time' },
  // Operations

  { id: 'notifications', label: 'Notifications',   icon: Bell,           category: 'operations' },
  // Financial
  { id: 'currency',      label: 'Currency',        icon: CircleDollarSign, category: 'financial' },
  { id: 'pay-frequency', label: 'Pay Frequency',   icon: RefreshCw,      category: 'financial' },
];

const categoryMeta: Record<string, { label: string; icon: React.ElementType }> = {
  compensation: { label: 'Compensation', icon: DollarSign },
  time:         { label: 'Time & Attendance', icon: Clock },
  operations:   { label: 'Operations', icon: Settings },
  financial:    { label: 'Financial', icon: Landmark },
};

/**
 * ConfigurationPage component providing the main system configuration interface.
 * Features a premium vertical sidebar navigation with categorized tab groups,
 * spring animations, and responsive layout.
 */
export const ConfigurationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabs.find(t => t.id === tabFromUrl)?.id || 'tax';
  const [activeTab, setActiveTab] = React.useState(initialTab);

  // ── Tab groups for sidebar ──────────────────────────────────
  const tabGroups = useMemo(() => {
    const groups: { category: string; tabs: TabDef[] }[] = [];
    const seen = new Set<string>();
    for (const tab of tabs) {
      if (!seen.has(tab.category)) {
        seen.add(tab.category);
        groups.push({ category: tab.category, tabs: tabs.filter(t => t.category === tab.category) });
      }
    }
    return groups;
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  }, [setSearchParams]);

  const dispatch = useAppDispatch();

  // Dispatch all fetch requests on mount
  useEffect(() => {
    dispatch(configurationActions.fetchTaxBracketsRequest({ page: 1, limit: 100 }));
    dispatch(configurationActions.fetchPensionRulesRequest());
    dispatch(configurationActions.fetchAllowancesRequest({ page: 1, limit: 100 }));
    dispatch(configurationActions.fetchDeductionsRequest({ page: 1, limit: 100 }));
    dispatch(configurationActions.fetchWorkdaysRequest());
    dispatch(configurationActions.fetchOvertimeRulesRequest());
    dispatch(configurationActions.fetchPayrollPeriodsRequest());
    dispatch(configurationActions.fetchFiscalYearsRequest());

    dispatch(configurationActions.fetchPayslipNotificationSettingsRequest());
    dispatch(configurationActions.fetchCurrenciesRequest());
    dispatch(configurationActions.fetchCurrencyRatesRequest());
    dispatch(configurationActions.fetchPayFrequenciesRequest({ page: 1, limit: 100 }));
  }, [dispatch]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tax':
        return <TaxConfiguration />;
      case 'pension':
        return <PensionConfiguration />;
      case 'allowances':
        return <AllowancesConfiguration />;
      case 'deductions':
        return <DeductionsConfiguration />;
      case 'workdays':
        return <WorkdaysConfiguration />;
      case 'overtime':
        return <OvertimeConfiguration />;
      case 'period':
        return <PayrollPeriodConfiguration />;
      case 'fiscal':
        return <FiscalYearConfiguration />;

      case 'notifications':
        return <PayslipNotificationSettingsConfiguration />;
      case 'currency':
        return <CurrencyConfiguration />;
      case 'pay-frequency':
        return <PayFrequencyConfiguration />;
      default:
        return (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Configuration Module</h4>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">This configuration sub-module is currently restricted to system administrators.</p>
            </div>
            <button
              onClick={() => handleTabChange('tax')}
              className="text-emerald-600 font-bold text-xs hover:underline"
            >
              Return to Tax Configuration
            </button>
          </motion.div>
        );
    }
  };

  // ── Current active tab for breadcrumb ───────────────────────
  const activeTabDef = useMemo(() => tabs.find(t => t.id === activeTab), [activeTab]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20 px-4 md:px-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            <Settings className="w-3.5 h-3.5" />
            <span>Administration</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-600">Configuration</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            System Configuration
          </h1>
          <p className="text-slate-500 font-medium mt-1.5">
            Manage core payroll rules and global system settings
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3.5 py-2 rounded-xl">
          <Calendar className="w-3.5 h-3.5" />
          <span>Changes apply to active fiscal cycle</span>
        </div>
      </div>

      {/* ── Main layout: Sidebar + Content ────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* ══ Sidebar Navigation (md+) ══════════════════════════ */}
        <aside className="hidden md:block w-[220px] flex-shrink-0 self-start">
          <div className="sticky top-8 bg-white border border-slate-200/70 rounded-2xl shadow-sm p-3.5 space-y-5">
            {tabGroups.map((group, gi) => {
              const meta = categoryMeta[group.category];
              return (
                <div key={group.category}>
                  {/* Divider between groups */}
                  {gi > 0 && <div className="border-t border-slate-100 mb-4" />}
                  {/* Category header with separator */}
                  <div className="flex items-center gap-2.5 px-2.5 mb-2 mt-1 first:mt-0">
                    <div className="w-5 h-5 rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-500">
                      <meta.icon className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.1em]">
                      {meta.label}
                    </span>
                  </div>

                  {/* Tab items */}
                  <div className="space-y-0.5">
                    {group.tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <motion.button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          whileHover={{ x: 3 }}
                          whileTap={{ scale: 0.97 }}
                          className={cn(
                            'cursor-pointer relative w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-xl transition-all duration-200 text-left',
                            isActive
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                          )}
                        >
                          {/* Active indicator bar */}
                          {isActive && (
                            <motion.div
                              layoutId="activeTabBar"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4.5 bg-emerald-500 rounded-full"
                              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                            />
                          )}

                          {/* Icon */}
                          <div className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0',
                            isActive
                              ? 'bg-emerald-100 text-emerald-600 shadow-sm'
                              : 'bg-slate-100 text-slate-400',
                          )}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>

                          {/* Label */}
                          <span className={cn(
                            'truncate text-sm',
                            isActive && 'font-bold',
                          )}>
                            {tab.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ══ Mobile Tab Strip (< md) ═══════════════════════════ */}
        <div className="flex md:hidden overflow-x-auto no-scrollbar gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl -mx-4 px-4 mb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0',
                  isActive
                    ? 'bg-white text-emerald-700 shadow-sm shadow-emerald-900/5'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ══ Content Area ══════════════════════════════════════ */}
        <main className="flex-1 min-w-0">
          {/* Breadcrumb context for active section */}
          <div className="hidden md:flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center">
              {activeTabDef && <activeTabDef.icon className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
            <span className="text-sm font-bold text-slate-700">
              {activeTabDef?.label ?? 'Configuration'}
            </span>
            <span className="text-slate-300 font-medium mx-0.5">/</span>
            <span className="text-xs text-slate-400 font-medium">
              {categoryMeta[activeTabDef?.category ?? '']?.label ?? ''}
            </span>
          </div>

          {/* Tab content — wrapped in a clean card without overflow-hidden
              so tables and other overflowing content scroll freely */}
          <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm p-6 md:p-8">
            {renderTabContent()}
          </div>
        </main>
      </div>

      {/* ── Footer Info ────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 rounded-2xl p-6 md:p-8 flex items-start gap-5 shadow-sm mt-6">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-amber-500 shadow-sm border border-slate-100 flex-shrink-0">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 text-base tracking-tight">Configuration Authority</h4>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed max-w-2xl font-medium">
            These settings define the mathematical backbone of your payroll system. Any modifications here will propagate across all employee calculations for the active fiscal cycle. Ensure compliance with federal labor regulations before committing changes.
          </p>
        </div>
      </div>
    </div>
  );
};
