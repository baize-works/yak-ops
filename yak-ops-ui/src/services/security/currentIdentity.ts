/**
 * Convert only the identity returned by AccountController/current.
 *
 * Do not enrich this value with account, role, department, permission, or
 * project administration list APIs: those lists describe manageable records,
 * not necessarily the authenticated principal.
 */
export const toCurrentUser = (user: API.CurrentUserVO): API.CurrentUser => ({
  ...user,
  // ProLayout's user widgets use these legacy display fields.
  name: user.realName?.trim() || user.userName,
  userid: String(user.id),
  email: user.email ?? undefined,
  phone: user.phone ?? undefined,
  // Missing authorization context is deliberately fail-closed.
  roleList: Array.isArray(user.roleList) ? user.roleList : [],
  permissionCodes: Array.isArray(user.permissionCodes)
    ? user.permissionCodes
    : [],
  projectList: Array.isArray(user.projectList) ? user.projectList : [],
  // A missing/null deptId means “no current department”; it is not inferred.
  deptId: user.deptId ?? null,
});
