import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  RefreshCw,
  Clock,
  ChevronDown,
  BadgeCheck,
  Lock,
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { toast } from "../../../components/ui/Toast";
import { payrollRunApi } from "../../payrollProcessing/api/payrollProcessingApi";
import { payrollPeriodApi } from "../../configuration/api/configurationApi";
import { attendanceApi } from "../../attendance/api/attendanceApi";
import {
  fetchAttendanceImportSummary,
  fetchPayrollRunSummary,
  requestApproval as apiRequestApproval,
  approveRequest as apiApproveRequest,
  rejectRequest as apiRejectRequest,
  fetchApprovalStatus,
  fetchApprovalWorkflow,
  fetchWorkflowForCompany,
  fetchRolePermissions,
  fetchRoleLabels,
  fetchRoles,
  type ApprovalWorkflowConfig,
} from "../api/approvalWorkflowApi";
import type {
  AttendanceImportSummary,
  PayrollRunSummary,
  RolePermissions,
  ApprovalWorkflowStep,
} from "../types/approvalWorkflow.types";
import {
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_LABELS as FALLBACK_ROLE_LABELS,
} from "../types/approvalWorkflow.types";
import { downloadPaymentExcel, downloadPaymentCsv } from "../api/paymentExportApi";
import {
  PipelineTimeline,
  AttendanceStage,
  PayrollStage,
  PaymentStage,
  ApprovalHistoryTimeline,
  type TimelineStage
} from "../components";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_WORKFLOW_STEPS: ApprovalWorkflowStep[] = [
  { id: "default-step-attendance", stageType: "ATTENDANCE", stepOrder: 1, requiredRoleId: 14, requiredRole: { id: 14, name: "HR CS Manager" }, alternateRoleId: null, isRequired: true },
  { id: "default-step-attendance-2", stageType: "ATTENDANCE", stepOrder: 2, requiredRoleId: 15, requiredRole: { id: 15, name: "HR CS Director" }, alternateRoleId: null, isRequired: true },
  { id: "default-step-hr-approval", stageType: "PAYROLL_APPROVAL", stepOrder: 3, requiredRoleId: 14, requiredRole: { id: 14, name: "HR CS Manager" }, alternateRoleId: null, isRequired: true },
  { id: "default-step-payment", stageType: "PAYMENT_FILE", stepOrder: 4, requiredRoleId: 16, requiredRole: { id: 16, name: "Finance Officer" }, alternateRoleId: null, isRequired: true },
  { id: "default-step-payment-2", stageType: "PAYMENT_FILE", stepOrder: 5, requiredRoleId: 17, requiredRole: { id: 17, name: "Finance Manager" }, alternateRoleId: null, isRequired: true },
];

function resolveRoleNameFromId(roleId: number, dynamicRoles: { id: number; name: string }[] | null): string | null {
  const match = dynamicRoles?.find((r) => r.id === roleId);
  if (match?.name) return match.name;
  const step = DEFAULT_WORKFLOW_STEPS.find((s) => s.requiredRoleId === roleId);
  if (step?.requiredRole?.name) return step.requiredRole.name;
  return null;
}

function roleNamesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "_");
  return norm(a) === norm(b);
}

export const ApprovalWorkflowPage: React.FC = () => {
  const authUser = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();

  const [currentRole, setCurrentRole] = useState<string>(() => {
    if (authUser?.role?.name) return authUser.role.name.toUpperCase().replace(/\s+/g, "_");
    return "ADMIN";
  });

  const [loading, setLoading] = useState(true);
  const [stage1Loading, setStage1Loading] = useState(false);
  const [stage2Loading, setStage2Loading] = useState(false);
  
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [stage1Data, setStage1Data] = useState<AttendanceImportSummary | null>(null);
  const [stage2Data, setStage2Data] = useState<PayrollRunSummary | null>(null);

  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
  const [stage1ApprovalStatus, setStage1ApprovalStatus] = useState<"NONE" | "PENDING" | "APPROVED" | "REJECTED">("NONE");
  const [stage1ApprovalsSummary, setStage1ApprovalsSummary] = useState<{ label: string; status: "done" | "todo" }[]>([]);
  const [stage1RequestId, setStage1RequestId] = useState<string | null>(null);
  const [stage1ApprovalStep, setStage1ApprovalStep] = useState<{ requiredRoleId: number; requiredRoleName: string } | null>(null);
  const [stage1Submitting, setStage1Submitting] = useState(false);
  const [stage2Submitting, setStage2Submitting] = useState(false);

  const [currentApprovalStep, setCurrentApprovalStep] = useState<any>(null);
  const [currentPayrollStep, setCurrentPayrollStep] = useState<{ requiredRoleId: number; requiredRoleName: string } | null>(null);
  const [dynamicRoles, setDynamicRoles] = useState<{ id: number; name: string }[] | null>(null);
  const [dynamicRolePermissions, setDynamicRolePermissions] = useState<Record<string, any> | null>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);

  // ── Logic: Data Fetching ───────────────────────────────────────────────────

  const loadStage1 = useCallback(async (periodId: string) => {
    if (!periodId) return;
    setStage1Loading(true);
    try {
      const importsRes = await attendanceApi.listImports();
      const activeImport = importsRes.find((i: any) => i.payrollPeriodId === periodId && i.isActive) || importsRes.find((i: any) => i.payrollPeriodId === periodId);
      
      if (!activeImport) {
        setStage1Data(null);
        setStage1ApprovalStatus("NONE");
        setStage1ApprovalsSummary([]);
        setStage1ApprovalStep(null);
        setActiveImportId(null);
        return;
      }

      setActiveImportId(activeImport.id);

      const [data, requests] = await Promise.all([
        fetchAttendanceImportSummary(activeImport.id),
        fetchApprovalStatus({ attendanceImportId: activeImport.id })
      ]);

      setStage1Data(data);
      const req = requests.find((r: any) => r.referenceType === "ATTENDANCE_IMPORT");

      if (req) {
        setStage1ApprovalStatus(req.status as any);
        setStage1RequestId(req.id);
        
        const stageSteps = (workflowSteps.length ? workflowSteps : DEFAULT_WORKFLOW_STEPS)
          .filter((s: any) => s.stageType === "ATTENDANCE")
          .sort((a: any, b: any) => a.stepOrder - b.stepOrder);

        const doneRoleNames = new Set((req.approvalActions || []).filter((a: any) => a.action === "APPROVED").map((a: any) => a.actor?.role?.name).filter(Boolean));
        const doneRoleIds = new Set((req.approvalActions || []).filter((a: any) => a.action === "APPROVED").map((a: any) => a.actor?.role?.id).filter((id: any) => id != null));

        const isStepDone = (s: any): boolean =>
          doneRoleNames.has(s.requiredRole?.name) || doneRoleNames.has(s.alternateRoleName) ||
          doneRoleIds.has(s.requiredRoleId) || (s.alternateRoleId != null && doneRoleIds.has(s.alternateRoleId));

        setStage1ApprovalsSummary(stageSteps.map((s: any) => ({ label: s.requiredRole?.name || `Role#${s.requiredRoleId}`, status: isStepDone(s) ? "done" : "todo" })));
        const nextStep = stageSteps.find((s: any) => !isStepDone(s));
        setStage1ApprovalStep(nextStep ? { requiredRoleId: nextStep.requiredRoleId, requiredRoleName: nextStep.requiredRole?.name || resolveRoleNameFromId(nextStep.requiredRoleId, dynamicRoles) || `Role#${nextStep.requiredRoleId}` } : null);
      } else {
        setStage1ApprovalStatus("NONE");
        setStage1ApprovalsSummary([]);
        setStage1ApprovalStep(null);
      }
    } catch (err) {
      console.error("Stage 1 Error:", err);
    } finally {
      setStage1Loading(false);
    }
  }, [workflowSteps, dynamicRoles]);

  const loadStage2 = useCallback(async (periodId: string) => {
    if (!periodId) return;
    setStage2Loading(true);
    try {
      const runsRes = await payrollRunApi.getRuns({ payrollPeriodId: periodId });
      const allRuns = runsRes.data?.data || [];
      if (allRuns.length === 0) {
        setStage2Data(null);
        setCurrentApprovalStep(null);
        setCurrentPayrollStep(null);
        return;
      }

      const summaries = await Promise.all(allRuns.map((r: any) => fetchPayrollRunSummary(r.id)));
      const aggregated: PayrollRunSummary = {
        runId: allRuns.map((r: any) => r.id).join(","),
        status: summaries.some(s => s.status === "REJECTED") ? "REJECTED" : summaries.every(s => s.status === "DONE") ? "DONE" : summaries.every(s => s.status === "APPROVED" || s.status === "DONE") ? "APPROVED" : "PENDING",
        employeeCount: summaries.reduce((s, sm) => s + sm.employeeCount, 0),
        totalGross: summaries.reduce((s, sm) => s + sm.totalGross, 0),
        totalNet: summaries.reduce((s, sm) => s + sm.totalNet, 0),
        totalTax: summaries.reduce((s, sm) => s + sm.totalTax, 0),
        totalPension: summaries.reduce((s, sm) => s + sm.totalPension, 0),
        totalOvertime: summaries.reduce((s, sm) => s + sm.totalOvertime, 0),
        totalCostToCompany: summaries.reduce((s, sm) => s + sm.totalCostToCompany, 0),
        periodName: summaries[0]?.periodName || "",
      } as any;
      setStage2Data(aggregated);

      const requests = await fetchApprovalStatus({ payrollPeriodId: periodId });
      setAllRequests(requests);
      const activeStep = requests.find(r => (r.stageType === "PAYROLL_APPROVAL" || r.stageType === "PAYMENT_FILE") && r.status === "PENDING");
      setCurrentApprovalStep(activeStep || null);

      // Resolve the workflow step for the active payroll approval request
      if (activeStep && activeStep.stageType === "PAYROLL_APPROVAL") {
        const stageSteps = (workflowSteps.length ? workflowSteps : DEFAULT_WORKFLOW_STEPS)
          .filter((s: any) => s.stageType === "PAYROLL_APPROVAL")
          .sort((a: any, b: any) => a.stepOrder - b.stepOrder);

        const doneRoleNames = new Set((activeStep.approvalActions || []).filter((a: any) => a.action === "APPROVED").map((a: any) => a.actor?.role?.name).filter(Boolean));
        const doneRoleIds = new Set((activeStep.approvalActions || []).filter((a: any) => a.action === "APPROVED").map((a: any) => a.actor?.role?.id).filter((id: any) => id != null));

        const isStepDone = (s: any): boolean =>
          doneRoleNames.has(s.requiredRole?.name) || doneRoleNames.has(s.alternateRoleName) ||
          doneRoleIds.has(s.requiredRoleId) || (s.alternateRoleId != null && doneRoleIds.has(s.alternateRoleId));

        const nextStep = stageSteps.find((s: any) => !isStepDone(s));
        setCurrentPayrollStep(nextStep ? { requiredRoleId: nextStep.requiredRoleId, requiredRoleName: nextStep.requiredRole?.name || resolveRoleNameFromId(nextStep.requiredRoleId, dynamicRoles) || `Role#${nextStep.requiredRoleId}` } : null);
      } else if (activeStep && activeStep.stageType === "PAYMENT_FILE") {
        const stageSteps = (workflowSteps.length ? workflowSteps : DEFAULT_WORKFLOW_STEPS)
          .filter((s: any) => s.stageType === "PAYMENT_FILE")
          .sort((a: any, b: any) => a.stepOrder - b.stepOrder);

        const doneRoleNames = new Set((activeStep.approvalActions || []).filter((a: any) => a.action === "APPROVED").map((a: any) => a.actor?.role?.name).filter(Boolean));
        const doneRoleIds = new Set((activeStep.approvalActions || []).filter((a: any) => a.action === "APPROVED").map((a: any) => a.actor?.role?.id).filter((id: any) => id != null));

        const isStepDone = (s: any): boolean =>
          doneRoleNames.has(s.requiredRole?.name) || doneRoleNames.has(s.alternateRoleName) ||
          doneRoleIds.has(s.requiredRoleId) || (s.alternateRoleId != null && doneRoleIds.has(s.alternateRoleId));

        const nextStep = stageSteps.find((s: any) => !isStepDone(s));
        setCurrentPayrollStep(nextStep ? { requiredRoleId: nextStep.requiredRoleId, requiredRoleName: nextStep.requiredRole?.name || resolveRoleNameFromId(nextStep.requiredRoleId, dynamicRoles) || `Role#${nextStep.requiredRoleId}` } : null);
      } else {
        setCurrentPayrollStep(null);
      }
    } catch (err) {
      console.error("Stage 2 Error:", err);
    } finally {
      setStage2Loading(false);
    }
  }, [workflowSteps, dynamicRoles]);

  // ── Logic: Action Handlers ─────────────────────────────────────────────────

  const handleApprove = async (requestId: string) => {
    try {
      await apiApproveRequest(requestId);
      toast.success("Authorization successful");
      if (selectedPeriod) { loadStage1(selectedPeriod.id); loadStage2(selectedPeriod.id); }
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      await apiRejectRequest(requestId, reason);
      toast.success("Returned for changes");
      if (selectedPeriod) { loadStage1(selectedPeriod.id); loadStage2(selectedPeriod.id); }
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleSubmitAttendance = async () => {
    if (!activeImportId) return;
    setStage1Submitting(true);
    try {
      const { tokenStorage } = await import("../../../lib/token");
      const response = await fetch(`/api/v1/attendance/imports/${activeImportId}/submit-for-approval`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenStorage.getToken()}`,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success("Attendance submitted for approval");
        if (selectedPeriod) loadStage1(selectedPeriod.id);
      } else {
        toast.error(result.message || "Failed to submit attendance");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit attendance for approval");
    } finally {
      setStage1Submitting(false);
    }
  };

  const handleSubmitPayroll = async () => {
    if (!selectedPeriod) return;
    setStage2Submitting(true);
    try {
      await apiRequestApproval("PAYROLL_APPROVAL", "PAYROLL_RUN", undefined, undefined, selectedPeriod.id);
      toast.success("Payroll submitted for approval");
      loadStage2(selectedPeriod.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to submit payroll for approval");
    } finally {
      setStage2Submitting(false);
    }
  };

  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const handleSubmitPayment = async () => {
    if (!selectedPeriod) return;
    setPaymentSubmitting(true);
    try {
      await apiRequestApproval("PAYMENT_FILE", "PAYROLL_RUN", undefined, undefined, selectedPeriod.id);
      toast.success("Payment submitted for approval");
      loadStage2(selectedPeriod.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to submit payment for approval");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [ppsRes, rolesRes, permsRes, wf] = await Promise.all([
          payrollPeriodApi.getAll(),
          fetchRoles(),
          fetchRolePermissions(),
          fetchApprovalWorkflow()
        ]);
        const pps = ppsRes.data?.data || [];
        setPeriods(pps);
        setDynamicRoles(rolesRes || []);
        setDynamicRolePermissions(permsRes || {});
        setWorkflowSteps(wf?.steps || DEFAULT_WORKFLOW_STEPS);
        if (pps.length > 0) setSelectedPeriod(pps[0]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => { if (selectedPeriod) { loadStage1(selectedPeriod.id); loadStage2(selectedPeriod.id); } }, [selectedPeriod, loadStage1, loadStage2]);

  // ── Derived UI State ───────────────────────────────────────────────────────

  const stages: TimelineStage[] = useMemo(() => [
    { id: "att", name: "Attendance", status: stage1ApprovalStatus === "APPROVED" ? "done" : "doing" },
    { id: "pay", name: "Payroll", status: stage2Data?.status === "APPROVED" || stage2Data?.status === "DONE" ? "done" : stage1ApprovalStatus === "APPROVED" ? "doing" : "todo" },
    { id: "dis", name: "Payment", status: stage2Data?.status === "DONE" ? "done" : (stage2Data?.status === "APPROVED" ? "doing" : "todo") },
  ], [stage1ApprovalStatus, stage2Data]);

  const activeIndex = useMemo(() => {
    if (stage2Data?.status === "DONE") return 3;
    if (stage2Data?.status === "APPROVED") return 2;
    if (stage1ApprovalStatus === "APPROVED") return 1;
    return 0;
  }, [stage1ApprovalStatus, stage2Data]);

  const userRoleName = authUser?.role?.name;
  const userRoleId = authUser?.role?.id;

  // Role-based visibility: which stages can this user interact with?
  const HR_ROLES = ["HR Generalist", "HR CS Manager", "HR CS Director"];
  const FINANCE_ROLES = ["Finance Officer", "Finance Manager"];
  const isHrRole = HR_ROLES.some(r => roleNamesMatch(r, userRoleName));
  const isFinanceRole = FINANCE_ROLES.some(r => roleNamesMatch(r, userRoleName));

  const matchesApproverRole = (step: any): boolean => {
    if (!step) return false;
    // Resolve role name from step → dynamicRoles → fallback to Role#<id>
    const reqRole = step.requiredRoleName
      || step.requiredRole?.name
      || resolveRoleNameFromId(step.requiredRoleId, dynamicRoles);
    if (roleNamesMatch(reqRole, userRoleName)) return true;
    const roleIdMatch = reqRole?.match(/^Role#(\d+)$/i);
    if (roleIdMatch && parseInt(roleIdMatch[1], 10) === userRoleId) return true;
    return step.requiredRoleId === userRoleId;
  };

  const isStage1Approver = isHrRole && stage1ApprovalStatus === "PENDING" && matchesApproverRole(stage1ApprovalStep);

  const resolveRoleLabel = (key: string): string => {
    // Try numeric ID lookup first
    const numId = Number(key);
    if (!isNaN(numId)) {
      const found = dynamicRoles?.find(r => r.id === numId);
      if (found) return found.name;
    }
    // Fallback to name lookup or key itself
    return dynamicRoles?.find(r => r.name === key)?.name || key;
  };

  const handleViewAttendanceStats = () => {
    if (activeImportId) {
      navigate(`/approval/attendance-stats?importId=${activeImportId}`);
    }
  };

  const handleViewPayrollStats = () => {
    if (selectedPeriod?.id) {
      navigate(`/approval/payroll-stats?periodId=${selectedPeriod.id}`);
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] -m-8 overflow-hidden bg-white selection:bg-brand-light font-sans">
      <aside className="w-80 border-r border-slate-100 bg-slate-50/30 hidden xl:block overflow-y-auto custom-scrollbar">
        <div className="p-10 space-y-12 h-full flex flex-col">
          <div className="space-y-4">
             <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white shadow-lg">
                <BadgeCheck className="w-6 h-6" />
             </div>
             <div>
                <p className="text-2xl font-bold tracking-tight text-slate-900 leading-none">Workflow</p>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2 opacity-60">Pipeline</p>
             </div>
          </div>
          <div className="flex-1">
             <PipelineTimeline stages={stages} activeIndex={activeIndex} />
          </div>
          <div className="pt-8 border-t border-slate-200">
             <div className="p-6 rounded-2xl bg-brand-light/40 border border-brand-primary/10">
                <p className="text-[10px] font-bold text-brand-accent uppercase tracking-widest mb-1.5">Active Period</p>
                <p className="text-sm font-bold text-slate-900 tracking-tight">{selectedPeriod?.name || "Loading..."}</p>
             </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar bg-white relative">
        <header className="sticky top-0 z-30 px-12 py-6 glass border-b border-slate-100">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                 <div className="relative group">
                    <select 
                      value={selectedPeriod?.id}
                      onChange={(e) => setSelectedPeriod(periods.find(p => p.id === e.target.value))}
                      className="appearance-none bg-slate-50 border border-slate-200 px-6 py-2.5 rounded-full text-xs font-bold text-slate-800 focus-ring outline-hidden pr-10 cursor-pointer"
                    >
                      {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none group-hover:text-brand-primary transition-colors" />
                 </div>
                 <div className="h-5 w-px bg-slate-200" />
                  <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm">
                     <div className="w-2 h-2 rounded-full bg-brand-primary" />
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                       {stage2Data?.status === "DONE" ? "Completed" : stage2Data?.status === "APPROVED" ? "Approved" : stage1ApprovalStatus === "APPROVED" ? "Attendance Approved" : stage2Data?.status || "Idle"}
                     </span>
                  </div>
              </div>
              <button onClick={() => selectedPeriod && (loadStage1(selectedPeriod.id) || loadStage2(selectedPeriod.id))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-brand-primary/30 flex items-center justify-center text-slate-400 hover:text-brand-primary transition-all active:scale-90">
                <RefreshCw className={cn("w-4 h-4", (stage1Loading || stage2Loading) && "animate-spin")} />
              </button>
           </div>
        </header>

        <div className="max-w-4xl mx-auto p-12 space-y-16 pb-48">
          <header className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">Approval Workflow</h2>
            <p className="text-lg text-slate-500 font-medium leading-relaxed tracking-tight max-w-2xl">
              Track the sequential approval of attendance data, payroll calculations, and payment disbursement for the current cycle.
            </p>
          </header>

          <div className="space-y-12">
             <AttendanceStage 
               data={stage1Data}
               loading={stage1Loading}
               approvalStatus={stage1ApprovalStatus}
               approvalsSummary={stage1ApprovalsSummary}
               isApprover={isStage1Approver} 
               onRefresh={() => selectedPeriod && loadStage1(selectedPeriod.id)}
               onApprove={() => stage1RequestId && handleApprove(stage1RequestId)}
               onReject={(reason) => stage1RequestId && handleReject(stage1RequestId, reason)}
               onSubmit={isHrRole ? handleSubmitAttendance : undefined}
               submitting={stage1Submitting}
               onViewStats={handleViewAttendanceStats}
             />

             <PayrollStage 
               data={stage2Data}
               loading={stage2Loading}
               approvalStatus={
                 (stage2Data?.status === "APPROVED" || stage2Data?.status === "DONE" || currentApprovalStep?.stageType === "PAYMENT_FILE")
                   ? "APPROVED"
                   : currentApprovalStep?.stageType === "PAYROLL_APPROVAL"
                     ? "PENDING"
                     : "NONE"
               }
               isApprover={isHrRole && currentApprovalStep?.stageType === "PAYROLL_APPROVAL" && matchesApproverRole(currentPayrollStep)}
               onRefresh={() => selectedPeriod && loadStage2(selectedPeriod.id)}
               onApprove={() => currentApprovalStep?.id && handleApprove(currentApprovalStep.id)}
               onReject={(reason) => currentApprovalStep?.id && handleReject(currentApprovalStep.id, reason)}
               onSubmit={isHrRole ? handleSubmitPayroll : undefined}
               submitting={stage2Submitting}
               onViewStats={handleViewPayrollStats}
             />

              <PaymentStage 
                data={stage2Data}
                loading={stage2Loading}
                approvalStatus={stage2Data?.status === "DONE" ? "APPROVED" : (currentApprovalStep?.stageType === "PAYMENT_FILE" ? "PENDING" : "NONE")}
                isApprover={isFinanceRole && currentApprovalStep?.stageType === "PAYMENT_FILE" && matchesApproverRole(currentPayrollStep)}
                onApprove={() => currentApprovalStep?.id && handleApprove(currentApprovalStep.id)}
                onReject={(reason) => currentApprovalStep?.id && handleReject(currentApprovalStep.id, reason)}
                onSubmit={
                  isFinanceRole && stage2Data?.status === "APPROVED" && !currentApprovalStep
                    ? handleSubmitPayment
                    : undefined
                }
                submitting={paymentSubmitting}
                onDownloadExcel={() => stage2Data && downloadPaymentExcel(stage2Data.runId)}
                onDownloadCsv={() => stage2Data && downloadPaymentCsv(stage2Data.runId)}
              />
          </div>

          <section className="pt-20 border-t border-slate-100">
             <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                   <Clock className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-slate-900 tracking-tight">Audit Trail</h3>
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">Approval History</p>
                </div>
             </div>
             <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100">
                <ApprovalHistoryTimeline localApprovalRequests={allRequests} resolveRoleLabel={resolveRoleLabel} />
             </div>
          </section>
        </div>
      </main>
    </div>
  );
};
