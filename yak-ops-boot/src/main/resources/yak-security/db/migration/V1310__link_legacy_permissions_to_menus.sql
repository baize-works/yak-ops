-- PermissionMenuRelationService builds a permission-to-menu map with Collectors.toMap,
-- which does not accept null values.  The legacy permissions below were introduced by
-- V1000 without a menu_code and therefore made GET /api/v1/permission/tree fail.

UPDATE yak_security_permission
SET menu_code='batch-link-up'
WHERE app_name='${appName}' AND is_delete=0
  AND permission_code LIKE 'job:%';

UPDATE yak_security_permission
SET menu_code='data-source'
WHERE app_name='${appName}' AND is_delete=0
  AND permission_code IN (
    'resource:view',
    'resource:upload',
    'resource:download',
    'resource:update',
    'resource:delete'
  );

-- Keep existing roles consistent with the newly completed relations.
INSERT IGNORE INTO yak_security_role_menu(role_id,menu_id,app_name)
SELECT DISTINCT role_permission.role_id,menu_row.id,role_permission.app_name
FROM yak_security_role_permission role_permission
JOIN yak_security_permission permission_row
  ON permission_row.id=role_permission.permission_id
 AND permission_row.app_name=role_permission.app_name
 AND permission_row.is_delete=0
 AND permission_row.active=1
JOIN yak_security_menu menu_row
  ON menu_row.menu_code=permission_row.menu_code
 AND menu_row.app_name=role_permission.app_name
 AND menu_row.is_delete=0
 AND menu_row.active=1
WHERE role_permission.app_name='${appName}'
  AND role_permission.is_delete=0
  AND (permission_row.permission_code LIKE 'job:%'
       OR permission_row.permission_code IN (
         'resource:view',
         'resource:upload',
         'resource:download',
         'resource:update',
         'resource:delete'
       ));
