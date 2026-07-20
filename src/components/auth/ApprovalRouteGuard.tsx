import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

/**
 * Canonical approval role keys used for sidebar nav filtering and route guarding.
 * Maps lowercase DB role names → canonical key via ROLE_ALIASES.
 */
const APPROVAL_ROLE_KEYS = new Set([
  'HR_GENERALIST', 'HR_CS_MANAGER', 'HR_CS_DIRECTOR',
  'FINANCE_OFFICER', 'FINANCE_MANAGER',
  'ADMIN',
]);

/** Maps (lowercased) DB role names to canonical keys. Must stay in sync with Sidebar.tsx. */
const ROLE_ALIASES: Record<string, string> = {
  'admin': 'ADMIN',
  'super admin': 'ADMIN',
  'hr generalist': 'HR_GENERALIST',
  'hr cs manager': 'HR_CS_MANAGER',
  'hr cs director': 'HR_CS_DIRECTOR',
  'finance officer': 'FINANCE_OFFICER',
  'finance manager': 'FINANCE_MANAGER',
};

function resolveRoleKey(roleName: string | null | undefined): string | null {
  if (!roleName) return null;
  const normalized = roleName.toLowerCase().trim();
  return ROLE_ALIASES[normalized] ?? null;
}

/** Guards the /approval route — only allows users with approval-related roles through. */
export const ApprovalRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAppSelector((s) => s.auth.user);
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name ?? '';
  const roleKey = resolveRoleKey(roleName);

  if (!roleKey || !APPROVAL_ROLE_KEYS.has(roleKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
