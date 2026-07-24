package io.baize.flow.plugin.spi.enums;

import lombok.Getter;

import java.util.Locale;
import java.util.Optional;

/**
 * status enum
 */
public enum Status {

    SUCCESS(0, "success", "成功"),

    INTERNAL_SERVER_ERROR_ARGS(10000, "Internal Server Error: {0}", "服务端异常: {0}"),

    REQUEST_PARAMS_NOT_VALID_ERROR(10001, "request parameter {0} is not valid", "请求参数[{0}]无效"),
    TASK_TIMEOUT_PARAMS_ERROR(10002, "task timeout parameter is not valid", "任务超时参数无效"),
    USER_NAME_EXIST(10003, "user name already exists", "用户名已存在"),
    USER_NAME_NULL(10004, "user name is null", "用户名不能为空"),
    HDFS_OPERATION_ERROR(10006, "hdfs operation error", "hdfs操作错误"),
    TASK_INSTANCE_NOT_FOUND(10008, "task instance not found", "任务实例不存在"),
    OS_TENANT_CODE_EXIST(10009, "os tenant code {0} already exists", "操作系统租户[{0}]已存在"),
    USER_NOT_EXIST(10010, "user {0} not exists", "用户[{0}]不存在"),
    ALERT_GROUP_NOT_EXIST(10011, "alarm group not found", "告警组不存在"),
    ALERT_GROUP_EXIST(10012, "alarm group already exists", "告警组名称已存在"),
    USER_NAME_PASSWD_ERROR(10013, "user name or password error", "用户名或密码错误"),
    LOGIN_SESSION_FAILED(10014, "create session failed!", "创建session失败"),
    TENANT_NOT_EXIST(10017, "tenant [{0}] not exists", "租户[{0}]不存在"),
    PROJECT_NOT_FOUND(10018, "project {0} not found ", "项目[{0}]不存在"),
    PROJECT_ALREADY_EXISTS(10019, "project {0} already exists", "项目名称[{0}]已存在"),
    TASK_INSTANCE_NOT_EXISTS(10020, "task instance {0} does not exist", "任务实例[{0}]不存在"),


    DATASOURCE_EXIST(11001, "data source name already exists", "数据源名称已存在"),
    DATASOURCE_NOT_EXIST(11002, "data source not exists", "数据源不存在"),
    DATASOURCE_CONNECT_FAILED(11003, "data source connection failed", "建立数据源连接失败"),
    DATASOURCE_CONNECT_TEST_ERROR(11004, "data source connection test error: {0}", "数据源连接测试异常: {0}"),
    DATASOURCE_FILE_EMPTY(11005, "upload file is empty", "上传文件为空"),
    DATASOURCE_FILE_TYPE_ERROR(11006, "only jar file is allowed", "只允许上传jar文件"),
    DATASOURCE_FILE_TOO_LARGE(11007, "file size exceeds limit", "文件大小超过限制"),
    DATASOURCE_FILE_EXIST(11008, "file already exists", "文件已存在"),
    DATASOURCE_UPLOAD_FAILED(11009, "upload jdbc driver failed: {0}", "上传JDBC驱动失败: {0}"),
    DATASOURCE_FILE_NAME_INVALID(11010, "jdbc driver file name is invalid", "JDBC驱动文件名非法"),
    DESCRIPTION_TOO_LONG_ERROR(11011, "description is too long", "描述信息过长"),
    DATASOURCE_METADATA_ERROR(11012, "data source metadata query failed: {0}", "数据源元数据查询失败: {0}"),
    DATASOURCE_TABLE_NOT_FOUND(11013, "table {0} not found", "表[{0}]不存在"),
    DATASOURCE_COLUMN_NOT_FOUND(11014, "no columns found for table {0}", "表[{0}]未查询到字段"),

    CREATE_DATASOURCE_ERROR(10033, "create datasource error", "创建数据源错误"),

    UPDATE_DATASOURCE_ERROR(10034, "update datasource error", "更新数据源错误"),
    QUERY_DATASOURCE_ERROR(10035, "query datasource error", "查询数据源错误"),
    CONNECT_DATASOURCE_FAILURE(10036, "connect datasource failure", "建立数据源连接失败"),
    CONNECTION_TEST_FAILURE(10037, "connection test failure", "测试数据源连接失败"),
    DELETE_DATA_SOURCE_FAILURE(10038, "delete data source failure", "删除数据源失败"),
    VERIFY_DATASOURCE_NAME_FAILURE(10039, "verify datasource name failure", "验证数据源名称失败"),




    // -------------------- DataSource Catalog --------------------

    DATASOURCE_CATALOG_TABLE_LIST_ERROR(
            11101,
            "failed to list tables from datasource",
            "获取数据源表列表失败"
    ),

    DATASOURCE_CATALOG_TABLE_REFERENCE_ERROR(
            11102,
            "failed to list table references from datasource",
            "获取数据源表引用失败"
    ),

    DATASOURCE_CATALOG_COLUMN_LIST_ERROR(
            11103,
            "failed to list table columns from datasource",
            "获取数据源字段信息失败"
    ),

    DATASOURCE_CATALOG_PREVIEW_DATA_ERROR(
            11104,
            "failed to preview table data",
            "获取数据预览失败"
    ),

    DATASOURCE_CATALOG_COUNT_ERROR(
            11105,
            "failed to count table rows",
            "统计表数据量失败"
    ),

    DATASOURCE_CATALOG_SQL_TEMPLATE_ERROR(
            11106,
            "failed to build sql template",
            "生成SQL模板失败"
    ),

    DATASOURCE_CATALOG_RESOLVE_SQL_ERROR(
            11107,
            "failed to resolve sql variables",
            "解析SQL变量失败"
    ),

    // -------------------- DataSource Plugin --------------------

    DATASOURCE_PLUGIN_CONFIG_ERROR(
        11201,
                "failed to get datasource plugin config",
                "获取数据源插件配置失败"
    ),

    DATASOURCE_PLUGIN_INSTALL_ERROR(
        11202,
                "failed to install datasource plugin",
                "安装数据源插件失败"
    ),

    DATASOURCE_PLUGIN_TYPE_EMPTY(
        11203,
                "plugin type cannot be empty",
                "插件类型不能为空"
    ),

    // -------------------- Batch Job Definition --------------------

    BATCH_JOB_DEFINITION_NOT_EXIST(11301, "batch job definition not exists", "批处理任务定义不存在"),
    SAVE_OR_UPDATE_BATCH_JOB_DEFINITION_ERROR(11302, "save or update batch job definition error", "保存或更新批处理任务定义失败"),
    QUERY_BATCH_JOB_DEFINITION_ERROR(11303, "query batch job definition error", "查询批处理任务定义失败"),
    DELETE_BATCH_JOB_DEFINITION_ERROR(11304, "delete batch job definition error", "删除批处理任务定义失败"),
    BUILD_BATCH_JOB_HOCON_CONFIG_ERROR(11305, "build batch job hocon config error", "生成批处理任务 HOCON 配置失败"),
    GET_BATCH_JOB_UNIQUE_ID_ERROR(11306, "get batch job unique id error", "获取批处理任务唯一标识失败"),
    EXECUTE_JOB_DEFINITION_ERROR(11401, "execute job definition error", "执行任务定义失败"),
    QUERY_JOB_DEFINITION_ERROR(11402, "query job definition error", "查询任务定义失败"),
    JOB_EXECUTION_START_ERROR(11403, "job execution start error", "任务启动失败"),
    JOB_DEFINITION_EXECUTE_ERROR(11401, "execute job definition error", "执行任务定义失败"),
    JOB_DEFINITION_ID_INVALID(11402, "job definition id is invalid", "任务定义ID无效"),
    JOB_DEFINITION_EXECUTE_PARAM_ERROR(11403, "job execute parameter is invalid", "任务执行参数无效"),
    JOB_DEFINITION_EXECUTE_RECOVERY(11404, "execute job recovery", "执行任务恢复"),

    QUERY_JOB_METRICS_SUMMARY_ERROR(11501, "query job metrics summary error", "查询任务指标汇总失败"),
    QUERY_JOB_METRICS_CHARTS_ERROR(11502, "query job metrics charts error", "查询任务指标图表失败"),
    QUERY_JOB_SCHEDULE_EXECUTION_TIMES_ERROR(11601, "query job schedule execution times error", "查询任务调度执行时间失败"),
    START_JOB_SCHEDULE_ERROR(11602, "start job schedule error", "启动任务调度失败"),
    STOP_JOB_SCHEDULE_ERROR(11603, "stop job schedule error", "停止任务调度失败"),

    QUERY_BATCH_JOB_INSTANCE_ERROR(11701, "query batch job instance error", "查询批处理任务实例失败"),
    BATCH_JOB_INSTANCE_NOT_EXIST(11702, "batch job instance not exists", "批处理任务实例不存在"),
    QUERY_BATCH_JOB_INSTANCE_LOG_ERROR(11703, "query batch job instance log error", "查询批处理任务实例日志失败"),
    BATCH_JOB_INSTANCE_LOG_NOT_EXIST(11704, "batch job instance log not exists", "批处理任务实例日志不存在"),
    CREATE_BATCH_JOB_INSTANCE_ERROR(11705, "create batch job instance error", "创建批处理任务实例失败"),
    BUILD_JOB_INSTANCE_CONFIG_ERROR(11706, "build job instance config error", "构建任务实例配置失败"),
    JOB_DEFINITION_NOT_EXIST(11707, "job definition not exists", "任务定义不存在"),
    DELETE_BATCH_JOB_INSTANCE_ERROR(11708, "delete batch job instance error", "删除批处理任务实例失败"),
    UPDATE_BATCH_JOB_INSTANCE_ERROR(11709, "update batch job instance error", "更新批处理任务实例失败"),
    GENERATE_JOB_INSTANCE_ID_ERROR(11710, "generate job instance id error", "生成任务实例ID失败"),

    // -------------------- Connector Param Meta --------------------

    CONNECTOR_PARAM_META_ALREADY_EXISTS(
            11801,
            "connector param meta already exists",
            "连接器参数元数据已存在"
    ),

    CONNECTOR_PARAM_META_NOT_EXIST(
            11802,
            "connector param meta not exists",
            "连接器参数元数据不存在"
    ),

    CREATE_CONNECTOR_PARAM_META_ERROR(
            11803,
            "create connector param meta error",
            "创建连接器参数元数据失败"
    ),

    UPDATE_CONNECTOR_PARAM_META_ERROR(
            11804,
            "update connector param meta error",
            "更新连接器参数元数据失败"
    ),

    QUERY_CONNECTOR_PARAM_META_ERROR(
            11805,
            "query connector param meta error",
            "查询连接器参数元数据失败"
    ),

    DELETE_CONNECTOR_PARAM_META_ERROR(
            11806,
            "delete connector param meta error",
            "删除连接器参数元数据失败"
    ),
    ;


    @Getter
    private final int code;
    private final String enMsg;
    private final String zhMsg;

    Status(int code, String enMsg, String zhMsg) {
        this.code = code;
        this.enMsg = enMsg;
        this.zhMsg = zhMsg;
    }

    public String getMsg() {
        if (Locale.SIMPLIFIED_CHINESE.getLanguage().equals(Locale.getDefault().getLanguage())) {
            return this.zhMsg;
        } else {
            return this.enMsg;
        }
    }

    /**
     * Retrieve Status enum entity by status code.
     */
    public static Optional<Status> findStatusBy(int code) {
        for (Status status : Status.values()) {
            if (code == status.getCode()) {
                return Optional.of(status);
            }
        }
        return Optional.empty();
    }
}
