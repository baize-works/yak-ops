/** Yak Ops 业务模块稳定权限编码。 */
export const YAK_OPS_PERMISSIONS = {
  dataSource: {
    read: 'resource:data-source:read',
    create: 'datasource:create',
    update: 'datasource:update',
    delete: 'datasource:delete',
    test: 'datasource:test',
  },
  resource: {
    read: 'resource:view',
    create: 'resource:upload',
    update: 'resource:update',
    delete: 'resource:delete',
    download: 'resource:download',
  },
  quality: {
    templateRead: 'quality:template:read',
    monitorRead: 'quality:monitor:read',
    monitorCreate: 'quality:monitor:create',
    monitorUpdate: 'quality:monitor:update',
    monitorDelete: 'quality:monitor:delete',
    monitorRun: 'quality:monitor:run',
    executionRead: 'quality:execution:read',
  },
} as const;

export type YakOpsPermissionCode =
  | (typeof YAK_OPS_PERMISSIONS.dataSource)[keyof typeof YAK_OPS_PERMISSIONS.dataSource]
  | (typeof YAK_OPS_PERMISSIONS.resource)[keyof typeof YAK_OPS_PERMISSIONS.resource]
  | (typeof YAK_OPS_PERMISSIONS.quality)[keyof typeof YAK_OPS_PERMISSIONS.quality];
