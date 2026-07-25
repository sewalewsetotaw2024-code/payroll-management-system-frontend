import { useEffect, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { fetchRolePermissions } from '../features/approvalWorkflow/api/approvalWorkflowApi';

function roleKey(name: string): string {
  return name.toUpperCase().replace(/\s+/g, '_');
}

function isAdminRoleName(name: string | null | undefined): boolean {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  return normalized === 'admin' || normalized === 'super admin' || normalized === 'superadmin';
}

/**
 * Reads the CURRENT user's role permissions live from the backend
 * (GET /roles/permissions — the same data the Workflow Builder's permission
 * editor writes to via PATCH /roles/:roleId/permissions). Use this instead of
 * a hardcoded role-name list for gating buttons, so a permission change made
 * in Workflow Builder is reflected in the UI without a code change/deploy —
 * matching what `requirePermission()` already enforces on the backend.
 *
 * Admin/SuperAdmin always return true, mirroring the backend's isAdminRole()
 * bypass in requirePermission — they're not gated by the permissions map.
 */
export function useRolePermissions() {
  const userRole = useAppSelector((s) => s.auth.user?.role?.name ?? null);
  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRolePermissions().then((map) => {
      if (cancelled) return;
      const key = userRole ? roleKey(userRole) : null;
      setPermissions(key && map ? (map[key] ?? null) : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userRole]);

  const isAdmin = isAdminRoleName(userRole);

  const hasPermission = (key: string): boolean => {
    if (isAdmin) return true;
    return permissions?.[key] === true;
  };

  return { hasPermission, loading, isAdmin };
}
