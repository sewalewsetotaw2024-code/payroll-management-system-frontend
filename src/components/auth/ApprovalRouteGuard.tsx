import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

const APPROVAL_ROLES = [
  'hr officer',
  'hr manager',
  'payroll officer',
  'finance manager',
  'finance officer',
  'admin',
  'super admin',
  'hr',
];

/** Guards the /approval route — only allows users with approval-related roles through. */
export const ApprovalRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAppSelector((s) => s.auth.user);
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name ?? '';
  const role = roleName.toLowerCase().trim();

  if (!APPROVAL_ROLES.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
