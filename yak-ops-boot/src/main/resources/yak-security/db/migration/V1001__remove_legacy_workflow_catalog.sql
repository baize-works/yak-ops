-- Phase one removes the legacy workflow product and its security catalog.
-- Historical workflow tables are intentionally left untouched for audit and optional migration.

UPDATE yak_security_role_menu role_menu
JOIN yak_security_menu menu_row
  ON menu_row.id = role_menu.menu_id
 AND menu_row.app_name = role_menu.app_name
SET role_menu.is_delete = 1
WHERE role_menu.app_name = '${appName}'
  AND menu_row.menu_code IN ('workflow', 'workflow-project', 'workflow-management', 'workflow-instance');

UPDATE yak_security_menu
SET active = 0,
    visible = 0,
    is_delete = 1
WHERE app_name = '${appName}'
  AND menu_code IN ('workflow', 'workflow-project', 'workflow-management', 'workflow-instance');

UPDATE yak_security_role_permission role_permission
JOIN yak_security_permission permission_row
  ON permission_row.id = role_permission.permission_id
 AND permission_row.app_name = role_permission.app_name
SET role_permission.is_delete = 1
WHERE role_permission.app_name = '${appName}'
  AND (permission_row.permission_code = 'workflow'
       OR permission_row.permission_code LIKE 'workflow:%');

UPDATE yak_security_permission
SET active = 0,
    is_delete = 1
WHERE app_name = '${appName}'
  AND (permission_code = 'workflow' OR permission_code LIKE 'workflow:%');
