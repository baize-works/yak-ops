-- MySQL CDC Source parameter metadata initialization script
-- Number of parameters: 32
-- Notes:
-- 1. The id field is not explicitly inserted; it is generated automatically by AUTO_INCREMENT.
-- 2. The server-id uses the platform-recommended default value of 5600; SeaTunnel generates one randomly when it is not configured.
-- 3. ON DUPLICATE KEY UPDATE is used so the script can be executed repeatedly and existing parameter metadata can be updated.
-- 4. A unique index is required to uniquely identify records by connector_name + connector_type + param_name.

START TRANSACTION;

INSERT INTO `t_baize_flow_connector_param_meta`
(`type`, `connector_name`, `connector_type`, `param_name`, `param_desc`,
 `param_type`, `required_flag`, `default_value`, `example_value`, `param_context`,
 `remark`, `deleted`)
VALUES
('connector', 'MySQL-CDC', 'source', 'table-names-config', '表级配置列表，可为不同表指定主键和快照分片列。', 'array', 0, NULL, '[{"table":"db1.table1","primaryKeys":["key1"],"snapshotSplitColumn":"key2"}]', '{"summary":"为指定表覆盖主键和快照分片列配置。","coreMeaning":"用于无主键表、复合主键表或默认分片列不合适的场景。","recommendationHints":["仅对确有特殊需求的表进行单独配置。"],"cautions":["primaryKeys 必须能够唯一标识记录。","snapshotSplitColumn 应尽量有索引且分布均匀。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'stop.mode', 'MySQL CDC 停止模式：never、latest 或 specific。', 'enum', 0, 'NEVER', 'never', '{"summary":"控制 CDC Source 是否在指定 Binlog 位置自动结束。","coreMeaning":"never 用于持续实时任务，latest 或 specific 用于有界增量读取。","validValues":["never","latest","specific"],"recommendationHints":["长期实时同步使用 never。","批式增量截取可根据需求使用 latest 或 specific。"],"cautions":["specific 需要同时配置停止文件和位置。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'stop.specific-offset.file', 'stop.mode=specific 时指定停止 Binlog 文件名。', 'string', 0, NULL, 'mysql-bin.000130', '{"summary":"指定 CDC 消费的结束 Binlog 文件。","coreMeaning":"与 stop.specific-offset.pos 共同定义有界 CDC 的停止位置。","dependencies":["stop.mode=specific","stop.specific-offset.pos"],"recommendationHints":["用于明确限定增量采集区间。"],"cautions":["仅 stop.mode=specific 时生效。","停止位点必须晚于启动位点。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'stop.specific-offset.pos', 'stop.mode=specific 时指定停止 Binlog 文件位置。', 'number', 0, NULL, '15678', '{"summary":"指定 CDC 消费的结束 Binlog position。","coreMeaning":"任务消费到该位置后停止。","dependencies":["stop.mode=specific","stop.specific-offset.file"],"recommendationHints":["应与停止 Binlog 文件配套配置。"],"cautions":["仅 stop.mode=specific 时生效。","位点不合理可能导致任务立即结束或无法到达。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'snapshot.split.size', '快照阶段单个分片包含的目标行数。', 'number', 0, '8096', '20000', '{"summary":"控制历史快照读取时的分片粒度。","coreMeaning":"表会拆分为多个 snapshot split，并由并行任务读取。","recommendationHints":["超大表可结合数据库承载能力适当调小以提升并行度。","中小表可保持默认。"],"cautions":["过小会产生大量 split 和调度开销。","过大可能造成单分片长尾。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'snapshot.fetch.size', '快照读取时每次轮询最多抓取的记录数。', 'number', 0, '1024', '2048', '{"summary":"控制快照阶段 JDBC 结果集单次拉取批量。","coreMeaning":"影响数据库往返次数、网络传输和 TaskManager 内存占用。","recommendationHints":["窄表、大结果集可适当调大。","宽表、大字段或内存敏感时适当调小。"],"cautions":["不是快照总行数限制。","不是越大越好。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'server-time-zone', 'MySQL 数据库服务器会话时区。', 'string', 0, 'UTC', 'Asia/Shanghai', '{"summary":"指定 MySQL CDC 解析时间字段时使用的服务器时区。","coreMeaning":"用于避免 TIMESTAMP、DATETIME 等字段在源端与运行环境之间产生时区偏差。","recommendationHints":["应与 MySQL server/session time_zone 保持一致。","中国标准时间通常使用 Asia/Shanghai。"],"cautions":["错误时区可能造成时间字段整体偏移。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'connect.timeout.ms', '连接 MySQL 数据库的最大等待时间，单位毫秒。', 'duration', 0, '30000', '60000', '{"summary":"控制建立 MySQL 连接时的超时时间。","coreMeaning":"连接超过该时长仍未成功时判定失败。","recommendationHints":["内网环境通常保持默认。","跨区域或代理网络可适当调大。"],"cautions":["过大延长故障发现时间。","过小可能在网络抖动时误判失败。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'connect.max-retries', '建立 MySQL 数据库连接失败后的最大重试次数。', 'number', 0, '3', '5', '{"summary":"控制连接初始化失败后的重试次数。","coreMeaning":"用于应对数据库短暂不可用、网络抖动或连接建立失败。","recommendationHints":["生产环境可结合故障恢复时间设置 3 至 5 次。"],"cautions":["持续性配置错误不会因重试而恢复。","次数过大将延迟任务失败反馈。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'connection.pool.size', '快照阶段使用的 JDBC 连接池大小。', 'number', 0, '20', '20', '{"summary":"控制 MySQL CDC 快照读取使用的 JDBC 连接数量。","coreMeaning":"连接池大小影响快照并发能力和源数据库连接压力。","recommendationHints":["应结合 Source 并行度、MySQL max_connections 和其他业务负载设置。"],"cautions":["过大可能压垮源库或耗尽连接数。","过小可能限制快照阶段吞吐。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'chunk-key.even-distribution.factor.upper-bound', '判断快照分片键是否均匀分布的上界因子。', 'number', 0, '100', '100', '{"summary":"设置分片键均匀分布判断的上界。","coreMeaning":"当 (MAX-MIN+1)/行数 超过该值时，分片键可能被判定为非均匀分布。","recommendationHints":["通常保持默认值。","仅在理解分片算法并完成压测后调整。"],"cautions":["错误调整可能导致不合适的分片策略。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'chunk-key.even-distribution.factor.lower-bound', '判断快照分片键是否均匀分布的下界因子。', 'number', 0, '0.05', '0.05', '{"summary":"设置分片键均匀分布判断的下界。","coreMeaning":"当 (MAX-MIN+1)/行数 低于该值时，分片键可能被判定为非均匀分布。","recommendationHints":["通常保持默认值。","仅在理解分片算法并完成压测后调整。"],"cautions":["错误调整可能导致不合适的分片策略。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'sample-sharding.threshold', '估算分片数超过该阈值且数据分布不均时触发采样分片策略。', 'number', 0, '1000', '1000', '{"summary":"控制何时启用采样分片策略。","coreMeaning":"当分片键分布不均且预计分片数超过阈值时，通过采样估算分片边界。","recommendationHints":["超大表和稀疏主键场景通常保持默认或通过压测调整。"],"cautions":["阈值过低会增加采样开销。","阈值过高可能产生不均匀分片。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'inverse-sampling.rate', '采样分片策略的采样率倒数，例如 1000 表示采样率为 1/1000。', 'number', 0, '1000', '1000', '{"summary":"控制采样分片时的采样密度。","coreMeaning":"值越大实际采样比例越低，值越小采样数据越多。","recommendationHints":["超大数据集可使用较低采样率控制数据库开销。"],"cautions":["采样过少可能降低分片边界准确性。","采样过多会增加数据库扫描压力。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'exactly_once', '是否启用 MySQL CDC Exactly-Once 语义。', 'boolean', 0, 'false', 'true', '{"summary":"控制 CDC Source 是否启用精确一次语义。","coreMeaning":"开启后结合 checkpoint 保存消费位点，降低故障恢复后的重复或遗漏风险。","recommendationHints":["对一致性要求高的实时任务建议结合可靠 checkpoint 开启并验证。"],"cautions":["必须同时保证下游 Sink 的一致性语义。","仅 Source 开启不能保证端到端 Exactly-Once。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'format', 'MySQL CDC 输出格式，可选 DEFAULT 或 COMPATIBLE_DEBEZIUM_JSON。', 'enum', 0, 'DEFAULT', 'COMPATIBLE_DEBEZIUM_JSON', '{"summary":"控制 MySQL CDC 事件输出的数据格式。","coreMeaning":"DEFAULT 使用 SeaTunnel 内部 CDC 事件结构；COMPATIBLE_DEBEZIUM_JSON 输出兼容 Debezium 的 JSON。","validValues":["DEFAULT","COMPATIBLE_DEBEZIUM_JSON"],"recommendationHints":["SeaTunnel 内部链路通常使用 DEFAULT。","需要兼容 Debezium 消费格式时使用 COMPATIBLE_DEBEZIUM_JSON。"],"cautions":["切换格式会改变下游字段结构和解析逻辑。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'schema-changes.enabled', '是否启用 Schema Evolution，目前支持新增列、删除列、重命名列和修改列。', 'boolean', 0, 'false', 'true', '{"summary":"控制是否捕获并向下游传递表结构变更。","coreMeaning":"开启后可处理部分 DDL 事件并推动下游结构演进。","recommendationHints":["源表频繁变更且下游支持 Schema Evolution 时开启。"],"cautions":["当前只支持部分 DDL 类型。","下游连接器不支持结构变更时可能导致任务失败。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'debezium', '透传给 Debezium Embedded Engine 的配置项。', 'map', 0, NULL, '{"snapshot.locking.mode":"none","include.schema.changes":"false"}', '{"summary":"配置底层 Debezium 引擎的高级参数。","coreMeaning":"用于覆盖快照锁、心跳、Binlog 解析和其他 Debezium 行为。","recommendationHints":["仅在 SeaTunnel 标准参数无法满足需求时使用。","配置前应核对当前内置 Debezium 版本。"],"cautions":["错误参数可能导致数据不一致或任务无法启动。","不同 Debezium 版本的参数支持存在差异。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'int_type_narrowing', '是否在无精度损失时进行整数类型缩窄，例如将 MySQL tinyint(1) 映射为 boolean。', 'boolean', 0, 'true', 'true', '{"summary":"控制 MySQL 整数类型的语义化缩窄。","coreMeaning":"开启后 tinyint(1) 等类型可能被识别为 BOOLEAN。","recommendationHints":["字段确实表达布尔含义时保持开启。"],"cautions":["若 tinyint(1) 实际存储数值而非布尔值，应关闭。"]}', '用于AI参数推荐', 0),
('connector', 'MySQL-CDC', 'source', 'common-options', 'Source 插件通用参数集合，具体字段参见 SeaTunnel Source Common Options。', 'object', 0, NULL, '{"plugin_output":"mysql_cdc_result","parallelism":4}', '{"summary":"承载 Source 插件公共配置。","coreMeaning":"通常包括结果表名、并行度等非 MySQL CDC 专属参数。","recommendationHints":["仅配置当前 SeaTunnel 版本明确支持的公共参数。"],"cautions":["该项更适合作为参数组展示，而非直接输出 common-options 键。"]}', '用于AI参数推荐', 0)
AS incoming
ON DUPLICATE KEY UPDATE
    `param_desc` = incoming.`param_desc`,
    `param_type` = incoming.`param_type`,
    `required_flag` = incoming.`required_flag`,
    `default_value` = incoming.`default_value`,
    `example_value` = incoming.`example_value`,
    `param_context` = incoming.`param_context`,
    `remark` = incoming.`remark`,
    `update_time` = CURRENT_TIMESTAMP;

COMMIT;
