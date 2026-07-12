import React from 'react';
import type { ImportType } from '../types/dataManagement.types';

/**
 * Maps file column header names (case-insensitive) to system field names.
 * Used during the column-mapping step of the import workflow.
 */
export const FIELD_MAP: Record<string, string> = {
  'first name': 'firstName',
  firstname: 'firstName',
  fname: 'firstName',
  'given name': 'firstName',
  'last name': 'lastName',
  lastname: 'lastName',
  lname: 'lastName',
  surname: 'lastName',
  'family name': 'lastName',
  email: 'email',
  'e-mail': 'email',
  'tin number': 'tinNumber',
  tin: 'tinNumber',
  'tax id': 'tinNumber',
  'pension number': 'pensionNumber',
  pension: 'pensionNumber',
  'job position': 'jobPosition',
  position: 'jobPosition',
  jobtitle: 'jobPosition',
  title: 'jobPosition',
  department: 'departmentName',
  'department name': 'departmentName',
  dept: 'departmentName',
  'basic salary': 'basicSalary',
  basicsalary: 'basicSalary',
  salary: 'basicSalary',
  'gross salary': 'grossSalary',
  grosssalary: 'grossSalary',
  'gross pay': 'grossSalary',
  status: 'status',
  'employee id': 'employeeId',
  employeeid: 'employeeId',
  'employee #': 'employeeId',
  'ext id': 'employeeExternalId',
  'external id': 'employeeExternalId',
  date: 'date',
  'check in': 'checkIn',
  checkin: 'checkIn',
  'clock in': 'checkIn',
  'check out': 'checkOut',
  checkout: 'checkOut',
  'clock out': 'checkOut',
  'regular hours': 'regularHours',
  hours: 'regularHours',
  'late minutes': 'lateMinutes',
  lateness: 'lateMinutes',
  absent: 'isAbsent',
  'is absent': 'isAbsent',
  'adjustment type': 'adjustmentType',
  adjustmenttype: 'adjustmentType',
  type: 'adjustmentType',
  amount: 'amount',
  reason: 'reason',
  description: 'reason',
  notes: 'reason',
  'payroll period': 'payrollPeriodId',
  period: 'payrollPeriodId',
};

/**
 * Available target fields for employee data imports, with required flags.
 */
export const EMPLOYEE_FIELDS = [
  { value: 'firstName', label: 'First Name *', required: true },
  { value: 'lastName', label: 'Last Name *', required: true },
  { value: 'email', label: 'Email', required: false },
  { value: 'tinNumber', label: 'TIN Number', required: false },
  { value: 'pensionNumber', label: 'Pension Number', required: false },
  { value: 'jobPosition', label: 'Job Position', required: false },
  { value: 'departmentName', label: 'Department', required: false },
  { value: 'basicSalary', label: 'Basic Salary', required: false },
  { value: 'grossSalary', label: 'Gross Salary', required: false },
  { value: 'status', label: 'Status', required: false },
  { value: '_skip', label: '— Skip column', required: false },
];

/**
 * Available target fields for attendance data imports, with required flags.
 */
export const ATTENDANCE_FIELDS = [
  { value: 'employeeId', label: 'Employee ID', required: false },
  { value: 'employeeExternalId', label: 'External ID', required: false },
  { value: 'date', label: 'Date *', required: true },
  { value: 'checkIn', label: 'Check In', required: false },
  { value: 'checkOut', label: 'Check Out', required: false },
  { value: 'regularHours', label: 'Regular Hours', required: false },
  { value: 'lateMinutes', label: 'Late Minutes', required: false },
  { value: 'isAbsent', label: 'Is Absent', required: false },
  { value: '_skip', label: '— Skip column', required: false },
];

/**
 * Available target fields for adjustment data imports, with required flags.
 */
export const ADJUSTMENT_FIELDS = [
  { value: 'employeeId', label: 'Employee ID', required: false },
  { value: 'employeeExternalId', label: 'External ID', required: false },
  { value: 'adjustmentType', label: 'Adjustment Type *', required: true },
  { value: 'amount', label: 'Amount *', required: true },
  { value: 'reason', label: 'Reason *', required: true },
  { value: 'payrollPeriodId', label: 'Payroll Period ID', required: false },
  { value: '_skip', label: '— Skip column', required: false },
];

/**
 * Configuration for each import type, including display label, description, and accent color.
 */
export const IMPORT_TYPES: { value: ImportType; label: string; desc: string; color: string }[] = [
  { value: 'EMPLOYEE', label: 'Employee Data', desc: 'Import or update employee profiles', color: 'bg-blue-500' },
  { value: 'ATTENDANCE', label: 'Attendance Data', desc: 'Import biometric attendance records', color: 'bg-emerald-500' },
  { value: 'ADJUSTMENT', label: 'Bulk Adjustments', desc: 'Import manual payroll adjustments', color: 'bg-amber-500' },
];
