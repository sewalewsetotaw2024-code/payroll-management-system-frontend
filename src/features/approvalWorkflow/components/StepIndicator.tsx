import React from "react";
import { CheckCircle2, CircleDot, Lock, ArrowRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { PipelineStageStatus } from "../types/approvalWorkflow.types";

interface StepIndicatorProps {
  stages: { id: number; label: string; status: PipelineStageStatus }[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ stages }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {stages.map((stage, i) => (
      <React.Fragment key={stage.id}>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-300",
              stage.status === "completed" &&
                "bg-brand-100 border-brand-400 text-emerald-600 shadow-sm shadow-brand-200",
              stage.status === "active" &&
                "bg-blue-100 border-blue-400 text-blue-600 shadow-sm shadow-blue-200 ring-2 ring-blue-200/50",
              stage.status === "locked" &&
                "bg-slate-100 border-slate-300 text-slate-400",
            )}
          >
            {stage.status === "completed" ? (
              <CheckCircle2 className="w-4.5 h-4.5" />
            ) : stage.status === "active" ? (
              <CircleDot className="w-4 h-4" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
          </div>
          <span
            className={cn(
              "text-xs font-bold uppercase tracking-wider",
              stage.status === "completed" && "text-emerald-600",
              stage.status === "active" && "text-blue-600",
              stage.status === "locked" && "text-slate-400",
            )}
          >
            {stage.label}
          </span>
        </div>
        {i < stages.length - 1 && (
          <ArrowRight className="w-4 h-4 mx-1.5 flex-shrink-0 text-slate-300" />
        )}
      </React.Fragment>
    ))}
  </div>
);
