import React, { useState } from 'react';
import { FileText, Loader2, Download, XCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { payslipApi } from '../../payslips/api/payslipApi';
import type { BatchGenerateResult } from '../../payslipTemplates/types/payslipTemplate.types';

interface Props {
  payrollRunId: string;
  onComplete?: () => void;
}

export const BatchGenerateButton: React.FC<Props> = ({ payrollRunId, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchGenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await payslipApi.batchGeneratePayslipPdfs(payrollRunId);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={loading || generated}
        title={generated ? 'Payslips have already been generated for this run' : undefined}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 border-2",
          generated
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-not-allowed shadow-none"
            : loading
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
              : "bg-primary text-white border-brand-800/30 hover:bg-brand-700",
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : generated ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        {loading ? 'Generating...' : generated ? 'Payslips Generated' : 'Generate Payslips'}
      </button>

      {error && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <XCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Generation Failed</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Payslip Generation Complete</h3>
            <p className="text-sm text-slate-500 mb-4">
              {result.succeeded}/{result.total} generated successfully
              {result.failed > 0 && ` (${result.failed} failed)`}
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
              {result.pdfs.map((pdf, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-medium text-slate-700">{pdf.employeeName}</span>
                  {pdf.pdfUrl ? (
                    <a
                      href={pdf.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:text-brand-700 text-sm font-semibold"
                    >
                      <Download className="w-4 h-4" /> PDF
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-500 text-xs">
                      <XCircle className="w-3 h-3" /> {pdf.error || 'Failed'}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => { setResult(null); setGenerated(true); onComplete?.(); }}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
