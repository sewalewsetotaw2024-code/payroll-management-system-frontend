import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

/** Path prefixes the plain "Employee" role may access — self-service only. */
const EMPLOYEE_ALLOWED_PREFIXES = ['/payslips', '/notifications'];

/**
 * Restricts the plain "Employee" role to self-service pages only (their own
 * payslips + notifications) — every other route redirects to /payslips.
 * Every other role passes through unaffected; this only ever narrows Employee.
 */
export const EmployeeScopeGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name ?? '';
  const isEmployeeOnly = roleName.trim().toLowerCase() === 'employee';

  if (isEmployeeOnly && !EMPLOYEE_ALLOWED_PREFIXES.some((p) => location.pathname.startsWith(p))) {
    return <Navigate to="/payslips" replace />;
  }

  return <>{children}</>;
};
