import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

/**
 * Canonical admin role keys — only ADMIN resolves to this set.
 * Maps lowercase DB role names → canonical key via ROLE_ALIASES.
 */
const ADMIN_ROLE_KEYS = new Set(['ADMIN']);

/** Maps (lowercased) DB role names to canonical keys. Must stay in sync with Sidebar.tsx. */
const ROLE_ALIASES: Record<string, string> = {
  'admin': 'ADMIN',
  'super admin': 'ADMIN',
};

function resolveRoleKey(roleName: string | null | undefined): string | null {
  if (!roleName) return null;
  const normalized = roleName.toLowerCase().trim();
  return ROLE_ALIASES[normalized] ?? null;
}

/**
 * Guards routes that should only be accessible to Admin and Super Admin roles.
 */
export const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAppSelector((s) => s.auth.user);
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name ?? '';
  const roleKey = resolveRoleKey(roleName);

  if (!roleKey || !ADMIN_ROLE_KEYS.has(roleKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
