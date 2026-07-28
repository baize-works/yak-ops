/**
 * 与 Yak Security 内置接口保持一致的稳定权限编码。
 *
 * 页面、按钮和下拉操作统一引用这里，避免各组件自行拼接字符串后发生漂移。
 */
export const SECURITY_PERMISSIONS = {
  user: {
    read: 'security:user:read',
    create: 'security:user:create',
    update: 'security:user:update',
    resetPassword: 'security:user:reset-password',
    delete: 'security:user:delete',
  },
  role: {
    read: 'security:role:read',
    create: 'security:role:create',
    update: 'security:role:update',
    assign: 'security:role:assign',
    delete: 'security:role:delete',
  },
  permission: {
    read: 'security:permission:read',
    import: 'security:permission:import',
    delete: 'security:permission:delete',
  },
} as const;

export type SecurityPermissionCode =
  | (typeof SECURITY_PERMISSIONS.user)[keyof typeof SECURITY_PERMISSIONS.user]
  | (typeof SECURITY_PERMISSIONS.role)[keyof typeof SECURITY_PERMISSIONS.role]
  | (typeof SECURITY_PERMISSIONS.permission)[keyof typeof SECURITY_PERMISSIONS.permission];
