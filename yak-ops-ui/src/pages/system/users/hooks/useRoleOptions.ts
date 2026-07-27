import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type RoleBrief,
  listRoles,
} from '@/services/security/users';

import type { RoleOption } from '../shared';

export function useRoleOptions(): RoleOption[] {
  const [roles, setRoles] = useState<RoleBrief[]>([]);

  const loadRoles = useCallback(async () => {
    try {
      const data = await listRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  return useMemo(
    () =>
      roles.map((role) => ({
        value: Number(role.id),
        label: role.roleName,
      })),
    [roles],
  );
}
