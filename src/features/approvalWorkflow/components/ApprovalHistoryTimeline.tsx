import React, { useMemo } from "react";
import {
  History,
  ThumbsUp,
  ThumbsDown,
  Send,
} from "lucide-react";
import { cn } from "../../../lib/utils";

// ── Helpers ───────────────────────────────────────────────

const fmtDateTime = (d: string): string => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const timeAgo = (dateStr: string): string => {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDateTime(dateStr);
};

// ── Props ─────────────────────────────────────────────────

interface ApprovalHistoryTimelineProps {
  localApprovalRequests: any[];
  resolveRoleLabel: (key: string) => string;
  className?: string;
}

// ── Component ─────────────────────────────────────────────

export const ApprovalHistoryTimeline: React.FC<ApprovalHistoryTimelineProps> = ({
  localApprovalRequests = [],
  resolveRoleLabel,
  className,
}) => {
  // Flatten all requests into a sorted list of actions
  const allEvents = useMemo(() => {
    const events: {
      id: string;
      type: "submitted" | "approved" | "rejected";
      stageType: string;
      roleName: string;
      timestamp: string;
      comment?: string;
      status: string;
    }[] = [];

    for (const req of localApprovalRequests) {
      const safeRoleName = req.requestedBy
        ? resolveRoleLabel(req.requestedBy)
        : "System";

      events.push({
        id: `submit-${req.id}`,
        type: "submitted",
        stageType: req.stageType,
        roleName: safeRoleName,
        timestamp: req.requestedAt,
        comment: undefined,
        status: req.status,
      });

      for (const action of req.approvalActions || []) {
        const actorName =
          action.actor?.role?.name ||
          (action.actor?.role?.id != null
            ? resolveRoleLabel(String(action.actor.role.id))
            : null) ||
          "Unknown";
        events.push({
          id: action.id,
          type: action.action === "APPROVED" ? "approved" : "rejected",
          stageType: req.stageType,
          roleName: actorName,
          timestamp: action.actedAt,
          comment: action.comment,
          status: action.action,
        });
      }
    }

    return events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [localApprovalRequests, resolveRoleLabel]);

  if (allEvents.length === 0) return null;

  const stageLabel = (type: string): string => {
    const labels: Record<string, string> = {
      ATTENDANCE: "Attendance Import",
      PAYROLL_APPROVAL: "Payroll Run",
      PAYMENT_FILE: "Payment File",
    };
    return labels[type] ?? type;
  };

  return (
    <div className={cn("bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden", className)}>
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/30 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center shadow-sm">
            <History className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 tracking-tight text-sm">
              Approval History
            </h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
              {allEvents.length} action{allEvents.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="relative">
          {/* Timeline connector line */}
          <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-200 via-slate-200 to-slate-100 rounded-full" />

          <div className="space-y-0">
            {allEvents.map((event) => (
              <div
                key={event.id}
                className="relative flex items-start gap-4 pb-6 last:pb-0"
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    "relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border-2",
                    event.type === "approved" && "bg-brand-100 border-brand-300 text-emerald-600",
                    event.type === "rejected" && "bg-rose-100 border-rose-300 text-rose-600",
                    event.type === "submitted" && "bg-blue-100 border-blue-300 text-blue-600",
                  )}
                >
                  {event.type === "approved" ? (
                    <ThumbsUp className="w-4 h-4" />
                  ) : event.type === "rejected" ? (
                    <ThumbsDown className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-700">
                      {event.roleName}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                        event.type === "approved" && "bg-brand-100 text-emerald-700",
                        event.type === "rejected" && "bg-rose-100 text-rose-700",
                        event.type === "submitted" && "bg-blue-100 text-blue-700",
                      )}
                    >
                      {event.type === "approved"
                        ? "Approved"
                        : event.type === "rejected"
                          ? "Returned"
                          : "Submitted"}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {timeAgo(event.timestamp)}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                    {event.type === "submitted"
                      ? `Submitted ${stageLabel(event.stageType)} for approval`
                      : event.type === "approved"
                        ? `Approved ${stageLabel(event.stageType)}`
                        : `Returned ${stageLabel(event.stageType)} for changes`}
                  </p>

                  {event.comment && (
                    <div className="mt-1.5 p-2 bg-rose-50 border border-rose-100 rounded-lg">
                      <p className="text-[10px] text-rose-600 italic">
                        &ldquo;{event.comment}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
