import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Check, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ProcessingToastProps {
  status: 'idle' | 'processing' | 'success';
  onClose: () => void;
}

export const ProcessingToast: React.FC<ProcessingToastProps> = ({ status, onClose }) => {
  return (
    <AnimatePresence>
      {status !== 'idle' && (
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="fixed top-24 right-8 z-[100]"
        >
          <div className={cn(
            "px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 transition-all duration-500",
            status === 'processing' 
              ? "bg-white border-slate-200 text-slate-800" 
              : "bg-primary border-brand-600 text-white"
          )}>
            {status === 'processing' ? (
              <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
            )}
            
            <div>
              <p className="font-bold text-sm">
                {status === 'processing' ? 'Processing Payroll...' : 'Processed Successfully'}
              </p>
              <p className={cn(
                "text-[10px] font-medium opacity-70",
                status === 'processing' ? "text-slate-500" : "text-emerald-50"
              )}>
                {status === 'processing' 
                  ? 'Verifying employee data and tax records...' 
                  : 'All records have been finalized and stored.'}
              </p>
            </div>

            {status === 'success' && (
              <button 
                onClick={onClose}
                className="ml-2 p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-4 h-4 opacity-70" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
