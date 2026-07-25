-- JDBC Connector parameter metadata initialization script
-- Generated content: JDBC Source + JDBC Sink
-- Note: Parameter names follow the SeaTunnel configuration options provided by the user, such as fetch_size and split.size.

ALTER TABLE `t_baize_flow_connector_param_meta`
DROP INDEX `uk_connector_param`,
  ADD UNIQUE KEY `uk_connector_param`
  (`type`, `connector_name`, `connector_type`, `param_name`, `deleted`);

START TRANSACTION;

-- ==================== Jdbc Source：31 个参数 ====================
INSERT INTO `t_baize_flow_connector_param_meta`
(`type`, `connector_name`, `connector_type`, `param_name`, `param_desc`,
 `param_type`, `required_flag`, `default_value`, `example_value`, `param_context`,
 `remark`, `deleted`)
VALUES
('connector', 'Jdbc', 'source', 'compatible_mode', '数据库兼容模式，例如 OceanBase 使用 mysql 或 oracle，StarRocks 使用 starrocks。', 'string', 0, NULL, 'mysql', '{"summary":"指定数据库兼容模式。","coreMeaning":"用于同一数据库产品支持多种协议或兼容语义时选择正确解析方式。","recommendationHints":["OceanBase 按实际租户模式选择 mysql 或 oracle。","StarRocks 场景设置为 starrocks。"],"cautions":["配置值必须与目标数据库真实兼容模式一致。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'dialect', '显式指定 JDBC 方言，优先级高于通过 URL 自动识别。', 'string', 0, NULL, 'mysql', '{"summary":"指定 SeaTunnel 使用的 JDBC 方言。","coreMeaning":"方言决定类型映射、SQL 生成、元数据读取等数据库差异化行为。","recommendationHints":["URL 无法准确识别或使用兼容数据库时显式配置。"],"cautions":["错误方言可能导致类型映射或 SQL 语法错误。","未支持方言可能回退到 GenericDialect。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'connection_check_timeout_sec', '验证数据库连接操作的超时时间，单位秒。', 'number', 0, '30', '30', '{"summary":"控制 JDBC 连接检查的等待时间。","coreMeaning":"超过该时间仍未完成连接验证时，连接检查会失败。","recommendationHints":["网络稳定的内网环境通常保持默认值。","跨区域、代理或高延迟网络可适当调大。"],"cautions":["过大可能延长故障发现时间。","过小可能在网络抖动时产生误判。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'partition_column', '用于并行分片读取的列名。', 'string', 0, NULL, 'id', '{"summary":"指定 query 模式下的分片列。","coreMeaning":"SeaTunnel 根据该列的上下界划分多个读取分区。","recommendationHints":["优先选择有索引、分布较均匀、可比较的数值列。"],"cautions":["分布严重倾斜会造成任务长尾。","该参数主要用于 query 模式。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'partition_upper_bound', '分片列扫描上界；未配置时 SeaTunnel 会查询最大值。', 'number', 0, NULL, '1000000', '{"summary":"设置 partition_column 的最大扫描边界。","coreMeaning":"与下界及分片数共同决定 query 模式的分区范围。","recommendationHints":["边界已知且稳定时可显式配置，减少额外元数据查询。"],"cautions":["配置过小会漏读超过上界的数据。","应与 partition_column 数据类型匹配。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'partition_lower_bound', '分片列扫描下界；未配置时 SeaTunnel 会查询最小值。', 'number', 0, NULL, '1', '{"summary":"设置 partition_column 的最小扫描边界。","coreMeaning":"与上界及分片数共同决定 query 模式的分区范围。","recommendationHints":["边界已知且稳定时可显式配置。"],"cautions":["配置过大会漏读低于下界的数据。","应与 partition_column 数据类型匹配。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'partition_num', 'query 模式下的分区数量；默认采用作业并行度，不推荐直接使用，优先通过合理分片策略控制。', 'number', 0, 'job parallelism', '8', '{"summary":"控制 query 模式下生成的读取分区数量。","coreMeaning":"分区数通常影响 JDBC 并发连接数及读取并行度。","recommendationHints":["仅在 query 模式确有并行分区需求时设置。","通常不应超过数据库可承受的并发连接数。"],"cautions":["table_path 模式下不生效。","过大可能压垮源库，过小可能限制吞吐。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'decimal_type_narrowing', '是否在无精度损失时将 DECIMAL 缩窄为 INT 或 LONG；目前主要支持 Oracle。', 'boolean', 0, 'true', 'true', '{"summary":"控制 DECIMAL 类型是否进行无损缩窄。","coreMeaning":"开启后，满足精度范围的 DECIMAL 可映射为更紧凑的整数类型。","recommendationHints":["Oracle 且下游更适合整数类型时可开启。"],"cautions":["目前仅部分数据库支持。","关闭可保留更稳定的 DECIMAL 语义。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'int_type_narrowing', '是否在无精度损失时将整数类型缩窄，例如 MySQL tinyint(1) 转为 boolean。', 'boolean', 0, 'true', 'true', '{"summary":"控制整数类型的语义化缩窄。","coreMeaning":"开启后，特定数据库的小整数类型可能映射为 BOOLEAN 等更精确类型。","recommendationHints":["MySQL tinyint(1) 作为布尔字段时可保持默认开启。"],"cautions":["若 tinyint(1) 实际存储数值含义，应谨慎开启。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'handle_blob_as_string', '是否将 BLOB 转换为 STRING；目前仅支持 Oracle。', 'boolean', 0, 'false', 'true', '{"summary":"控制 Oracle BLOB 字段是否按字符串读取。","coreMeaning":"适合 BLOB 实际承载文本且下游系统更易处理 STRING 的场景。","recommendationHints":["Oracle BLOB 为文本内容并写入 Doris 等系统时可评估开启。"],"cautions":["二进制内容不应直接按字符串处理。","大字段会显著增加网络和内存压力。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'use_select_count', '动态分片阶段是否直接使用 SELECT COUNT 获取表行数；目前仅适用于 JDBC Oracle。', 'boolean', 0, 'false', 'true', '{"summary":"控制动态分片阶段的表行数统计方式。","coreMeaning":"开启后直接执行 SELECT COUNT，而不是依赖其他统计信息方式。","recommendationHints":["Oracle 表统计信息不准确但直接 COUNT 更可靠时使用。"],"cautions":["大表 SELECT COUNT 可能产生较高数据库开销。","仅 JDBC Oracle 生效。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'skip_analyze', '动态分片阶段是否跳过表行数分析；目前仅适用于 JDBC Oracle。', 'boolean', 0, 'false', 'true', '{"summary":"控制是否跳过动态分片前的表行数分析。","coreMeaning":"适合已有定期统计信息维护，或表数据变化不频繁的场景。","recommendationHints":["已由 DBA 定期更新统计信息时可评估开启。"],"cautions":["统计信息过旧可能导致分片估算不准确。","仅 JDBC Oracle 生效。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'use_regex', '是否将 table_path 按正则表达式匹配；关闭时按精确路径处理。', 'boolean', 0, 'false', 'true', '{"summary":"控制 table_path 的匹配方式。","coreMeaning":"开启后可通过正则一次匹配多张表，关闭时仅匹配精确表路径。","recommendationHints":["批量匹配命名规则一致的表时使用。"],"cautions":["正则范围过宽可能误匹配大量表。","开启前应验证匹配结果。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'fetch_size', 'JDBC 查询结果集每次抓取的行数；0 表示使用 JDBC 驱动默认值。', 'number', 0, '0', '2048', '{"summary":"控制 JDBC 结果集读取时的单次抓取批量。","coreMeaning":"影响结果集分批拉取节奏，不等于返回总条数。","processingLogic":["值小：单批更轻，但数据库与客户端往返更多。","值大：往返更少，但单批网络和内存压力更高。"],"recommendationHints":["大结果集、轻量行数据可适当调大。","宽表、大字段、内存敏感场景应谨慎调大。","稳定性优先时可适当调小。"],"cautions":["不等于 limit。","不是越大越好。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'properties', '附加 JDBC 连接属性；与 URL 参数重复时，优先级由具体驱动决定。', 'map', 0, NULL, '{"useSSL":"false","serverTimezone":"Asia/Shanghai"}', '{"summary":"补充 JDBC 驱动连接属性。","coreMeaning":"适合配置 SSL、时区、字符集、连接行为及厂商特有参数。","recommendationHints":["将驱动专属参数集中放在 properties 中便于管理。"],"cautions":["与 URL 重复时必须确认驱动的实际优先级。","不要在 properties 中明文保存密钥。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'where_condition', '应用于所有表或查询的公共行过滤条件，必须以 where 开头。', 'string', 0, NULL, 'where id > 100', '{"summary":"为 JDBC Source 追加统一行过滤条件。","coreMeaning":"用于减少读取范围，实现增量窗口或业务条件过滤。","recommendationHints":["过滤列应尽量有索引。","用于时间窗口时应明确边界是否包含。"],"cautions":["必须以 where 开头。","拼接条件前应验证 SQL 注入和语法风险。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'split.size', 'table_path 模式下每个读取分片包含的行数。', 'number', 0, '8096', '20000', '{"summary":"控制 JDBC 表读取时单个 split 的目标行数。","coreMeaning":"表会按该值拆分成多个读取分片，影响并行粒度和调度开销。","recommendationHints":["大表可结合数据库承载能力适当调小以增加并行度。","中小表或调度开销敏感时可适当调大。"],"cautions":["仅 table_path 模式生效，query 模式不生效。","过小会产生过多 split，过大可能造成任务长尾。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'split.even-distribution.factor.lower-bound', '判断分片键是否均匀分布的下界因子，不推荐常规修改。', 'number', 0, '0.05', '0.05', '{"summary":"设置分片键均匀分布判断的下界。","coreMeaning":"当 (MAX-MIN+1)/行数 低于该值时，数据可能被判定为非均匀分布。","recommendationHints":["通常保持默认值。","仅在充分理解分片算法并完成压测后调整。"],"cautions":["错误调整可能导致不合适的分片策略。","不推荐常规业务直接配置。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'split.even-distribution.factor.upper-bound', '判断分片键是否均匀分布的上界因子，不推荐常规修改。', 'number', 0, '100', '100', '{"summary":"设置分片键均匀分布判断的上界。","coreMeaning":"当 (MAX-MIN+1)/行数 高于该值时，数据可能被判定为非均匀分布。","recommendationHints":["通常保持默认值。","仅在充分理解分片算法并完成压测后调整。"],"cautions":["错误调整可能导致不合适的分片策略。","不推荐常规业务直接配置。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'split.sample-sharding.threshold', '估算分片数超过该阈值且数据分布不均时，触发采样分片策略。', 'number', 0, '1000', '1000', '{"summary":"控制何时启用采样分片策略。","coreMeaning":"数据分布因子超出均匀范围，且预计分片数超过阈值时使用采样。","recommendationHints":["超大表且分片键稀疏或倾斜时保持默认或结合压测调整。"],"cautions":["阈值过低会增加采样开销。","阈值过高可能导致非均匀分片。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'split.inverse-sampling.rate', '采样分片策略的采样率倒数，例如 1000 表示采样率为 1/1000。', 'number', 0, '1000', '1000', '{"summary":"控制采样分片时的采样密度。","coreMeaning":"值越大，实际采样比例越低；值越小，采样数据越多。","recommendationHints":["超大数据集可使用较低采样率以控制采样成本。"],"cautions":["采样过少可能降低分片边界估算准确性。","采样过多会增加数据库扫描开销。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'common-options', 'Source 插件通用参数集合，具体字段参见 SeaTunnel Source Common Options。', 'object', 0, NULL, '{"plugin_output":"jdbc_source_result"}', '{"summary":"承载 Source 插件公共能力参数。","coreMeaning":"不是 JDBC 专属业务参数，通常用于结果表名、并行度等公共配置。","recommendationHints":["仅填写当前 SeaTunnel 版本明确支持的公共参数。"],"cautions":["不同版本支持项可能不同。","该项可作为参数组展示，而非直接输出 common-options 键。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'split.string_split_mode', '字符串分片算法，可选 sample 或 charset_based。', 'string', 0, 'sample', 'charset_based', '{"summary":"选择字符串类型 partition_column 的分片算法。","coreMeaning":"sample 通过采样估算边界；charset_based 按字符集范围计算分片。","recommendationHints":["普通字符串键保持 sample。","字符主要位于 ASCII 32-126 范围时可评估 charset_based。"],"cautions":["charset_based 对字符范围有假设。","特殊字符集或排序规则需额外配置 collation。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'source', 'split.string_split_mode_collate', '当 split.string_split_mode=charset_based 且表使用特殊排序规则时指定 collation。', 'string', 0, NULL, 'utf8mb4_bin', '{"summary":"指定字符串字符集分片使用的排序规则。","coreMeaning":"用于保证字符比较顺序与数据库实际 collation 一致。","recommendationHints":["仅在 charset_based 模式且数据库默认排序规则不适用时配置。"],"cautions":["错误 collation 可能造成分片边界不准确。"]}', '用于AI参数推荐', 0)
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

-- ==================== Jdbc Sink：31 个参数 ====================
INSERT INTO `t_baize_flow_connector_param_meta`
(`type`, `connector_name`, `connector_type`, `param_name`, `param_desc`,
 `param_type`, `required_flag`, `default_value`, `example_value`, `param_context`,
 `remark`, `deleted`)
VALUES
('connector', 'Jdbc', 'sink', 'compatible_mode', '数据库兼容模式，例如 OceanBase 使用 mysql 或 oracle，StarRocks 使用 starrocks。', 'string', 0, NULL, 'mysql', '{"summary":"指定目标数据库的兼容模式。","coreMeaning":"用于选择正确的类型映射和 SQL 生成行为。","recommendationHints":["OceanBase、StarRocks、低版本 PostgreSQL 等兼容场景按文档设置。"],"cautions":["配置错误可能导致生成 SQL 不兼容。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'dialect', '显式指定 JDBC 方言，优先级高于通过 URL 自动识别。', 'string', 0, NULL, 'mysql', '{"summary":"指定 JDBC Sink 方言。","coreMeaning":"影响建表语句、Upsert 语法、标识符处理和类型映射。","recommendationHints":["URL 无法准确识别或兼容数据库时显式配置。"],"cautions":["不支持的方言可能回退 GenericDialect。","错误方言可能生成不可执行 SQL。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'primary_keys', '目标表主键字段列表，用于自动生成 INSERT、UPDATE、DELETE 或 UPSERT SQL。', 'array', 0, NULL, '["id"]', '{"summary":"声明目标表主键。","coreMeaning":"SeaTunnel 使用主键识别记录并生成 Upsert、更新和删除语义。","recommendationHints":["CDC 或需要幂等写入时应准确配置。","联合主键按字段顺序填写。"],"cautions":["错误主键可能导致重复数据或误更新。","目标表应具备对应唯一性约束。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'connection_check_timeout_sec', '验证目标数据库连接操作的超时时间，单位秒。', 'number', 0, '30', '30', '{"summary":"控制 JDBC Sink 连接检查等待时间。","coreMeaning":"超过该时间仍未完成验证时判定连接失败。","recommendationHints":["跨区域或高延迟环境可适当调大。"],"cautions":["过大延长故障反馈，过小可能误判网络抖动。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'max_retries', 'executeBatch 批量提交失败后的最大重试次数。', 'number', 0, '0', '3', '{"summary":"控制批量写入失败的重试次数。","coreMeaning":"适合应对短暂网络抖动、连接重置或数据库瞬时不可用。","recommendationHints":["存在短暂故障时可设置 2~3 次并配合退避。"],"cautions":["非幂等 SQL 重试可能导致重复写入。","持续性错误重试只会延长失败时间。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'batch_size', '批量写入缓冲记录数；达到 batch_size 或 checkpoint.interval 时触发刷写。', 'number', 0, '1000', '2000', '{"summary":"控制 JDBC Sink 单次 executeBatch 的记录数量。","coreMeaning":"影响写入吞吐、数据库事务大小、网络往返和内存占用。","recommendationHints":["高吞吐、窄表场景可适当调大。","宽表、大字段或数据库压力高时适当调小。"],"cautions":["过大可能造成事务过重、锁持有时间变长或 OOM。","过小会增加网络往返和提交开销。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'is_exactly_once', '是否通过 XA 事务启用 Exactly-Once 语义。', 'boolean', 0, 'false', 'true', '{"summary":"控制 JDBC Sink 是否启用 XA Exactly-Once。","coreMeaning":"开启后通过分布式事务协调 checkpoint 与数据库提交。","recommendationHints":["强一致且能接受 XA 成本时开启。","开启时必须配置 xa_data_source_class_name。"],"cautions":["XA 会增加事务开销和运维复杂度。","目标数据库与驱动必须支持 XA。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'generate_sink_sql', '是否基于目标数据库表结构自动生成 Sink SQL。', 'boolean', 0, 'false', 'true', '{"summary":"控制是否自动生成 JDBC Sink 写入 SQL。","coreMeaning":"开启后 SeaTunnel 根据目标表、字段和主键生成语句。","recommendationHints":["标准表结构和字段映射场景可开启。"],"cautions":["复杂表达式、特殊函数或非标准写法应使用 query。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'xa_data_source_class_name', 'XA 数据源类名，例如 MySQL 使用 com.mysql.cj.jdbc.MysqlXADataSource。', 'string', 0, NULL, 'com.mysql.cj.jdbc.MysqlXADataSource', '{"summary":"指定 Exactly-Once 使用的 XADataSource 实现类。","coreMeaning":"SeaTunnel 通过该类创建 XA 连接并参与两阶段提交。","recommendationHints":["仅在 is_exactly_once=true 时配置。"],"cautions":["类名必须与数据库驱动版本匹配。","普通 DataSource 类不能替代 XADataSource。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'max_commit_attempts', '事务提交失败时的最大重试次数。', 'number', 0, '3', '3', '{"summary":"控制事务 commit 失败后的重试次数。","coreMeaning":"主要用于 Exactly-Once 或显式事务提交阶段的瞬时故障恢复。","recommendationHints":["保持默认值或结合数据库故障特征小幅调整。"],"cautions":["过多重试会延长 checkpoint 完成时间。","提交结果不确定时需关注重复提交风险。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'transaction_timeout_sec', '事务开启后的超时时间，-1 表示永不超时。', 'number', 0, '-1', '300', '{"summary":"控制 JDBC Sink 事务最大持续时间。","coreMeaning":"超过超时时间的事务可能被回滚或判定失败。","recommendationHints":["长 checkpoint 场景应保证超时大于正常事务周期。"],"cautions":["设置过短可能破坏 Exactly-Once。","-1 虽无超时，但可能导致异常事务长时间占用资源。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'auto_commit', '是否启用 JDBC 自动提交。', 'boolean', 0, 'true', 'false', '{"summary":"控制 JDBC 连接的自动提交模式。","coreMeaning":"开启时每次数据库操作按驱动行为自动提交；关闭时由任务显式管理事务。","recommendationHints":["普通简单写入可保持默认。","需要批次事务控制时结合整体语义评估关闭。"],"cautions":["与 Exactly-Once、checkpoint 和事务配置存在联动。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'field_ide', '字段名大小写转换策略：ORIGINAL、UPPERCASE、LOWERCASE。', 'string', 0, NULL, 'ORIGINAL', '{"summary":"控制从 Source 到 Sink 的字段名大小写转换。","coreMeaning":"用于适配 Oracle 等对未加引号标识符大小写处理不同的数据库。","recommendationHints":["无转换需求使用 ORIGINAL。","目标表字段统一大写或小写时选择对应策略。"],"cautions":["转换后可能出现字段重名。","需与目标表真实字段名保持一致。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'properties', '附加 JDBC 连接属性；与 URL 参数重复时，优先级由具体驱动决定。', 'map', 0, NULL, '{"rewriteBatchedStatements":"true","useSSL":"false"}', '{"summary":"补充 JDBC Sink 驱动连接属性。","coreMeaning":"可用于批处理优化、SSL、时区、字符集及厂商专属配置。","recommendationHints":["MySQL 批量写入可评估 rewriteBatchedStatements=true。"],"cautions":["驱动属性存在版本差异。","与 URL 重复参数需确认优先级。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'common-options', 'Sink 插件通用参数集合，具体字段参见 SeaTunnel Sink Common Options。', 'object', 0, NULL, '{"parallelism":4}', '{"summary":"承载 Sink 插件公共能力参数。","coreMeaning":"不是 JDBC 专属参数，通常用于并行度等通用任务配置。","recommendationHints":["仅填写当前 SeaTunnel 版本支持的公共参数。"],"cautions":["该项可作为参数组展示，而不是直接输出 common-options 键。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'schema_save_mode', '任务启动前目标表结构处理策略。', 'enum', 0, 'CREATE_SCHEMA_WHEN_NOT_EXIST', 'CREATE_SCHEMA_WHEN_NOT_EXIST', '{"summary":"控制目标表不存在或已存在时的结构处理方式。","coreMeaning":"可选 RECREATE_SCHEMA、CREATE_SCHEMA_WHEN_NOT_EXIST、ERROR_WHEN_SCHEMA_NOT_EXIST、IGNORE。","recommendationHints":["首次迁移常用 CREATE_SCHEMA_WHEN_NOT_EXIST。","需要完全重建且可接受删表时使用 RECREATE_SCHEMA。"],"cautions":["RECREATE_SCHEMA 会删除并重建已有表，存在数据丢失风险。","生产环境应谨慎授予 DDL 权限。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'data_save_mode', '任务启动前目标表已有数据的处理策略。', 'enum', 0, 'APPEND_DATA', 'APPEND_DATA', '{"summary":"控制目标端已有数据如何处理。","coreMeaning":"可选 DROP_DATA、APPEND_DATA、CUSTOM_PROCESSING、ERROR_WHEN_DATA_EXISTS。","recommendationHints":["增量同步通常使用 APPEND_DATA。","全量重灌可在确认风险后使用 DROP_DATA。"],"cautions":["DROP_DATA 会清空数据。","CUSTOM_PROCESSING 必须同时配置 custom_sql。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'custom_sql', '当 data_save_mode=CUSTOM_PROCESSING 时，在同步前执行的自定义 SQL。', 'string', 0, NULL, 'TRUNCATE TABLE test.user', '{"summary":"定义同步任务开始前的自定义数据处理 SQL。","coreMeaning":"适合清理分区、删除时间窗口数据或执行业务化预处理。","recommendationHints":["仅在 CUSTOM_PROCESSING 模式使用。","应保证 SQL 可重复执行或具备明确幂等性。"],"cautions":["高风险 DDL/DML 可能造成不可逆数据损失。","需要严格限制权限并记录审计日志。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'enable_upsert', '存在 primary_keys 时是否启用 Upsert；无重复键场景关闭可提升导入性能。', 'boolean', 0, 'true', 'true', '{"summary":"控制基于主键的插入或更新语义。","coreMeaning":"开启后相同主键记录可更新目标数据；关闭后通常按纯插入处理。","recommendationHints":["CDC、去重或幂等同步保持开启。","确认数据绝无重复且追求纯插入性能时可关闭。"],"cautions":["关闭后重复键可能导致失败。","开启 Upsert 通常比纯 INSERT 开销更高。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'use_copy_statement', '是否使用 COPY <table> FROM STDIN 导入；仅支持提供 Copy API 的驱动，例如 PostgreSQL。', 'boolean', 0, 'false', 'true', '{"summary":"控制是否使用数据库 COPY 协议进行高速批量导入。","coreMeaning":"COPY 通常比逐批 INSERT 更高效，主要用于 PostgreSQL 等支持 Copy API 的驱动。","recommendationHints":["PostgreSQL 大批量追加写入可评估开启。"],"cautions":["不支持 MAP、ARRAY、ROW 类型。","仅驱动连接提供 getCopyAPI() 时可用。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'create_index', '自动建表时是否创建主键及其他索引。关闭可提升大表迁移写入速度，迁移后可手动补建索引。', 'boolean', 0, 'true', 'false', '{"summary":"控制自动创建目标表时是否同步创建索引。","coreMeaning":"索引可提升后续查询和约束能力，但会增加写入维护成本。","recommendationHints":["大批量全量迁移可暂时关闭，完成后手动创建索引。","在线增量或依赖主键约束时保持开启。"],"cautions":["关闭后查询性能和唯一性约束可能不足。","开启索引会降低批量写入吞吐。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'access_key_id', 'AWS 认证 Access Key ID，仅 dialect=dsql 时有效。', 'string', 0, NULL, '<AWS_ACCESS_KEY_ID>', '{"summary":"配置 Amazon Aurora DSQL 认证 Access Key ID。","coreMeaning":"仅在 JDBC dialect=dsql 时参与 AWS 身份认证。","recommendationHints":["通过 IAM 角色或环境变量注入。"],"cautions":["不要明文保存到数据库或代码仓库。","非 dsql 方言不生效。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'secret_access_key', 'AWS 认证 Secret Access Key，仅 dialect=dsql 时有效。', 'string', 0, NULL, '<AWS_SECRET_ACCESS_KEY>', '{"summary":"配置 Amazon Aurora DSQL 认证 Secret Access Key。","coreMeaning":"与 access_key_id 配合完成 AWS 身份认证。","recommendationHints":["通过安全密钥服务或环境变量注入。"],"cautions":["属于高敏感凭据，禁止明文展示。","非 dsql 方言不生效。"]}', '用于AI参数推荐', 0),
('connector', 'Jdbc', 'sink', 'region', 'Amazon Aurora DSQL 所在区域，仅 dialect=dsql 时有效。', 'string', 0, NULL, 'us-east-1', '{"summary":"指定 Amazon Aurora DSQL 的 AWS Region。","coreMeaning":"用于访问正确区域的 DSQL 服务端点。","recommendationHints":["填写目标 DSQL 集群实际所在区域。"],"cautions":["区域错误会导致认证或连接失败。","非 dsql 方言不生效。"]}', '用于AI参数推荐', 0)
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
