import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { toast } from "../../../components/ui/Toast";

interface ActionButtonProps {
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  variant?: "primary" | "danger" | "secondary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  hasPermission?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  icon: Icon,
  onClick,
  variant = "primary",
  disabled = false,
  loading = false,
  className,
  hasPermission = true,
}) => {
  const handleClick = () => {
    if (!hasPermission) {
      toast.error("You are not eligible to perform this action");
      return;
    }
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        "px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed",
        variant === "primary" &&
          "text-white bg-gradient-to-r from-primary to-brand-600 hover:from-brand-800 hover:to-brand-600 shadow-lg shadow-brand-900/15",
        variant === "danger" &&
          "text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 shadow-lg shadow-rose-900/15",
        variant === "secondary" &&
          "text-slate-600 border border-slate-200/60 hover:bg-slate-50 bg-white/80 backdrop-blur-sm",
        variant === "ghost" &&
          "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      {label}
    </button>
  );
};
