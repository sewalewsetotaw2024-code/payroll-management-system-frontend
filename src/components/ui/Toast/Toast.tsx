import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  addToast: (message: string, type: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  error: <AlertCircle className="w-5 h-5 text-rose-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  loading: <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />,
};

const theme: Record<ToastType, { border: string; bg: string; text: string; progress: string; close: string; closeHover: string; closeBg: string }> = {
  success: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-800', progress: 'bg-emerald-500', close: 'text-emerald-400', closeHover: 'text-emerald-600', closeBg: 'hover:bg-emerald-100' },
  error: { border: 'border-rose-200', bg: 'bg-rose-50', text: 'text-rose-800', progress: 'bg-rose-500', close: 'text-rose-400', closeHover: 'text-rose-600', closeBg: 'hover:bg-rose-100' },
  warning: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-800', progress: 'bg-amber-500', close: 'text-amber-400', closeHover: 'text-amber-600', closeBg: 'hover:bg-amber-100' },
  info: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-800', progress: 'bg-blue-500', close: 'text-blue-400', closeHover: 'text-blue-600', closeBg: 'hover:bg-blue-100' },
  loading: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-800', progress: 'bg-emerald-500', close: 'text-emerald-400', closeHover: 'text-emerald-600', closeBg: 'hover:bg-emerald-100' },
};

function ToastItemComponent({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const t = theme[item.type];

  useEffect(() => {
    if (item.duration === Infinity || item.type === 'loading') return;
    const startTime = Date.now();
    let frame: number;
    const animate = () => {
      if (!isPaused) {
        const elapsed = Date.now() - startTime;
        setProgress(Math.max(0, 100 - (elapsed / item.duration) * 100));
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [item.duration, isPaused, item.type]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 120, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 120, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.8 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden rounded-2xl shadow-xl border max-w-sm w-full"
      style={{ pointerEvents: 'auto' }}
    >
      <div className={cn('flex items-start gap-3 px-5 py-4', t.bg, t.border, 'border')}>
        <span className="shrink-0 mt-0.5">{icons[item.type]}</span>
        <p className={cn('text-sm font-bold leading-relaxed flex-1', t.text)}>
          {item.message}
        </p>
        <button
          onClick={() => onRemove(item.id)}
          className={cn('p-0.5 rounded-lg transition-colors shrink-0', t.close, t.closeHover, t.closeBg)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {item.duration !== Infinity && item.type !== 'loading' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
          <div className={cn('h-full rounded-full', t.progress)} style={{ width: `${progress}%`, transition: 'width 0.05s linear' }} />
        </div>
      )}
    </motion.div>
  );
}

let globalAddToast: ((message: string, type: ToastType, duration?: number) => string) | null = null;
let globalRemoveToast: ((id: string) => void) | null = null;

export const toast = {
  success: (message: string, duration = 3500) => globalAddToast?.(message, 'success', duration),
  error: (message: string, duration = 4000) => globalAddToast?.(message, 'error', duration),
  warning: (message: string, duration = 3500) => globalAddToast?.(message, 'warning', duration),
  info: (message: string, duration = 3000) => globalAddToast?.(message, 'info', duration),
  loading: (message: string) => globalAddToast?.(message, 'loading', Infinity),
  dismiss: (id?: string) => {
    if (id) globalRemoveToast?.(id);
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const removeToast = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = `toast-${Date.now()}-${++counter.current}`;
    setItems((prev) => [...prev, { id, message, type, duration }]);
    if (duration !== Infinity) {
      setTimeout(() => removeToast(id), duration + 300);
    }
    return id;
  }, [removeToast]);

  useEffect(() => {
    globalAddToast = addToast;
    globalRemoveToast = removeToast;
    return () => {
      globalAddToast = null;
      globalRemoveToast = null;
    };
  }, [addToast, removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[200] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: '420px', maxHeight: 'calc(100vh - 40px)', overflow: 'hidden' }}>
        <AnimatePresence mode="popLayout">
          {items.map((t) => (
            <ToastItemComponent key={t.id} item={t} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
