import * as XLSX from 'xlsx';
import type { PayrollRun, PayrollRunItem, PayrollRunItemDetail } from '../api/payrollProcessingApi';
import { payrollRunApi } from '../api/payrollProcessingApi';
import { getEarningAmount, getOtherDeductions } from '../components/ExpandablePayrollTable';

/**
 * Fetches full per-employee detail (earnings, overtime, tax, pension, deductions)
 * for every item, needed for the itemized allowance/deduction columns in the export.
 */
async function fetchAllDetails(
  runId: string,
  items: PayrollRunItem[],
): Promise<Map<string, PayrollRunItemDetail | null>> {
  const map = new Map<string, PayrollRunItemDetail | null>();
  const results = await Promise.allSettled(
    items.map((item) =>
      payrollRunApi.getRunItem(runId, item.id).then((res) => ({ id: item.id, data: res.data.data })),
    ),
  );
  for (const item of items) map.set(item.id, null);
  for (const result of results) {
    if (result.status === 'fulfilled') map.set(result.value.id, result.value.data);
  }
  return map;
}

/**
 * Generates and downloads an Excel workbook (.xlsx) containing
 * the payroll employee breakdown with the run summary appended below it.
 */
export async function exportPayrollToExcel(
  runId: string,
  items: PayrollRunItem[],
  run: PayrollRun,
  periodLabel: string,
): Promise<void> {
  const details = await fetchAllDetails(runId, items);

  // ── 1. Employee breakdown rows ────────────────────────────
  const employeeRows = items.map((item) => {
    const detail = details.get(item.id) ?? null;

    const transportTaxable = getEarningAmount(detail, 'TRANSPORT_TAXABLE');
    const transportNonTaxable = getEarningAmount(detail, 'TRANSPORT_NON_TAXABLE');
    const telephone = getEarningAmount(detail, 'TELEPHONE_ALLOWANCE');
    // Representation (managerial) and Meal (non-managerial) are the same allowance
    // slot — an employee gets one or the other, never both — so they share one column.
    const representationOrMeal = getEarningAmount(detail, 'RESPONSIBILITY_ALLOWANCE')
      + getEarningAmount(detail, 'MEAL_ALLOWANCE');
    const housing = getEarningAmount(detail, 'HOUSING_ALLOWANCE');
    const overtime = detail
      ? detail.payrollOvertime.reduce((s, o) => s + Number(o.amount), 0)
      : 0;
    const incomeTax = Number(detail?.payrollTax?.taxAmount ?? 0);
    const pensionEmployer = Number(detail?.payrollPension?.employerContribution ?? 0);
    const pensionEmployee = Number(detail?.payrollPension?.employeeContribution ?? 0);
    const otherDeductions = getOtherDeductions(detail);

    return {
      'Employee Name': `${item.employee?.firstName ?? ''} ${item.employee?.lastName ?? ''}`.trim(),
      Department: item.employee?.departmentName ?? '—',
      'Job Title': item.employee?.jobPosition ?? '—',
      'TIN Number': item.employee?.tinNumber ?? '—',
      'Work Days': item.workDays,
      'Basic Earning': fmtRaw(Number(item.proratedSalary)),
      'Gross Salary': fmtRaw(Number(item.grossSalary)),
      'Cost to Company': fmtRaw(Number(item.costToCompany)),
      'Transportation Allowance': fmtRaw(transportTaxable),
      'Transportation Allowance (Non-Taxable)': fmtRaw(transportNonTaxable),
      'Telephone Allowance': fmtRaw(telephone),
      'Representation Allowance': fmtRaw(representationOrMeal),
      'Housing Allowance': fmtRaw(housing),
      Overtime: fmtRaw(overtime),
      '11% Pension (Employer)': fmtRaw(pensionEmployer),
      '7% Pension (Employee)': fmtRaw(pensionEmployee),
      'Other Deduction': fmtRaw(otherDeductions),
      'Income Tax': fmtRaw(incomeTax),
      'Total Deduction': fmtRaw(Number(item.totalDeductions)),
      'Net Pay': fmtRaw(Number(item.netSalary)),
      Currency: item.currency,
      'Mid-Month Hire': item.isMidMonthHire ? 'Yes' : 'No',
    };
  });

  // ── 2. Summary rows (metric/value pairs) ──────────────────
  const summaryRows: (string | number)[][] = [
    ['Payroll Summary'],
    ['Period', periodLabel],
    ['Status', run.status.replace(/_/g, ' ')],
    ['Employees', run.employeeCount],
    ['Total Gross', fmtRaw(Number(run.totalGross))],
    ['Total Tax', fmtRaw(Number(run.totalTax))],
    ['Total Pension', fmtRaw(Number(run.totalPension))],
    ['Total Overtime', fmtRaw(Number(run.totalOvertime))],
    ['Total Deductions', fmtRaw(Number(run.totalGross) - Number(run.totalNet))],
    ['Total Net Pay', fmtRaw(Number(run.totalNet))],
    ['Cost to Company', fmtRaw(Number(run.totalCostToCompany))],
    ['Processed At', run.processedAt ? new Date(run.processedAt).toLocaleString() : '—'],
  ];

  // ── 3. Build single sheet: employee breakdown + summary below ─
  const wb = XLSX.utils.book_new();

  const sheet = XLSX.utils.json_to_sheet(employeeRows);

  // Leave one blank row after the employee table, then append the summary block.
  const summaryStartRow = employeeRows.length + 1 /* header row */ + 2 /* blank row gap */;
  XLSX.utils.sheet_add_aoa(sheet, summaryRows, { origin: `A${summaryStartRow + 1}` });

  sheet['!cols'] = [
    { wch: 25 }, // Employee Name
    { wch: 20 }, // Department
    { wch: 20 }, // Job Title
    { wch: 16 }, // TIN Number
    { wch: 10 }, // Work Days
    { wch: 16 }, // Basic Earning
    { wch: 14 }, // Gross Salary
    { wch: 18 }, // Cost to Company
    { wch: 20 }, // Transportation Allowance (Taxable)
    { wch: 24 }, // Transportation Allowance (Non-Taxable)
    { wch: 16 }, // Telephone Allowance
    { wch: 30 }, // Representation Allowance / Meal Allowance (Non-Managerial Staff)
    { wch: 16 }, // Housing Allowance
    { wch: 14 }, // Overtime
    { wch: 18 }, // 11% Pension (Employer)
    { wch: 18 }, // 7% Pension (Employee)
    { wch: 16 }, // Other Deduction
    { wch: 14 }, // Income Tax
    { wch: 16 }, // Total Deduction
    { wch: 14 }, // Net Pay
    { wch: 10 }, // Currency
    { wch: 14 }, // Mid-Month Hire
  ];

  XLSX.utils.book_append_sheet(wb, sheet, 'Payroll Report');

  // ── 4. Trigger download ───────────────────────────────────
  const periodSlug = periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `payroll_${periodSlug}_${run.createdAt?.slice(0, 10) ?? 'export'}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/** Format a number as a plain string for Excel (no ETB prefix, just the number). */
function fmtRaw(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2 });
}