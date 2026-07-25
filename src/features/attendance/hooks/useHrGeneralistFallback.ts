import { useEffect, useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { attendanceApi } from '../api/attendanceApi';
import { roleNamesMatch } from '../../../lib/utils';

/**
 * HR CS Manager is a fallback for HR Generalist on attendance-management
 * actions (upload, calculate OT/summary, delete, toggle-active, submit) —
 * not an equal co-owner. If the company currently has an active HR
 * Generalist, those actions belong to them and HR CS Manager should not
 * see the buttons at all. Mirrors the backend's enforceHrGeneralistFallback.
 *
 * Returns `blockedByFallback: true` only when the current user IS HR CS
 * Manager AND an active HR Generalist exists — every other role is
 * unaffected regardless of `loading`/`hasActiveHrGeneralist`.
 */
export function useHrGeneralistFallback() {
  const authUser = useAppSelector((state) => state.auth.user);
  const isHrCsManager = roleNamesMatch(authUser?.role?.name, 'HR CS Manager');

  const [hasActiveHrGeneralist, setHasActiveHrGeneralist] = useState(false);
  const [loading, setLoading] = useState(isHrCsManager);

  useEffect(() => {
    if (!isHrCsManager) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    attendanceApi
      .getHrGeneralistStatus()
      .then((res) => {
        if (!cancelled) setHasActiveHrGeneralist(res.hasActiveHrGeneralist);
      })
      .catch(() => {
        // Fail safe the same way the backend does — default to "present"
        // (i.e. keep HR CS Manager blocked) rather than assume access.
        if (!cancelled) setHasActiveHrGeneralist(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isHrCsManager]);

  return {
    blockedByFallback: isHrCsManager && hasActiveHrGeneralist,
    loading,
  };
}
