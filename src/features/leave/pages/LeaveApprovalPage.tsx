import React, { Suspense } from 'react';
import { CalendarDays, Clock } from 'lucide-react';

const LeaveApplicationsSection = React.lazy(() =>
  import('../components/LeaveApplicationsSection').then((module) => ({
    default: module.LeaveApplicationsSection,
  }))
);

/**
 * LeaveApprovalPage — Dedicated page for Department Managers to
 * view and manage leave applications scoped to their department.
 *
 * Uses the LeaveApplicationsSection component directly to avoid
 * circular dependencies with the attendance feature.
 *
 * TODO: Add period picker scoped to the current active payroll period
 * and department-level filtering for Department Manager role.
 */
const LeaveApprovalPage: React.FC = () => {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Leave Applications
          </h1>
          <p className="text-slate-500 text-sm">
            View and approve leave requests for your department
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 uppercase tracking-wider text-sm">
                Pending Leave Requests
              </h3>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                Review and approve/decline requests from your team
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Suspense fallback={<div className="text-sm text-slate-500">Loading leave applications...</div>}>
            <LeaveApplicationsSection
              periodId={null}
              periodStart=""
              periodEnd=""
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default LeaveApprovalPage;
