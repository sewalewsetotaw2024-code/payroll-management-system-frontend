import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Printer, Download } from 'lucide-react';
import { formatETB, maskAccount } from '../utils/etbFormat';
import { numberToWords } from '../utils/numberToWords';
import type { PayslipDetail as PayslipDetailData } from '../types/payslip.types';
import { payslipApi } from '../api/payslipApi';

// ─────────────────────────────────────────────────────────────────────────────
// PayslipDetail — renders the exact same layout as the PDF template
// (templates/payslip-default.hbs), showing a faithful on-screen preview
// before the employee downloads the PDF.
// ─────────────────────────────────────────────────────────────────────────────

interface PayslipDetailProps {
  data: PayslipDetailData;
  loading?: boolean;
}

/** Format date string to DD/MM/YYYY (matches backend formatDate). */
const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/** Combine line items the same way backend buildPayload() does. */
function buildLines(data: PayslipDetailData) {
  const earnings: { label: string; amount: number }[] = [];
  const deductions: { label: string; amount: number }[] = [];

  // ── Earnings ───────────────────────────────────────────────────────────
  // Standard earnings line items
  for (const e of data.earnings ?? []) {
    const amt = Math.max(0, e.amount);
    if (amt > 0) earnings.push({ label: e.label || e.earningType, amount: amt });
  }

  // Allowances listed as additional earnings
  for (const al of data.allowances ?? []) {
    const amt = Math.max(0, al.amount);
    if (amt > 0) earnings.push({ label: al.label, amount: amt });
  }

  // Overtime: show a single combined line (sum of all overtime for the period)
  const totalOvertime = (data.overtime ?? []).reduce((s, ot) => s + Math.max(0, ot.amount), 0);
  if (totalOvertime > 0) {
    earnings.push({ label: 'Overtime', amount: totalOvertime });
  }

  // ── Deductions ─────────────────────────────────────────────────────────
  // Filter out any deduction whose label looks tax-related (matches "tax" or "pit"),
  // because the official income tax line is added separately from data.tax below.
  // This prevents duplicates when a payroll deduction with a tax label already exists.
  const TAX_LABEL_RE = /(^|\s)(tax|pit)(\s|$)/i;
  for (const d of data.deductions ?? []) {
    if (d.amount > 0 && !TAX_LABEL_RE.test(d.label || d.deductionType)) {
      deductions.push({ label: d.label || d.deductionType, amount: Math.max(0, d.amount) });
    }
  }

  // Official income tax line from payrollTax record
  if (data.tax && data.tax.taxAmount > 0) {
    deductions.push({ label: 'Income Tax (PIT)', amount: Math.max(0, data.tax.taxAmount) });
  }

  // Employee pension contribution
  if (data.pension && data.pension.employeeContribution > 0) {
    deductions.push({ label: 'Pension (Employee)', amount: Math.max(0, data.pension.employeeContribution) });
  }

  const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const netPay = totalEarnings - totalDeductions;

  return { earnings, deductions, totalEarnings, totalDeductions, netPay };
}

/** Inject print-specific CSS on mount. */
const usePrintStyles = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-payslip-print', '');
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        .payslip-print-area, .payslip-print-area * { visibility: visible; }
        .payslip-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
        .payslip-print-area table { page-break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
};

export const PayslipDetail: React.FC<PayslipDetailProps> = ({
  data,
  loading = false,
}) => {
  usePrintStyles();

  const lines = buildLines(data);

  const handleDownloadPdf = async () => {
    const idForDownload = data.payslipId ?? data.id;
    if (!idForDownload) return;
    try {
      const periodName = data.periodName?.replace(/\s+/g, '_') ?? 'payslip';
      const empName = data.employeeName?.replace(/\s+/g, '_') ?? 'employee';
      await payslipApi.downloadPayslipPdf(idForDownload, `payslip-${periodName}-${empName}.pdf`);
    } catch (err) {
      console.error('[Payslip] Download failed:', err);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
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
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center"
    >
      {/* A4-sized card with PDF-like dimensions */}
      <div className="bg-white border border-slate-200 shadow-lg rounded-none w-full max-w-[210mm]" style={{ minHeight: '297mm' }}>
        <div className="payslip-print-area">
        {/* ═══════════════════════════════════════════════════════════════
             PDF template — exact same structure as payslip-default.hbs
             ═══════════════════════════════════════════════════════════════ */}
        <style>{`
          .pslip * { margin: 0; padding: 0; box-sizing: border-box; }
          .pslip { font-family: 'Inter', -apple-system, sans-serif; }
          .pslip .hdr { padding: 28px 36px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a8c3a; }
          .pslip .hdr-logo { height: 46px; width: auto; object-fit: contain; }
          .pslip .hdr-right { text-align: right; }
          .pslip .hdr-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #999; }
          .pslip .hdr-title { font-size: 22px; font-weight: 700; color: #1a1a1a; letter-spacing: 1px; text-transform: uppercase; }
          .pslip .info-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #eee; }
          .pslip .info-col { padding: 20px 36px; }
          .pslip .info-col:first-child { border-right: 1px solid #eee; }
          .pslip .info-heading { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #1a8c3a; margin-bottom: 14px; }
          .pslip .info-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .pslip .info-row .k { font-size: 12px; color: #888; }
          .pslip .info-row .v { font-size: 12px; color: #1a1a1a; font-weight: 500; }
          .pslip .tbls { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #eee; }
          .pslip .tbl-col:first-child { border-right: 1px solid #eee; }
          .pslip .tbl-title { padding: 12px 36px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #1a8c3a; background: #fafafa; border-bottom: 1px solid #eee; }
          .pslip table { width: 100%; border-collapse: collapse; }
          .pslip table th { padding: 9px 36px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #aaa; text-align: left; border-bottom: 1px solid #eee; }
          .pslip table th:last-child { text-align: right; }
          .pslip table td { padding: 11px 36px; font-size: 12.5px; color: #444; border-bottom: 1px solid #f5f5f5; }
          .pslip table td:last-child { text-align: right; font-weight: 500; color: #1a1a1a; font-variant-numeric: tabular-nums; }
          .pslip table tr:last-child td { border-bottom: none; }
          .pslip table tr.total td { border-top: 1.5px solid #1a1a1a; border-bottom: none; font-weight: 700; color: #1a1a1a; padding-top: 13px; }
          .pslip .net { display: flex; justify-content: space-between; align-items: center; padding: 22px 36px; border-bottom: 1px solid #eee; }
          .pslip .net-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #555; }
          .pslip .net-amount { font-size: 24px; font-weight: 700; color: #1a1a1a; font-variant-numeric: tabular-nums; }
          .pslip .net-amount .cur { font-size: 13px; font-weight: 500; color: #888; margin-right: 4px; }
          .pslip .words { padding: 14px 36px; border-bottom: 1px solid #eee; font-size: 11.5px; color: #888; }
          .pslip .words strong { color: #555; font-weight: 600; }
          .pslip .words em { font-style: italic; color: #666; }
          .pslip .sigs { display: flex; justify-content: space-between; padding: 36px 36px 28px; }
          .pslip .sig { width: 180px; }
          .pslip .sig-line { border-bottom: 1px solid #ccc; height: 44px; margin-bottom: 8px; }
          .pslip .sig-text { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #aaa; }
          .pslip .ftr { padding: 16px 36px; background: #fafafa; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
          .pslip .ftr-note { font-size: 10px; color: #bbb; }
          .pslip .ftr-note strong { color: #999; }
          .pslip .brand { display: flex; align-items: baseline; gap: 6px; }
          .pslip .brand-name { font-size: 14px; font-weight: 700; color: #1a8c3a; letter-spacing: 0.5px; }
          .pslip .brand-sub { font-size: 10px; color: #bbb; font-weight: 400; }
          @media print {
            .pslip { border: none; }
          }
          @media (max-width: 640px) {
            .pslip .hdr { flex-direction: column; gap: 14px; align-items: flex-start; padding: 20px; }
            .pslip .hdr-right { text-align: left; }
            .pslip .info-grid, .pslip .tbls { grid-template-columns: 1fr; }
            .pslip .info-col:first-child { border-right: none; border-bottom: 1px solid #eee; }
            .pslip .tbl-col:first-child { border-right: none; border-bottom: 1px solid #eee; }
            .pslip table th, .pslip table td, .pslip .tbl-title, .pslip .info-col, .pslip .net, .pslip .words, .pslip .ftr, .pslip .sigs { padding-left: 20px; padding-right: 20px; }
            .pslip .sigs { flex-direction: column; gap: 20px; align-items: center; }
            .pslip .ftr { flex-direction: column; gap: 8px; text-align: center; }
          }
        `}</style>

        <div className="pslip">
          {/* ── Header ──────────────────────────────────────────── */}
          <div className="hdr">
            <div>
              {/* Logo placeholder — same behaviour as template: hidden on error */}
              <img
                src=""
                alt="Company Logo"
                className="hdr-logo"
                style={{ display: 'none' }}
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
            <div className="hdr-right">
              <div className="hdr-label">Pay Period: {data.periodName ?? '\u2014'}</div>
              <div className="hdr-title">Payslip</div>
            </div>
          </div>

          {/* ── Employee Info ────────────────────────────────────── */}
          <div className="info-grid">
            <div className="info-col">
              <div className="info-heading">Employee Details</div>
              <div className="info-row">                <span className="k">Company Name</span>
                <span className="v">{data.companyName || 'ADIU'}</span>
              </div>
              <div className="info-row">                <span className="k">Employee Name</span>
                <span className="v">{data.employeeName || '\u2014'}</span>
              </div>
              <div className="info-row">
                <span className="k">Employee ID</span>
                <span className="v">{data.employeeId?.slice(0, 8) || '\u2014'}</span>
              </div>
              <div className="info-row">
                <span className="k">Designation</span>
                <span className="v">{data.jobPosition || '\u2014'}</span>
              </div>
              <div className="info-row">
                <span className="k">Department</span>
                <span className="v">{data.departmentName || '\u2014'}</span>
              </div>
              <div className="info-row">
                <span className="k">Date of Joining</span>
                <span className="v">{'\u2014'}</span>
              </div>
            </div>
            <div className="info-col">
              <div className="info-heading">Pay Details</div>
              <div className="info-row">
                <span className="k">Pay Period</span>
                <span className="v">{fmtDate(data.periodStart)} &ndash; {fmtDate(data.periodEnd)}</span>
              </div>
              <div className="info-row">
                <span className="k">Pay Date</span>
                <span className="v">{fmtDate(data.paymentDate)}</span>
              </div>
              <div className="info-row">
                <span className="k">Bank Name</span>
                <span className="v">{'\u2014'}</span>
              </div>
              <div className="info-row">
                <span className="k">Account No.</span>
                <span className="v">{maskAccount(null)}</span>
              </div>
              <div className="info-row">
                <span className="k">TIN</span>
                <span className="v">{data.tinNumber || '\u2014'}</span>
              </div>
            </div>
          </div>

          {/* ── Tables ───────────────────────────────────────────── */}
          <div className="tbls">
            {/* Earnings */}
            <div className="tbl-col">
              <div className="tbl-title">Earnings</div>
              <table>
                <thead>
                  <tr><th style={{ borderRight: '1px solid rgb(226 232 240 / 0.5)' }}>Type</th><th>Amount (ETB)</th></tr>
                </thead>
                <tbody>
                  {lines.earnings.length === 0 && (
                    <tr><td style={{ textAlign: 'center', color: '#bbb', padding: '20px 36px' }} colSpan={2}>No earnings data</td></tr>
                  )}
                  {lines.earnings.map((e, i) => (
                    <tr key={i} style={{ backgroundColor: (i % 2 === 0 ? '#f8fafc' : '#ffffff') }}><td style={{ borderRight: '1px solid rgb(226 232 240 / 0.5)' }}>{e.label}</td><td>{formatETB(e.amount)}</td></tr>
                  ))}
                  <tr className="total"><td style={{ borderRight: '1px solid rgb(226 232 240 / 0.5)' }}>Total Earnings</td><td>{formatETB(lines.totalEarnings)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div className="tbl-col">
              <div className="tbl-title">Deductions</div>
              <table>
                <thead>
                  <tr><th style={{ borderRight: '1px solid rgb(226 232 240 / 0.5)' }}>Type</th><th>Amount (ETB)</th></tr>
                </thead>
                <tbody>
                  {lines.deductions.length === 0 && (
                    <tr><td style={{ textAlign: 'center', color: '#bbb', padding: '20px 36px' }} colSpan={2}>No deductions</td></tr>
                  )}
                  {lines.deductions.map((d, i) => (
                    <tr key={i} style={{ backgroundColor: (i % 2 === 0 ? '#f8fafc' : '#ffffff') }}><td style={{ borderRight: '1px solid rgb(226 232 240 / 0.5)' }}>{d.label}</td><td>{formatETB(d.amount)}</td></tr>
                  ))}
                  <tr className="total"><td style={{ borderRight: '1px solid rgb(226 232 240 / 0.5)' }}>Total Deductions</td><td>{formatETB(lines.totalDeductions)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Net Pay ──────────────────────────────────────────── */}
          <div className="net">
            <span className="net-label">Net Pay</span>
            <span className="net-amount">
              <span className="cur">ETB</span>
              {formatETB(lines.netPay)}
            </span>
          </div>

          {/* ── In Words ─────────────────────────────────────────── */}
          <div className="words">
            <strong>Amount in Words:</strong>{' '}
            <em>{numberToWords(Math.max(0, lines.netPay))}</em>
          </div>

          {/* ── Signatures ───────────────────────────────────────── */}
          <div className="sigs">
            <div className="sig">
              <div className="sig-line"></div>
              <div className="sig-text">Employee Signature</div>
            </div>
            <div className="sig">
              <div className="sig-line"></div>
              <div className="sig-text">Authorized Signatory</div>
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────────── */}
          <div className="ftr">
            <div className="ftr-note">
              <strong>This is a system generated document.</strong> No physical signature is required.
            </div>
            <div className="brand">
              <span className="brand-name">ADIU</span>
              <span className="brand-sub">Payroll</span>
            </div>
          </div>{/* end .ftr */}
        </div>{/* end .pslip */}
      </div>{/* end payslip-print-area */}
    </div>{/* end A4 wrapper */}

      {/* ── Action buttons (hidden when printing) ──────────────── */}
      <div className="no-print mt-6 flex items-center gap-3 w-full max-w-[210mm]">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-brand-800 transition-colors shadow-lg cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Print Payslip
        </button>
        <button
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-brand-800 transition-colors shadow-lg cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>
    </motion.div>
  );
};
