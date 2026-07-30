/** Yak Ops 业务模块稳定权限编码。 */
export const YAK_OPS_PERMISSIONS = {
  dataSource: {
    read: 'resource:data-source:read',
    create: 'datasource:create',
    update: 'datasource:update',
    delete: 'datasource:delete',
    test: 'datasource:test',
  },
} as const;

export type YakOpsPermissionCode =
  (typeof YAK_OPS_PERMISSIONS.dataSource)[keyof typeof YAK_OPS_PERMISSIONS.dataSource];
