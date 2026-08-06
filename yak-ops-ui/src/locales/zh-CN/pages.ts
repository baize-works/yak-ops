export default {
  'pages.datasource.header.title': '数据源列表',
  'pages.datasource.header.desc': '一个统一的数据源治理系统，用于管理连接、访问权限和安全策略',


  'pages.datasource.common.title': '数据源',


  'pages.datasource.button.add': '新增',


  'pages.datasource.message.connectSuccess': '连接成功',
  'pages.datasource.message.unknownError': '未知错误',
  'pages.datasource.message.idNotExist': 'id不存在',


  'pages.datasource.delete.confirmTitle': '确认要删除吗？',
  'pages.datasource.delete.confirmContentLine1': '确认删除数据源 [{name}] 吗？',
  'pages.datasource.delete.confirmContentLine2':
    '数据源删除后不可恢复，请谨慎操作。',
  'pages.datasource.delete.okText': '删除',

  'pages.datasource.search.type': '数据源类型',
  'pages.datasource.search.name': '数据源名称',
  'pages.datasource.search.env': '环境',
  'pages.datasource.search.button': '搜索',

  // table columns
  'pages.datasource.table.col.index': '序号',
  'pages.datasource.table.col.dbInfo': '数据库信息',
  'pages.datasource.table.col.env': '环境',
  'pages.datasource.table.col.connInfo': '连接信息',
  'pages.datasource.table.col.status': '状态',
  'pages.datasource.table.col.createTime': '创建时间',
  'pages.datasource.table.col.updateTime': '更新时间',
  'pages.datasource.table.col.operate': '操作',

  // connection labels
  'pages.datasource.table.conn.jdbcUrl': 'JdbcUrl:',
  'pages.datasource.table.conn.schema': 'Schema:',

  // actions
  'pages.datasource.table.action.edit': '编辑',
  'pages.datasource.table.action.delete': '删除',
  'pages.datasource.table.action.test': '测试',

  // tooltips
  'pages.datasource.table.action.edit.tooltip': '编辑数据源',
  'pages.datasource.table.action.delete.tooltip': '删除数据源',
  'pages.datasource.table.action.test.tooltip': '连接测试',

  'pages.datasource.bottom.batchTest': '批量测试',
  'pages.datasource.bottom.batchDelete': '批量删除',

  // modal title
  'pages.datasource.modal.title.add': '新增',
  'pages.datasource.modal.title.edit': '编辑',

  // modal buttons
  'pages.datasource.modal.button.lastStep': '上一步',
  'pages.datasource.modal.button.connTest': '连接测试',
  'pages.datasource.modal.button.finish': '完成',
  'pages.datasource.modal.button.cancel': '取消',

  // modal messages
  'pages.datasource.modal.message.success': '成功',
  'pages.datasource.modal.message.fail': '失败',

  // form base fields
  'pages.datasource.form.dsName': '数据源名称',
  'pages.datasource.form.env': '环境',
  'pages.datasource.form.description': '描述',

  // placeholders
  'pages.datasource.form.inputPlaceholder': '请输入...',
  'pages.datasource.form.selectPlaceholder': '请选择...',

  // required messages
  'pages.datasource.form.dsNameRequired': '数据源名称不能为空',
  'pages.datasource.form.envRequired': '环境不能为空',

  // load config
  'pages.datasource.form.loadConfigFail': '加载表单配置失败',

  // custom other kv
  'pages.datasource.form.other.keyPlaceholder': 'key',
  'pages.datasource.form.other.valuePlaceholder': 'value',
  'pages.datasource.form.other.keyRequired': 'key不能为空',
  'pages.datasource.form.other.valueRequired': 'value不能为空',
  'pages.datasource.form.other.addConnSetting': '新增数据库连接配置',

  'pages.datasource.filter.commonDb': '常用数据库：',
  'pages.datasource.filter.all': '全部',
  'pages.datasource.filter.inputPlaceholder': '请输入...',

  'pages.datasync.header.title': '离线同步任务',
  'pages.datasync.header.subtitle': '完全向导式白屏配置，帮助您更轻松地创建数据同步任务 🪄',

  'pages.datasync.header.source.placeholder': '源端',
  'pages.datasync.header.source.prefix': '来源：',

  'pages.datasync.header.sink.placeholder': '目的端',
  'pages.datasync.header.sink.prefix': '去向：',

  'pages.datasync.header.button.start': '开始',

  // menu
  'pages.job.menu.view': '查看',
  'pages.job.menu.edit': '编辑',
  'pages.job.menu.delete': '删除',

  // table columns
  'pages.job.table.col.name': '名称/ID',
  'pages.job.table.col.syncPlan': '数据源同步方案',
  'pages.job.table.col.status': '状态',
  'pages.job.table.col.execution': '执行概况',
  'pages.job.table.col.schedule': '调度',
  'pages.job.table.col.createTime': '创建时间',
  'pages.job.table.col.operate': '操作',

  // labels inside Name column
  'pages.job.table.label.jobId': '任务定义ID',
  'pages.job.table.label.jobName': '任务名',

  // batch actions
  'pages.job.batch.start.success': '全部启动成功',
  'pages.job.batch.start.fail': '全部启动失败',
  'pages.job.batch.stop.success': '全部停止成功',
  'pages.job.batch.stop.fail': '全部停止失败',

  'pages.job.execution.runMode': '运行模式：',
  'pages.job.execution.time': '耗时：',
  'pages.job.execution.amount': '数据量：',
  'pages.job.execution.qps': 'QPS：',
  'pages.job.execution.size': '大小：',

  // units
  'pages.job.execution.unit.seconds': '秒',
  'pages.job.execution.unit.rows': '行',
  'pages.job.execution.unit.rowsPerSecond': '行/秒',

  'pages.job.schedule.cron': 'Cron：',
  'pages.job.schedule.status': '状态：',
  'pages.job.schedule.lastRunTime': '上次时间：',
  'pages.job.schedule.nextRunTime': '下次时间：',
  'pages.job.schedule.last5RunsTitle': '⏰ 最近 5 次运行时间',

  'pages.job.schedule.status.active': '启用',
  'pages.job.schedule.status.inactive': '停用',

  'pages.job.message.unknownError': '未知错误',

  // common
  'pages.common.yes': '是',
  'pages.common.no': '否',
  'pages.common.success': '成功',

  // messages
  'pages.job.message.idNotExist': 'id不存在',
  'pages.job.message.scheduleIdNotExist': '任务调度ID不存在',


  // delete confirm
  'pages.job.action.delete.confirmTitle': '确认删除？',
  'pages.job.action.delete.confirmContent': '确认删除任务 [{name}] 吗？',
  'pages.job.action.delete.okText': '删除',

  // actions: run/stop
  'pages.job.action.run': '运行',
  'pages.job.action.run.title': '运行任务',
  'pages.job.action.run.desc': '确认触发该离线任务？任务将立即执行一次，并按既定周期持续运行。',

  'pages.job.action.stop': '停止',
  'pages.job.action.stop.title': '停止任务',
  'pages.job.action.stop.desc': '确认停止该任务吗？',

  // schedule
  'pages.job.action.schedule.title': '调度任务',
  'pages.job.action.schedule.enable': '启用',
  'pages.job.action.schedule.disable': '停用',

  'pages.job.action.schedule.online.desc': '确认上线该调度任务吗？',
  'pages.job.action.schedule.online.success': '上线成功',

  'pages.job.action.schedule.offline.desc': '确认下线该调度任务吗？',
  'pages.job.action.schedule.offline.success': '下线成功',

  // more
  'pages.job.action.more': '更多',

  // search form labels
  'pages.job.search.jobName': '任务名',
  'pages.job.search.createTime': '创建时间',
  'pages.job.search.jobId': '任务定义ID',
  'pages.job.search.status': '状态',
  'pages.job.search.source': '源端',
  'pages.job.search.sink': '目的端',
  'pages.job.search.sourceTable': '源表',
  'pages.job.search.sinkTable': '目的表',

  // placeholders
  'pages.job.search.jobName.placeholder': '请输入任务名',
  'pages.job.search.jobId.placeholder': '请输入任务定义ID',
  'pages.job.search.selectPlaceholder': '请选择...',
  'pages.job.search.fuzzyPlaceholder': '模糊匹配...',

  // buttons
  'pages.job.search.button.search': '搜索',
  'pages.job.search.button.reset': '重置',

  // expand/collapse
  'pages.job.search.expand': '展开',
  'pages.job.search.collapse': '收起',

  // statuses (display only)
  'pages.job.status.running': '运行中',
  'pages.job.status.completed': '已完成',
  'pages.job.status.failed': '失败',

  'pages.job.config.basicSetting': '基础配置',

  'pages.job.config.jobName': '任务名称',
  'pages.job.config.jobName.required': '任务名称不能为空',

  'pages.job.config.jobDesc': '任务描述',

  'pages.job.config.multiSync': '多表同步',

  'pages.job.config.schedule.title': '调度配置',

  'pages.job.config.schedule.cronExpression': 'Cron 表达式',
  'pages.job.config.schedule.cronExpression.required': 'Cron 表达式不能为空',
  'pages.job.config.schedule.cronRequired': '请先输入 Cron 表达式',

  'pages.job.config.schedule.last5Runs.title': '最近 5 次运行',
  'pages.job.config.schedule.last5Runs.link': '最近 5 次运行',
  'pages.job.config.schedule.last5Runs.empty': '暂无预览',

  'pages.job.config.schedule.enableScheduling': '启用调度',
  'pages.job.config.schedule.enableScheduling.required': '请选择调度状态',

  'pages.job.config.schedule.status.active': '启用',
  'pages.job.config.schedule.status.paused': '暂停',

  'pages.job.config.envSetting': '环境配置',

  'pages.job.config.parallelism': '并行度',
  'pages.job.config.parallelism.required': '并行度不能为空',

  'pages.checklist.title': '检查清单（{total}）',
  'pages.checklist.subtitle': '发布前请确保所有问题已解决',
  'pages.checklist.nodeSuffix': '节点',

  'pages.publish.publish': '发布',
  'pages.publish.publishUpdate': '发布并更新',

  'pages.publish.latest': '最新发布',

  'pages.publish.timeAgo': '{time} 前发布',
  'pages.publish.time.hours': '16 小时',

  'pages.job.config.source.basicSetting': '基础配置',
  'pages.job.config.source.extraParams': '额外自定义参数配置',
  'pages.job.config.source.extraParams.tip': '配置额外的自定义参数',

  'pages.quality.preview.title': '数据预览（最多展示10条数据）',

  'pages.job.config.sourceFields.title': '字段信息',
  'pages.job.config.sourceFields.col.index': '编号',
  'pages.job.config.sourceFields.col.fieldName': '字段名称',
  'pages.job.config.sourceFields.col.fieldType': '字段类型',

  'pages.job.node.source.tab.sourceSetting': '源端配置',
  'pages.job.node.source.tab.outputFields': '输出字段',

  'pages.job.node.sink.tab.sinkSetting': '目的端配置',
  'pages.job.node.sink.tab.fieldsValidate': '字段校验',
  'pages.job.node.sink.tab.outputFields': '输出字段',

  'pages.job.config.sink.basicSetting': '基础配置',
  'pages.job.config.sink.extraParams': '额外自定义参数配置',
  'pages.job.config.sink.extraParams.tip': '配置额外的自定义参数',

  'pages.job.node.sink.fieldsValidate.title': '匹配结果',
  'pages.job.node.sink.fieldsValidate.allMatched': '全部匹配',
  'pages.job.node.sink.fieldsValidate.partialMismatch': '部分不匹配',
  'pages.job.node.sink.fieldsValidate.noUpstream': '没有上游节点',

  'pages.job.node.sink.fieldsValidate.col.index': '序号',
  'pages.job.node.sink.fieldsValidate.col.targetField': '目标字段',

  'pages.hoconPreview.resolveIssuesFirst': '请先解决所有问题 😊',
  'pages.hoconPreview.title': 'LinkUp Hocon',
  'pages.hoconPreview.tooltip': 'Hocon 模拟生成',

  // 建议全局复用
  'pages.common.close': '关闭',

  "pages.job.config.sink.basic.datasource": "数据源",
  "pages.job.config.sink.basic.datasource.placeholder": "请选择数据源",
  "pages.job.config.sink.basic.datasource.required": "请选择数据源",

  "pages.job.config.sink.basic.syncType": "同步类型",
  "pages.job.config.sink.basic.syncType.placeholder": "请选择同步类型",
  "pages.job.config.sink.basic.syncType.required": "请选择同步类型",

  // actions
  "pages.job.config.sink.basic.preview": "数据预览",
  "pages.job.config.sink.basic.count": "数据统计",

  // popover
  "pages.job.config.sink.basic.count.title": "数据统计",
  "pages.job.config.sink.basic.count.total": "数据总量：",

  // warnings
  "pages.job.config.sink.basic.warn.previewNotSupportAutoCreate": "自动建表模式不支持数据预览",
  "pages.job.config.sink.basic.warn.countNotSupportAutoCreate": "自动建表模式不支持数据统计",
  "pages.job.config.sink.basic.warn.selectDatasource": "请选择数据源",

  'pages.common.action.run': '运行',
  'pages.common.action.stop': '停止',


  'pages.job.overview.title': '任务概览',
  'pages.job.overview.mode': '任务模式',
  'pages.job.overview.timerange.24h': '最近24小时',

  "pages.job.summary.totalSyncs": "同步总记录数",
  "pages.job.summary.totalSyncVolume": "同步数据量",
  "pages.job.summary.totalExecutions": "执行次数",
  "pages.job.summary.successExecutions": "成功执行次数",
  "pages.job.summary.unit.times": "次",
  "pages.job.summary.unit.label": "单位",

  "pages.job.detail.basicInfo": "基本信息",
  "pages.job.detail.jobCode": "任务实例ID",
  "pages.job.detail.syncPlan": "同步方案",
  "pages.job.detail.startTime": "开始时间",
  "pages.job.detail.endTime": "结束时间",
  "pages.job.detail.jobVersion": "任务版本",
  "pages.job.detail.jobDescription": "任务描述",

  "pages.job.detail.empty": "请选择左侧运行记录查看详情",
  "pages.job.detail.noLog": "暂无日志",
  "pages.job.detail.loadLogFailed": "日志加载失败",

  "pages.job.detail.tabs.log": "日志",
  "pages.job.detail.tabs.hocon": "配置",
  "pages.job.detail.tabs.metrics": "指标",
  "pages.job.detail.tabs.schedule": "调度",
  "pages.job.detail.tabs.table": "表信息",

  "pages.job.history.tip.last3days": "仅展示最近三天的运行历史 😊",
  "pages.job.history.status.placeholder": "按状态筛选",

  "pages.job.history.status.all": "全部状态",
  "pages.job.history.status.finished": "成功",
  "pages.job.history.status.failed": "失败",
  "pages.job.history.status.running": "运行中",
  "pages.job.history.status.pending": "等待中",

  "pages.job.detail.metrics.throughput": "吞吐量（QPS）",
  "pages.job.detail.metrics.totalVolume": "总量统计",

  "pages.job.detail.metrics.readQps": "读取 QPS",
  "pages.job.detail.metrics.writeQps": "写入 QPS",
  "pages.job.detail.metrics.readRows": "读取行数",
  "pages.job.detail.metrics.writeRows": "写入行数",

  "pages.job.detail.metrics.unit.rowsPerSecond": "行/秒",
  "pages.job.detail.metrics.unit.records": "条",

  "pages.job.detail.schedule.status": "调度状态",
  "pages.job.detail.schedule.nextTime": "下一次调度时间",
  "pages.job.detail.schedule.lastTime": "上一次调度时间",
  "pages.job.detail.schedule.cron": "Cron 表达式",
  "pages.job.detail.schedule.info": "调度信息",
  "pages.job.history.title": "运行历史",

  "pages.datasource.form.installPlugin": "安装插件",

  "pages.alarm.header.title": "告警管理",
  "pages.alarm.header.desc": "统一管理告警通道、告警规则与投递记录，让任务异常第一时间被感知。",
  "pages.alarm.tab.channels": "告警通道",
  "pages.alarm.tab.rules": "告警规则",
  "pages.alarm.tab.records": "告警记录",
  "pages.alarm.field.name": "名称",
  "pages.alarm.field.enabled": "启用",
  "pages.alarm.field.description": "描述",
  "pages.alarm.field.jobDefinition": "目标任务",
  "pages.alarm.field.jobDefinition.tooltip": "选择「全部任务」时，可使用排除列表跳过特定任务",
  "pages.alarm.field.triggerStatuses": "触发状态",
  "pages.alarm.field.severity": "严重级别",
  "pages.alarm.field.channelIds": "告警通道",
  "pages.alarm.field.channelIds.tooltip": "可关联一个或多个通道，告警将同时投递",
  "pages.alarm.field.excludes": "排除任务",
  "pages.alarm.field.excludes.tooltip": "逗号分隔的任务定义 id，这些任务不会被本规则触发",
  "pages.alarm.field.allJobs": "全部任务",
  "pages.alarm.placeholder.channelName": "请输入通道名称",
  "pages.alarm.placeholder.ruleName": "请输入规则名称",
  "pages.alarm.placeholder.jobDefinition": "请选择目标任务",
  "pages.alarm.placeholder.triggerStatuses": "任务进入这些状态时触发告警",
  "pages.alarm.placeholder.channelIds": "请选择告警通道",
  "pages.alarm.placeholder.searchChannel": "搜索通道名称或类型",
  "pages.alarm.placeholder.searchRule": "搜索规则名称",
  "pages.alarm.button.addChannel": "新建通道",
  "pages.alarm.button.addRule": "新建规则",
  "pages.alarm.button.edit": "编辑",
  "pages.alarm.button.delete": "删除",
  "pages.alarm.button.refresh": "刷新",
  "pages.alarm.modal.channel.title.add": "新建告警通道",
  "pages.alarm.modal.channel.title.edit": "编辑告警通道",
  "pages.alarm.modal.channel.config": "通道配置",
  "pages.alarm.modal.channel.prev": "上一步",
  "pages.alarm.modal.channel.noType": "暂无可用的通道类型",
  "pages.alarm.modal.rule.title.add": "新建告警规则",
  "pages.alarm.modal.rule.title.edit": "编辑告警规则",
  "pages.alarm.modal.cancel": "取消",
  "pages.alarm.modal.confirm": "完成",
  "pages.alarm.message.success": "操作成功",
  "pages.alarm.delete.confirmTitle": "确认删除？",
  "pages.alarm.delete.okText": "删除",
  "pages.alarm.channel.delete.confirmContent": "确认删除告警通道 [{name}] 吗？",
  "pages.alarm.rule.delete.confirmContent": "确认删除告警规则 [{name}] 吗？",
  "pages.alarm.table.col.name": "名称",
  "pages.alarm.table.col.type": "类型",
  "pages.alarm.table.col.enabled": "状态",
  "pages.alarm.table.col.description": "描述",
  "pages.alarm.table.col.createTime": "创建时间",
  "pages.alarm.table.col.action": "操作",
  "pages.alarm.table.col.targetJob": "目标任务",
  "pages.alarm.table.col.triggerStatuses": "触发状态",
  "pages.alarm.table.col.severity": "严重级别",
  "pages.alarm.table.col.jobName": "任务名称",
  "pages.alarm.table.col.newStatus": "任务状态",
  "pages.alarm.table.col.channelType": "通道类型",
  "pages.alarm.table.col.success": "投递结果",
  "pages.alarm.table.col.errorMessage": "错误信息",
  "pages.alarm.table.col.content": "告警内容",
  "pages.alarm.table.col.sentTime": "发送时间",
  "pages.alarm.record.hint": "展示告警投递记录，仅可查看。",
  "pages.alarm.message.enabled": "已启用",
  "pages.alarm.message.disabled": "已禁用",
  "pages.alarm.message.deleteSuccess": "删除成功",
  "pages.alarm.button.test": "测试",
  "pages.alarm.button.filter": "筛选",
  "pages.alarm.button.reset": "重置",
  "pages.alarm.channel.test.noConfig": "通道配置不完整，无法测试",
  "pages.alarm.table.col.linkedChannels": "关联通道",
  "pages.alarm.placeholder.filterChannelType": "通道类型",
  "pages.alarm.placeholder.filterSeverity": "严重级别",
  "pages.alarm.placeholder.filterResult": "投递结果",
  "pages.alarm.record.success": "成功",
  "pages.alarm.record.fail": "失败",
  "pages.alarm.pagination.total": "共 {total} 条",
};
