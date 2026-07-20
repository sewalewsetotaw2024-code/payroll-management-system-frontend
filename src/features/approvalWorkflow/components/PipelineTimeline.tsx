import React from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "../../../lib/utils";

export interface TimelineStage {
  id: string;
  name: string;
  status: "todo" | "doing" | "done";
  description?: string;
}

interface PipelineTimelineProps {
  stages: TimelineStage[];
  activeIndex: number;
}

export const PipelineTimeline: React.FC<PipelineTimelineProps> = ({
  stages,
  activeIndex,
}) => {
  return (
    <div className="relative pl-6 py-6 h-full flex flex-col justify-center">
      {/* Background Track */}
      <div className="absolute left-[39px] top-12 bottom-12 w-0.5 bg-slate-100 rounded-full" />
      
      {/* Progress Track */}
      <motion.div
        className="absolute left-[39px] top-12 w-0.5 bg-brand-primary rounded-full origin-top"
        initial={{ scaleY: 0 }}
        animate={{ 
          scaleY: stages.length > 1 ? activeIndex / (stages.length - 1) : 0
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ height: 'calc(100% - 96px)' }}
      />

      <div className="space-y-16 relative z-10">
        {stages.map((stage, index) => {
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;
          
          return (
            <div key={stage.id} className="flex items-center gap-6">
              {/* Node Container */}
              <div className="relative flex-shrink-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isDone ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-100" :
                    isActive ? "bg-white border-brand-primary text-brand-primary shadow-lg shadow-emerald-50" :
                    "bg-white border-slate-200 text-slate-300"
                  )}
                >
                  {isDone ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
              </div>

              {/* Labels */}
              <div className={cn(
                "flex flex-col gap-0.5 transition-all duration-300",
                isActive ? "opacity-100" : "opacity-50"
              )}>
                <span className={cn(
                  "text-[11px] font-bold uppercase tracking-widest",
                  isActive ? "text-brand-primary" : "text-slate-400"
                )}>
                  Step {index + 1}
                </span>
                <span className={cn(
                  "text-sm font-bold tracking-tight",
                  isActive ? "text-slate-900" : "text-slate-600"
                )}>
                  {stage.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
