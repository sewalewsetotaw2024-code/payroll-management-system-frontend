import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Loader2,
  Clock,
  Info,
  CheckCircle2,
  Download,
  PartyPopper,
} from 'lucide-react';
import { motion } from 'motion/react';
import { payslipApi } from '../api/payslipApi';
import { payrollPeriodApi } from '../../configuration/api/configurationApi';
import { slugify } from '../../../lib/utils';
import type {
  PayslipDetail as PayslipDetailType,
  GenerationStatus,
} from '../types/payslip.types';
import { PayslipDetail } from '../components/PayslipDetail';

// ─────────────────────────────────────────────────────────────────────────────
// EmployeePayslipDetailPage
// Fetches payslip detail for a period and renders a status-specific view:
//   • NOT_READY  → "Payslip not yet available"
//   • GENERATING → Pulsing spinner + auto-polling every 5 s
//   • COMPLETED  → Full payslip detail with print/download
//   • FAILED     → Error message + Retry button
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 5000;

export const EmployeePayslipDetailPage: React.FC = () => {
  const { periodSlug, employeeSlug } = useParams<{ periodSlug: string; employeeSlug: string }>();
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get('employeeId') ?? undefined;
  const navigate = useNavigate();

  const [resolvedPeriodId, setResolvedPeriodId] = useState<string | null>(null);
  const [payslipDetail, setPayslipDetail] = useState<PayslipDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Resolve period slug → period ID ──────────────────────────────────────

  useEffect(() => {
    if (!periodSlug) return;
    let cancelled = false;

    payrollPeriodApi.getAll().then((res) => {
      if (cancelled) return;
      const allPeriods = res.data?.data ?? [];
      const matched = allPeriods.find((p: any) => p.name && slugify(p.name) === periodSlug);
      if (matched?.id) {
        setResolvedPeriodId(matched.id);
      } else {
        setError("Period not found");
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) { setError("Failed to resolve period"); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, [periodSlug]);

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchDetail = useCallback(async () => {
    if (!resolvedPeriodId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await payslipApi.getMyPayslipDetail(resolvedPeriodId, employeeId);
      const detail = response.data.data;
      setPayslipDetail(detail);
      setGenerationStatus(detail.generationStatus);
    } catch (err: any) {
      const msg = err?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to load payslip detail');
      // If backend says payslip is not yet available (DRAFT visibility), show NOT_READY state
      if (msg?.includes('not yet available') || err?.response?.status === 404) {
        setGenerationStatus('NOT_READY');
        setPayslipDetail(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [resolvedPeriodId, employeeId]);

  // Initial fetch
  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // ── Auto-polling while GENERATING ────────────────────────────────────────
  // Follows the same pattern as useAttendanceNotifications: setInterval +
  // useRef for cleanup, silent failure on poll errors.

  useEffect(() => {
    if (generationStatus !== 'GENERATING') {
      // Not generating — ensure any stale interval is cleared
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(async () => {
      if (!resolvedPeriodId) return;
      try {
        const response = await payslipApi.getMyPayslipDetail(resolvedPeriodId, employeeId);
        const detail = response.data.data;
        const newStatus = detail.generationStatus;

        setPayslipDetail(detail);
        setGenerationStatus(newStatus);

        // Auto-stop polling once generation completes / fails
        if (newStatus !== 'GENERATING' && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch {
        // Silently fail — polling should not disrupt the UI
      }
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [generationStatus, resolvedPeriodId]);

  // ── Retry handler (FAILED → re-trigger batch generation) ─────────────────

  const handleRetry = async () => {
    if (!payslipDetail?.payrollRunId) return;
    setRetrying(true);
    setRetryError(null);
    try {
      await payslipApi.batchGeneratePayslipPdfs(payslipDetail.payrollRunId);
      // Optimistically switch to GENERATING — polling will confirm
      setGenerationStatus('GENERATING');
    } catch (err: any) {
      setRetryError(
        err?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Failed to retry generation'),
      );
    } finally {
      setRetrying(false);
    }
  };

  // ── Status-based views ───────────────────────────────────────────────────

  // Loading skeleton (initial fetch)
  const LoadingSkeleton = (
    <div className="bg-white/75 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-8 shadow-sm">
      <div className="space-y-4">
        <div className="h-6 bg-slate-100 animate-pulse rounded-lg w-1/3" />
        <div className="h-4 bg-slate-100 animate-pulse rounded-lg w-1/2" />
        <div className="h-px bg-slate-100 my-6" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 bg-slate-100 animate-pulse rounded-lg w-1/4" />
            <div className="h-4 bg-slate-100 animate-pulse rounded-lg w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );

  // NOT_READY — payslip record does not exist yet or is still DRAFT
  const NotReadyView = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center bg-white/75 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-sm"
    >
      <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
        <Info className="w-10 h-10 text-emerald-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">
        Payslip Not Yet Available
      </h3>
      <p className="text-sm text-slate-500 max-w-xs">
        Your payslip for this period is being processed. It will be available once the payment is fully approved.
      </p>
    </motion.div>
  );

  // GENERATING — PDF is being produced; poll until done
  const GeneratingView = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center bg-white/75 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-sm"
    >
      <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center mb-5 animate-pulse">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">
        Generating Payslip…
      </h3>
      <p className="text-sm text-slate-500 max-w-xs">
        Your payslip is being generated. This may take a moment. The page will
        update automatically.
      </p>
      <div className="flex items-center gap-2 mt-6 text-xs text-slate-400">
        <Clock className="w-3.5 h-3.5" />
        <span>Checking every 5 seconds…</span>
      </div>
    </motion.div>
  );

  // FAILED — generation errored; show message + retry
  const FailedView = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center bg-white/75 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-sm"
    >
      <div className="w-20 h-20 rounded-2xl bg-rose-50 flex items-center justify-center mb-5">
        <AlertCircle className="w-10 h-10 text-rose-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">
        Payslip Generation Failed
      </h3>
      <p className="text-sm text-slate-500 mb-2 max-w-sm">
        {payslipDetail?.errorMessage ||
          'An error occurred while generating your payslip.'}
      </p>
      {retryError && (
        <p className="text-sm text-rose-600 mb-4 max-w-sm font-medium">
          {retryError}
        </p>
      )}
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-900/20 active:scale-95 mt-4"
      >
        {retrying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        {retrying ? 'Retrying…' : 'Retry Generation'}
      </button>
    </motion.div>
  );

  // ── Render logic ─────────────────────────────────────────────────────────

  // Success banner when payslip is ready (DONE status after payment approval)
  const ReadyBanner = payslipDetail?.visibilityStatus === 'DONE' && generationStatus === 'COMPLETED' ? (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-emerald-50 via-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
        <PartyPopper className="w-6 h-6 text-emerald-600" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-emerald-800">Your payslip is ready!</h4>
        <p className="text-xs text-emerald-600 mt-0.5">
          Payment has been approved. You can now view and download your payslip.
          {payslipDetail?.paymentDate && (
            <span className="font-medium"> Payment date: {new Date(payslipDetail.paymentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          )}
        </p>
      </div>
      {payslipDetail?.payslipPdfUrl && (
        <a
          href={payslipDetail.payslipPdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shrink-0"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </a>
      )}
    </motion.div>
  ) : null;

  const renderContent = () => {
    if (loading) return LoadingSkeleton;

    // Fetch-level error (before any status was resolved)
    if (error && !generationStatus) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white/75 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Failed to load payslip
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">{error}</p>
          <button
            onClick={fetchDetail}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-brand-800 transition-colors shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    // Status-based rendering
    switch (generationStatus) {
      case 'NOT_READY':
        return NotReadyView;
      case 'GENERATING':
        return GeneratingView;
      case 'FAILED':
        return FailedView;
      case 'COMPLETED':
      default:
        return payslipDetail ? <PayslipDetail data={payslipDetail} /> : null;
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20 px-4 md:px-5">
      {/* Green Gradient Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-brand-800 rounded-2xl p-6 sm:p-8 text-white">
        <div className="absolute -top-1/2 -right-10 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-1/2 right-20 w-48 h-48 rounded-full bg-white/3" />

        <div className="relative z-10">
          <button
            onClick={() => navigate(`/payslips/${periodSlug}`)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white/80 border border-white/20 rounded-lg hover:bg-white/10 transition-colors cursor-pointer mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Employees
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">
            {payslipDetail?.employeeName ? `Payslip — ${payslipDetail.employeeName}` : 'Payslip Details'}
          </h1>
          <p className="text-sm text-emerald-100/80 max-w-2xl">
            {payslipDetail?.periodName ?? 'View payslip, download the PDF, or check generation status.'}
          </p>
        </div>
      </div>

      {/* Main content */}
      {ReadyBanner}
      {renderContent()}
    </div>
  );
};
