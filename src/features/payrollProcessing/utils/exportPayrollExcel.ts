import * as XLSX from 'xlsx';
import type { PayrollRun, PayrollRunItem } from '../api/payrollProcessingApi';

/**
 * Generates and downloads an Excel workbook (.xlsx) containing
 * the payroll run summary and per-employee breakdown.
 */
export function exportPayrollToExcel(
  items: PayrollRunItem[],
  run: PayrollRun,
  periodLabel: string,
): void {
  // ── 1. Summary sheet ──────────────────────────────────────
  const summaryRows = [
    { Metric: 'Period', Value: periodLabel },
    { Metric: 'Status', Value: run.status.replace(/_/g, ' ') },
    { Metric: 'Employees', Value: String(run.employeeCount) },
    { Metric: 'Total Gross', Value: fmtRaw(Number(run.totalGross)) },
    { Metric: 'Total Tax', Value: fmtRaw(Number(run.totalTax)) },
    { Metric: 'Total Pension', Value: fmtRaw(Number(run.totalPension)) },
    { Metric: 'Total Overtime', Value: fmtRaw(Number(run.totalOvertime)) },
    { Metric: 'Total Deductions', Value: fmtRaw(
      Number(run.totalGross) - Number(run.totalNet),
    )},
    { Metric: 'Total Net Pay', Value: fmtRaw(Number(run.totalNet)) },
    { Metric: 'Cost to Company', Value: fmtRaw(Number(run.totalCostToCompany)) },
    { Metric: 'Processed At', Value: run.processedAt
      ? new Date(run.processedAt).toLocaleString()
      : '—',
    },
  ];

  // ── 2. Employee breakdown sheet ───────────────────────────
  const employeeRows = items.map((item) => ({
    'Employee Name': `${item.employee?.firstName ?? ''} ${item.employee?.lastName ?? ''}`.trim(),
    Department: item.employee?.departmentName ?? '—',
    'TIN Number': item.employee?.tinNumber ?? '—',
    'Work Days': item.workDays,
    'Basic Salary': fmtRaw(Number(item.basicSalary)),
    'Prorated Salary': fmtRaw(Number(item.proratedSalary)),
    'Gross Taxable Income': fmtRaw(Number(item.grossTaxableIncome)),
    'Gross Salary': fmtRaw(Number(item.grossSalary)),
    'Cost to Company': fmtRaw(Number(item.costToCompany)),
    'Total Deductions': fmtRaw(Number(item.totalDeductions)),
    'Net Salary': fmtRaw(Number(item.netSalary)),
    Currency: item.currency,
    'Mid-Month Hire': item.isMidMonthHire ? 'Yes' : 'No',
  }));

  // ── 3. Build workbook ─────────────────────────────────────
  const wb = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  // Adjust column width for summary
  summarySheet['!cols'] = [
    { wch: 20 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Payroll Summary');

  const employeeSheet = XLSX.utils.json_to_sheet(employeeRows);
  employeeSheet['!cols'] = [
    { wch: 25 }, // Employee Name
    { wch: 20 }, // Department
    { wch: 16 }, // TIN Number
    { wch: 10 }, // Work Days
    { wch: 14 }, // Basic Salary
    { wch: 16 }, // Prorated Salary
    { wch: 18 }, // Gross Taxable Income
    { wch: 14 }, // Gross Salary
    { wch: 16 }, // Cost to Company
    { wch: 16 }, // Total Deductions
    { wch: 14 }, // Net Salary
    { wch: 10 }, // Currency
    { wch: 14 }, // Mid-Month Hire
  ];
  XLSX.utils.book_append_sheet(wb, employeeSheet, 'Employee Breakdown');

  // ── 4. Trigger download ───────────────────────────────────
  const periodSlug = periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `payroll_${periodSlug}_${run.createdAt?.slice(0, 10) ?? 'export'}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/** Format a number as a plain string for Excel (no ETB prefix, just the number). */
function fmtRaw(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2 });
}
