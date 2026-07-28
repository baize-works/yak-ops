type MenuProtectedRoute = {
  id: string;
  parentId?: string;
  mode?: 'public' | 'one' | 'any' | 'all';
};

const ROOT_PERMISSION = 'security:root';

/**
 * Checks the database-backed menu grant for one route.
 *
 * <p>An undefined menuCodes value means the backend has not exposed the new
 * contract yet, so deployments can roll out backend and frontend separately.
 * Once the field is present, an empty array deliberately denies every
 * protected menu. Hidden detail routes inherit their parent menu grant.
 */
export const hasRouteMenuAccess = (
  menuCodes: readonly string[] | null | undefined,
  route: MenuProtectedRoute,
  permissionCodes?: readonly string[] | null,
): boolean => {
  if (route.mode === 'public') {
    return true;
  }

  if (permissionCodes?.includes(ROOT_PERMISSION)) {
    return true;
  }

  if (!Array.isArray(menuCodes)) {
    return true;
  }

  const requiredMenuCode = route.parentId ?? route.id;
  return menuCodes.includes(requiredMenuCode);
};
