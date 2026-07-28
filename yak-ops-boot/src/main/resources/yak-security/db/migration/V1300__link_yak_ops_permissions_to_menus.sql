-- Yak Ops 业务按钮权限与稳定菜单编码绑定。
-- 菜单只控制页面访问；按钮权限会自动包含所属菜单和父级目录。

UPDATE yak_security_permission
SET menu_code='batch-link-up'
WHERE app_name='${appName}' AND is_delete=0
  AND permission_code LIKE 'task:batch:%';

UPDATE yak_security_permission
SET menu_code='realtime-link-up'
WHERE app_name='${appName}' AND is_delete=0
  AND permission_code LIKE 'task:realtime:%';

UPDATE yak_security_permission
SET menu_code='workflow-project'
WHERE app_name='${appName}' AND is_delete=0
  AND permission_code LIKE 'workflow:project:%';

UPDATE yak_security_permission
SET menu_code='workflow-management'
WHERE app_name='${appName}' AND is_delete=0
  AND (permission_code LIKE 'workflow:definition:%'
       OR permission_code='workflow:schedule:manage'
       OR permission_code IN ('workflow:view','workflow:create','workflow:update','workflow:delete','workflow:execute'));

UPDATE yak_security_permission
SET menu_code='workflow-instance'
WHERE app_name='${appName}' AND is_delete=0
  AND permission_code LIKE 'workflow:instance:%';

UPDATE yak_security_permission
SET menu_code='data-source'
WHERE app_name='${appName}' AND is_delete=0
  AND (permission_code LIKE 'resource:data-source:%'
       OR permission_code LIKE 'datasource:%');

UPDATE yak_security_permission
SET menu_code='client'
WHERE app_name='${appName}' AND is_delete=0
  AND permission_code LIKE 'resource:client:%';

UPDATE yak_security_permission
SET menu_code='connector'
WHERE app_name='${appName}' AND is_delete=0
  AND permission_code LIKE 'resource:connector:%';

UPDATE yak_security_permission
SET menu_code='data-quality'
WHERE app_name='${appName}' AND is_delete=0
  AND (permission_code LIKE 'quality:rule:%'
       OR permission_code IN ('quality:view','quality:create','quality:update','quality:delete','quality:execute'));

UPDATE yak_security_permission
SET menu_code='data-quality-report'
WHERE app_name='${appName}' AND is_delete=0
  AND permission_code LIKE 'quality:report:%';

UPDATE yak_security_permission
SET menu_code='metrics'
WHERE app_name='${appName}' AND is_delete=0
  AND permission_code LIKE 'operations:metrics:%';

UPDATE yak_security_permission
SET menu_code='alarm'
WHERE app_name='${appName}' AND is_delete=0
  AND permission_code LIKE 'operations:alarm:%';

UPDATE yak_security_permission
SET menu_code='knowledge-management'
WHERE app_name='${appName}' AND is_delete=0
  AND permission_code LIKE 'knowledge:%';

-- 已有角色的按钮权限自动回填所属菜单。
INSERT IGNORE INTO yak_security_role_menu(role_id,menu_id,app_name)
SELECT DISTINCT role_permission.role_id,menu_row.id,role_permission.app_name
FROM yak_security_role_permission role_permission
JOIN yak_security_permission permission_row
  ON permission_row.id=role_permission.permission_id
 AND permission_row.app_name=role_permission.app_name
 AND permission_row.is_delete=0
 AND permission_row.active=1
 AND permission_row.menu_code IS NOT NULL
JOIN yak_security_menu menu_row
  ON menu_row.menu_code=permission_row.menu_code
 AND menu_row.app_name=role_permission.app_name
 AND menu_row.is_delete=0
 AND menu_row.active=1
WHERE role_permission.app_name='${appName}'
  AND role_permission.is_delete=0;

-- 回填一级父目录。
INSERT IGNORE INTO yak_security_role_menu(role_id,menu_id,app_name)
SELECT DISTINCT role_menu.role_id,parent_menu.id,role_menu.app_name
FROM yak_security_role_menu role_menu
JOIN yak_security_menu child_menu
  ON child_menu.id=role_menu.menu_id
 AND child_menu.app_name=role_menu.app_name
 AND child_menu.is_delete=0
JOIN yak_security_menu parent_menu
  ON parent_menu.menu_code=child_menu.parent_code
 AND parent_menu.app_name=role_menu.app_name
 AND parent_menu.is_delete=0
 AND parent_menu.active=1
WHERE role_menu.app_name='${appName}'
  AND role_menu.is_delete=0
  AND child_menu.parent_code IS NOT NULL;
