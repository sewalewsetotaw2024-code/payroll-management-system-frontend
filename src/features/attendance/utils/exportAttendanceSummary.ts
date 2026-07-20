import * as XLSX from 'xlsx';
import type { CombinedPeriodSummary } from '../types/attendance.types';

const STANDARD_HOURS = 8;

/**
 * Generates an XLSX workbook from the attendance period summary data
 * and triggers a browser download.
 *
 * @param summary - The combined period summary from the API.
 * @param viewMode - 'hourly' or 'monthly' — controls column labels and value format.
 * @param periodName - The payroll period name, used in the filename.
 */
export function exportAttendanceSummaryToXlsx(
    summary: CombinedPeriodSummary | null,
    viewMode: 'hourly' | 'monthly',
    periodName: string,
): void {
    if (!summary || !summary.employees || summary.employees.length === 0) return;

    const employees = summary.employees;
    const totalEmployees = employees.length;
    let totalAbsentVal = 0;
    let totalRegularVal = 0;

    const hoursSuffix = viewMode === 'hourly' ? ' (hrs)' : ' (days)';

    const rows: any[] = [];

    employees.forEach((emp) => {
        const absHrs = Number(emp.absenceHours ?? 0);
        const paidHrs = Number(emp.paidLeaveHours ?? 0);
        const totalHrs = Number(emp.totalHours ?? 0);

        let absent: number;
        let paidLeave: number;
        let total: number;

        if (viewMode === 'hourly') {
            absent = absHrs;
            paidLeave = paidHrs;
            total = totalHrs;
        } else {
            absent = emp.absentDays ?? absHrs / STANDARD_HOURS;
            paidLeave = emp.paidLeaveDays ?? paidHrs / STANDARD_HOURS;
            total = emp.actualDays ?? totalHrs / STANDARD_HOURS;
        }

        // Accumulate raw values for summary stats
        totalAbsentVal += absHrs;
        totalRegularVal += totalHrs - paidHrs; // derive regular from total - paid

        rows.push({
            'Employee': emp.employeeName || 'Unknown',
            'Department': emp.department || '',
            [`Absent${hoursSuffix}`]: Number(absent.toFixed(1)),
            [`Paid Leave${hoursSuffix}`]: Number(paidLeave.toFixed(1)),
            [`Total${hoursSuffix}`]: Number(total.toFixed(1)),
        });
    });

    const workbook = XLSX.utils.book_new();

    // Summary stats — placed above the table as metadata
    const statRows = [
        [`Attendance Summary — ${periodName}`, '', '', '', ''],
        ['', '', '', '', ''],
        [
            'Total Employees',
            viewMode === 'hourly' ? 'Total Regular Hours' : 'Total Regular Days',
            viewMode === 'hourly' ? 'Total Absent Hours' : 'Total Absent Days',
            '', '',
        ],
        [
            totalEmployees.toString(),
            viewMode === 'hourly'
                ? Number(totalRegularVal.toFixed(1)).toString()
                : Number((totalRegularVal / STANDARD_HOURS).toFixed(1)).toString(),
            viewMode === 'hourly'
                ? Number(totalAbsentVal.toFixed(1)).toString()
                : Number((totalAbsentVal / STANDARD_HOURS).toFixed(1)).toString(),
            '', '',
        ],
        ['', '', '', '', ''],
    ];

    const headers = ['Employee', 'Department', `Absent${hoursSuffix}`, `Paid Leave${hoursSuffix}`, `Total${hoursSuffix}`];
    statRows.push(headers);

    const dataRows = rows.map(r => [r.Employee, r.Department, r[`Absent${hoursSuffix}`], r[`Paid Leave${hoursSuffix}`], r[`Total${hoursSuffix}`]]);

    const sheetData = statRows.concat(dataRows);
    const sheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Column widths
    sheet['!cols'] = [
        { wch: 28 }, // Employee
        { wch: 20 }, // Department
        { wch: 16 }, // Absent
        { wch: 18 }, // Paid Leave
        { wch: 14 }, // Total
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, 'Attendance Summary');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safePeriodName = periodName.replace(/[^a-zA-Z0-9-_]/g, '_');
    link.download = `attendance-summary-${safePeriodName}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.href = blobUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
}
