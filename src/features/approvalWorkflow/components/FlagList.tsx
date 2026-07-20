import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { PipelineFlag } from "../types/approvalWorkflow.types";

interface FlagListProps {
  flags: PipelineFlag[];
}

export const FlagList: React.FC<FlagListProps> = ({ flags }) => {
  if (flags.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-amber-500" />
        <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
          Items Requiring Attention
        </h4>
      </div>
      {flags.map((flag, i) => (
        <div
          key={i}
          className={cn(
            "flex items-start gap-3 p-3 rounded-xl text-sm shadow-sm",
            flag.type === "error" && "bg-gradient-to-br from-rose-50 to-rose-50/30 border border-rose-200/50",
            flag.type === "warning" && "bg-gradient-to-br from-amber-50 to-amber-50/30 border border-amber-200/50",
            flag.type === "info" && "bg-gradient-to-br from-blue-50 to-blue-50/30 border border-blue-200/50",
          )}
        >
          <AlertCircle
            className={cn(
              "w-4 h-4 mt-0.5 flex-shrink-0",
              flag.type === "error" && "text-rose-500",
              flag.type === "warning" && "text-amber-500",
              flag.type === "info" && "text-blue-500",
            )}
          />
          <span
            className={cn(
              "font-medium text-xs",
              flag.type === "error" && "text-rose-700",
              flag.type === "warning" && "text-amber-700",
              flag.type === "info" && "text-blue-700",
            )}
          >
            {flag.message}
          </span>
        </div>
      ))}
    </div>
  );
};
