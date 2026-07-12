import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCcw, AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { RequestState, ApiError } from '../../../lib/api-client';
import { Button, Skeleton } from '../../ui';

// --- Sub-components for States ---

export const LoadingState: React.FC<{ message?: string; skeleton?: React.ReactNode }> = ({ 
  message = 'Loading data...', 
  skeleton 
}) => (
  <div className="w-full animate-in fade-in duration-500">
    {skeleton || (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">{message}</p>
      </div>
    )}
  </div>
);

export const ErrorState: React.FC<{ 
  error: ApiError; 
  onRetry?: () => void;
  variant?: 'default' | 'network' | 'unauthorized' | 'forbidden' | 'server';
}> = ({ error, onRetry, variant = 'default' }) => {
  const isNetwork = variant === 'network' || error.isNetworkError;
  const isAuth = variant === 'unauthorized' || error.status === 401;
  const isForbidden = variant === 'forbidden' || error.status === 403;
  const isServer = variant === 'server' || error.status >= 500;

  let title = 'Something went wrong';
  let icon = <AlertCircle className="w-8 h-8" />;
  let colorClass = 'bg-rose-100 text-rose-600';
  let containerClass = 'bg-rose-50/50 border-rose-100';

  if (isNetwork) {
    title = 'Connection Issue';
    colorClass = 'bg-amber-100 text-amber-600';
    containerClass = 'bg-amber-50/50 border-amber-100';
  } else if (isAuth || isForbidden) {
    title = isForbidden ? 'Access Denied' : 'Session Expired';
    colorClass = 'bg-slate-100 text-slate-600';
    containerClass = 'bg-slate-50/50 border-slate-100';
  }

  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-[32px] border animate-in zoom-in-95 duration-300 ${containerClass}`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${colorClass}`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-8">{error.message || 'An unexpected error occurred while fetching the data.'}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2 rounded-xl px-6 border-slate-200">
          <RefreshCcw className="w-4 h-4" /> Try Again
        </Button>
      )}
    </div>
  );
};


export const EmptyState: React.FC<{ title?: string; message?: string; icon?: React.ReactNode }> = ({ 
  title = 'No data found', 
  message = 'There is nothing to display at the moment.',
  icon
}) => (
  <div className="flex flex-col items-center justify-center p-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
      {icon || <Inbox className="w-10 h-10" />}
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-sm text-slate-400 max-w-sm">{message}</p>
  </div>
);

// --- Core DataRenderer ---

interface DataRendererProps<T> {
  state: RequestState<T>;
  renderSuccess: (data: T) => React.ReactNode;
  renderLoading?: React.ReactNode;
  renderError?: (error: ApiError) => React.ReactNode;
  renderEmpty?: React.ReactNode;
  skeleton?: React.ReactNode;
  onRetry?: () => void;
  /**
   * Optional logic to determine if data is "empty"
   * Default: checks if data is null, or an empty array
   */
  isEmpty?: (data: T | null) => boolean;
}

/**
 * Enterprise DataRenderer
 * Centralizes the handling of all possible data states.
 */
export function DataRenderer<T>({
  state,
  renderSuccess,
  renderLoading,
  renderError,
  renderEmpty,
  skeleton,
  onRetry,
  isEmpty = (data) => data === null || (Array.isArray(data) && data.length === 0),
}: DataRendererProps<T>) {
  const { data, loading, error, isRefreshing } = state;

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        {/* Loading State - only show if not already refreshing (to avoid flickering on background refresh) */}
        {loading && !isRefreshing && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderLoading || <LoadingState skeleton={skeleton} />}
          </motion.div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {renderError ? renderError(error) : <ErrorState error={error} onRetry={onRetry} />}
          </motion.div>
        )}

        {/* Success vs Empty State */}
        {!loading && !error && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            {isEmpty(data) ? (
              renderEmpty || <EmptyState />
            ) : (
              // We cast here because isEmpty ensures data is not null for the success branch
              renderSuccess(data as T)
            )}
            
            {/* Background refreshing indicator overlay */}
            {isRefreshing && (
              <div className="absolute top-2 right-2 flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full shadow-sm animate-in fade-in slide-in-from-top-2">
                <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Updating...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
