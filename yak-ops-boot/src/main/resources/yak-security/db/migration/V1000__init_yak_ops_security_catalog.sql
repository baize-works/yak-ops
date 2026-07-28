-- Yak Ops 自有的权限、菜单及历史授权兼容数据。
-- 该脚本由 Yak Security 独立 Flyway 在安全数据源中执行。

-- 1. 权限分组。SQL 管理的权限 declared=0，避免声明式注册器在移除 Java Provider 后将其停用。
INSERT INTO yak_security_permission
(permission_code,permission_name,parent_id,leaf,level,description,active,declared,app_name)
VALUES
('security','系统管理',0,0,1,'Yak Ops 系统管理权限',1,0,'${appName}'),
('task','数据集成',0,0,1,'Yak Ops 数据集成权限',1,0,'${appName}'),
('datasource','数据源管理兼容权限',0,0,1,'Yak Ops 旧版数据源权限',1,0,'${appName}'),
('job','任务管理兼容权限',0,0,1,'Yak Ops 旧版任务权限',1,0,'${appName}'),
('workflow','流程编排',0,0,1,'Yak Ops 工作流权限',1,0,'${appName}'),
('resource','资源管理',0,0,1,'Yak Ops 资源权限',1,0,'${appName}'),
('quality','数据质量',0,0,1,'Yak Ops 数据质量权限',1,0,'${appName}'),
('operations','运维中心',0,0,1,'Yak Ops 运维权限',1,0,'${appName}'),
('knowledge','知识管理',0,0,1,'Yak Ops 知识管理权限',1,0,'${appName}')
ON DUPLICATE KEY UPDATE
permission_name=VALUES(permission_name),
parent_id=VALUES(parent_id),
leaf=VALUES(leaf),
level=VALUES(level),
description=VALUES(description),
active=VALUES(active),
declared=VALUES(declared);

-- 2. 权限叶子节点。
INSERT INTO yak_security_permission
(permission_code,permission_name,parent_id,leaf,level,description,active,declared,app_name)
SELECT item.permission_code,
       item.permission_name,
       parent.id,
       1,
       2,
       item.description,
       1,
       0,
       parent.app_name
FROM yak_security_permission parent
JOIN (
    SELECT 'security' parent_code,'security:root' permission_code,'超级管理员' permission_name,'拥有 Yak Ops 全部权限' description
    UNION ALL SELECT 'security','security:user:read','查看用户管理','查看用户管理页面及接口'
    UNION ALL SELECT 'security','security:role:read','查看角色管理','查看角色管理页面及接口'
    UNION ALL SELECT 'security','security:permission:read','查看权限管理','查看权限管理页面及接口'
    UNION ALL SELECT 'security','security:department:read','查看部门管理','查看部门管理页面及接口'
    UNION ALL SELECT 'security','security:project:read','查看授权项目','查看 Security 授权项目页面及接口'
    UNION ALL SELECT 'security','security:resource-permission:read','查看资源授权','查看资源授权页面及接口'
    UNION ALL SELECT 'security','security:config:read','查看系统配置','查看系统配置页面及接口'
    UNION ALL SELECT 'security','security:operation-log:read','查看操作日志','查看操作日志页面及接口'

    UNION ALL SELECT 'task','task:batch:read','查看离线同步','查看离线同步页面及接口'
    UNION ALL SELECT 'task','task:batch:create','新建离线同步','创建离线同步任务'
    UNION ALL SELECT 'task','task:realtime:read','查看实时同步','查看实时同步页面及接口'
    UNION ALL SELECT 'task','task:realtime:create','新建实时同步','创建实时同步任务'

    UNION ALL SELECT 'datasource','datasource:view','查看数据源','旧版数据源查看权限'
    UNION ALL SELECT 'datasource','datasource:create','新增数据源','旧版数据源新增权限'
    UNION ALL SELECT 'datasource','datasource:update','编辑数据源','旧版数据源编辑权限'
    UNION ALL SELECT 'datasource','datasource:delete','删除数据源','旧版数据源删除权限'
    UNION ALL SELECT 'datasource','datasource:test','测试数据源连接','旧版数据源连接测试权限'

    UNION ALL SELECT 'job','job:view','查看任务','旧版任务查看权限'
    UNION ALL SELECT 'job','job:create','新增任务','旧版任务新增权限'
    UNION ALL SELECT 'job','job:update','编辑任务','旧版任务编辑权限'
    UNION ALL SELECT 'job','job:delete','删除任务','旧版任务删除权限'
    UNION ALL SELECT 'job','job:execute','执行任务','旧版任务执行权限'
    UNION ALL SELECT 'job','job:stop','停止任务','旧版任务停止权限'

    UNION ALL SELECT 'workflow','workflow:project:read','查看工作流项目','查看工作流项目页面及接口'
    UNION ALL SELECT 'workflow','workflow:definition:read','查看工作流定义','查看工作流定义页面及接口'
    UNION ALL SELECT 'workflow','workflow:definition:create','新建工作流定义','创建工作流定义'
    UNION ALL SELECT 'workflow','workflow:instance:read','查看工作流实例','查看工作流实例页面及接口'
    UNION ALL SELECT 'workflow','workflow:view','查看工作流（兼容）','旧版工作流查看权限'
    UNION ALL SELECT 'workflow','workflow:create','新增工作流（兼容）','旧版工作流新增权限'
    UNION ALL SELECT 'workflow','workflow:update','编辑工作流（兼容）','旧版工作流编辑权限'
    UNION ALL SELECT 'workflow','workflow:delete','删除工作流（兼容）','旧版工作流删除权限'
    UNION ALL SELECT 'workflow','workflow:execute','执行工作流（兼容）','旧版工作流执行权限'

    UNION ALL SELECT 'resource','resource:data-source:read','查看数据源管理','查看数据源管理页面及接口'
    UNION ALL SELECT 'resource','resource:client:read','查看客户端管理','查看客户端管理页面及接口'
    UNION ALL SELECT 'resource','resource:connector:read','查看连接器管理','查看连接器管理页面及接口'
    UNION ALL SELECT 'resource','resource:view','查看资源（兼容）','旧版资源查看权限'
    UNION ALL SELECT 'resource','resource:upload','上传资源（兼容）','旧版资源上传权限'
    UNION ALL SELECT 'resource','resource:download','下载资源（兼容）','旧版资源下载权限'
    UNION ALL SELECT 'resource','resource:update','编辑资源（兼容）','旧版资源编辑权限'
    UNION ALL SELECT 'resource','resource:delete','删除资源（兼容）','旧版资源删除权限'

    UNION ALL SELECT 'quality','quality:rule:read','查看质量规则','查看质量规则页面及接口'
    UNION ALL SELECT 'quality','quality:report:read','查看质量报告','查看质量报告页面及接口'
    UNION ALL SELECT 'quality','quality:view','查看质量规则（兼容）','旧版质量规则查看权限'
    UNION ALL SELECT 'quality','quality:create','新增质量规则（兼容）','旧版质量规则新增权限'
    UNION ALL SELECT 'quality','quality:update','编辑质量规则（兼容）','旧版质量规则编辑权限'
    UNION ALL SELECT 'quality','quality:delete','删除质量规则（兼容）','旧版质量规则删除权限'
    UNION ALL SELECT 'quality','quality:execute','执行质量检查（兼容）','旧版质量检查执行权限'

    UNION ALL SELECT 'operations','operations:metrics:read','查看运行监控','查看运行监控页面及接口'
    UNION ALL SELECT 'operations','operations:alarm:read','查看告警管理','查看告警管理页面及接口'
    UNION ALL SELECT 'knowledge','knowledge:read','查看知识管理','查看知识管理页面及接口'
) item ON item.parent_code=parent.permission_code
WHERE parent.app_name='${appName}'
  AND parent.is_delete=0
ON DUPLICATE KEY UPDATE
permission_name=VALUES(permission_name),
parent_id=VALUES(parent_id),
leaf=VALUES(leaf),
level=VALUES(level),
description=VALUES(description),
active=VALUES(active),
declared=VALUES(declared);

-- 3. Yak Ops 菜单目录。
INSERT INTO yak_security_menu
(menu_code,menu_name,parent_code,route_path,icon_key,menu_type,sort_order,visible,active,required_permission_code,description,app_name)
VALUES
('integration','数据集成',NULL,NULL,'sync',1,10,1,1,NULL,'数据同步任务入口','${appName}'),
('batch-link-up','离线同步','integration','/sync/batch-link-up','sync',2,10,1,1,'task:batch:read','离线数据同步管理','${appName}'),
('realtime-link-up','实时同步','integration','/sync/realtime-link-up','realtime',2,20,1,1,'task:realtime:read','实时数据同步管理','${appName}'),
('workflow','流程编排',NULL,NULL,'workflow',1,20,1,1,NULL,'工作流编排入口','${appName}'),
('workflow-project','工作流项目','workflow','/workflow-project','project',2,10,1,1,'workflow:project:read','工作流项目管理','${appName}'),
('workflow-management','工作流管理','workflow','/workflow-management','workflow',2,20,1,1,'workflow:definition:read','工作流定义管理','${appName}'),
('workflow-instance','工作流实例','workflow','/workflow-instance','instance',2,30,1,1,'workflow:instance:read','工作流实例管理','${appName}'),
('resources','资源管理',NULL,NULL,'database',1,30,1,1,NULL,'数据资源入口','${appName}'),
('data-source','数据源管理','resources','/data-source','database',2,10,1,1,'resource:data-source:read','数据源管理','${appName}'),
('client','客户端管理','resources','/client','client',2,20,1,1,'resource:client:read','客户端管理','${appName}'),
('connector','连接器管理','resources','/connector','connector',2,30,1,1,'resource:connector:read','连接器管理','${appName}'),
('quality','数据质量',NULL,NULL,'quality',1,40,1,1,NULL,'数据质量入口','${appName}'),
('data-quality','质量规则','quality','/data-quality','quality',2,10,1,1,'quality:rule:read','质量规则管理','${appName}'),
('data-quality-report','质量报告','quality','/data-quality/report','report',2,20,1,1,'quality:report:read','质量报告查询','${appName}'),
('operations','运维中心',NULL,NULL,'monitor',1,50,1,1,NULL,'运行运维入口','${appName}'),
('metrics','运行监控','operations','/metrics','monitor',2,10,1,1,'operations:metrics:read','运行指标监控','${appName}'),
('alarm','告警管理','operations','/alarm','alarm',2,20,1,1,'operations:alarm:read','告警管理','${appName}'),
('knowledge-management','知识管理',NULL,'/knowledge-management','knowledge',2,55,1,1,'knowledge:read','知识管理隐藏入口','${appName}'),
('system','系统管理',NULL,NULL,'system',1,60,1,1,NULL,'安全与系统管理入口','${appName}'),
('system-users','用户管理','system','/system/users','system',2,10,1,1,'security:user:read','用户管理','${appName}'),
('system-roles','角色管理','system','/system/roles','system',2,20,1,1,'security:role:read','角色及授权管理','${appName}'),
('system-permissions','权限管理','system','/system/permissions','system',2,30,1,1,'security:permission:read','操作权限管理','${appName}'),
('system-departments','部门管理','system','/system/departments','system',2,40,1,1,'security:department:read','部门管理','${appName}'),
('system-security-projects','Security 授权项目','system','/system/projects','system',2,50,1,1,'security:project:read','安全项目管理','${appName}'),
('system-resource-permissions','资源授权','system','/system/resource-permissions','system',2,60,1,1,'security:resource-permission:read','资源级授权管理','${appName}'),
('system-configs','系统配置','system','/system/configs','system',2,70,1,1,'security:config:read','系统配置管理','${appName}'),
('system-operation-logs','操作日志','system','/system/oplogs','system',2,80,1,1,'security:operation-log:read','操作日志查询','${appName}')
ON DUPLICATE KEY UPDATE
menu_name=VALUES(menu_name),
parent_code=VALUES(parent_code),
route_path=VALUES(route_path),
icon_key=VALUES(icon_key),
menu_type=VALUES(menu_type),
sort_order=VALUES(sort_order),
visible=VALUES(visible),
active=VALUES(active),
required_permission_code=VALUES(required_permission_code),
description=VALUES(description);

-- 4. 为旧数据库中的系统管理员补齐 root 权限。
INSERT IGNORE INTO yak_security_role_permission(role_id,permission_id,app_name)
SELECT role_row.id,permission_row.id,role_row.app_name
FROM yak_security_role role_row
JOIN yak_security_permission permission_row
  ON permission_row.permission_code='security:root'
 AND permission_row.app_name=role_row.app_name
 AND permission_row.is_delete=0
WHERE role_row.role_name='系统管理员'
  AND role_row.app_name='${appName}'
  AND role_row.is_delete=0;

-- 5. 根据已有读取权限回填角色菜单，升级后不丢失原页面入口。
INSERT IGNORE INTO yak_security_role_menu(role_id,menu_id,app_name)
SELECT DISTINCT role_permission.role_id,menu_row.id,role_permission.app_name
FROM yak_security_role_permission role_permission
JOIN yak_security_permission permission_row
  ON permission_row.id=role_permission.permission_id
 AND permission_row.app_name=role_permission.app_name
 AND permission_row.is_delete=0
JOIN yak_security_menu menu_row
  ON menu_row.required_permission_code=permission_row.permission_code
 AND menu_row.app_name=role_permission.app_name
 AND menu_row.is_delete=0
WHERE role_permission.app_name='${appName}'
  AND role_permission.is_delete=0;

-- 6. root 角色保留全部 Yak Ops 菜单。
INSERT IGNORE INTO yak_security_role_menu(role_id,menu_id,app_name)
SELECT DISTINCT role_permission.role_id,menu_row.id,role_permission.app_name
FROM yak_security_role_permission role_permission
JOIN yak_security_permission permission_row
  ON permission_row.id=role_permission.permission_id
 AND permission_row.app_name=role_permission.app_name
 AND permission_row.permission_code='security:root'
 AND permission_row.is_delete=0
JOIN yak_security_menu menu_row
  ON menu_row.app_name=role_permission.app_name
 AND menu_row.is_delete=0
WHERE role_permission.app_name='${appName}'
  AND role_permission.is_delete=0;
