package io.yak.ops.common.constants;


import java.time.Duration;

/**
 *
 */
public class Constants {

    private Constants() {
    }

    /**
     * session timeout
     */
    public static final int SESSION_TIME_OUT = 7200;
    public static final int MAX_FILE_SIZE = 1024 * 1024 * 1024;
    public static final String UDF = "UDF";
    public static final String CLASS = "class";

    /**
     * complement date default cron string
     */
    public static final String DEFAULT_CRON_STRING = "0 0 0 * * ? *";

    public static final String FUNCTION_START_WITH = "$";
    public static final String EMPTY_STRING = "";

    public static final String COMMON_TASK_TYPE = "COMMON";
    public static final long DEPENDENT_ALL_TASK_CODE = 0;
    public static final String DEPENDENT_SPLIT = ":||";

    /**
     * Security authentication types (supported types: PASSWORD,LDAP)
     */
    public static final String SECURITY_CONFIG_TYPE = "securityConfigType";

    public static final String SECURITY_CONFIG_TYPE_PASSWORD = "PASSWORD";

    public static final String SECURITY_CONFIG_TYPE_LDAP = "LDAP";

    /**
     * http header
     */
    public static final String HTTP_HEADER_UNKNOWN = "unKnown";

    /**
     * http X-Forwarded-For
     */
    public static final String HTTP_X_FORWARDED_FOR = "X-Forwarded-For";

    /**
     * http X-Real-IP
     */
    public static final String HTTP_X_REAL_IP = "X-Real-IP";
    /**
     * short sleep 100ms
     */
    public static final long SLEEP_TIME_MILLIS_SHORT = 100L;
    /**
     * default worker group
     */
    public static final String DEFAULT_WORKER_GROUP = "default";

    public static final Duration SERVER_CLOSE_WAIT_TIME = Duration.ofSeconds(3);

    /**
     * sleep 1000ms
     */
    public static final long SLEEP_TIME_MILLIS = 2_000L;



    /**
     * schedule timezone
     */
    public static final String SCHEDULE_TIMEZONE = "schedule_timezone";
    public static final int RESOURCE_FULL_NAME_MAX_LENGTH = 128;

    /**
     * max task timeout
     */
    public static final int MAX_TASK_TIMEOUT = 24 * 3600;

    /**
     * forbid running task
     */
    public static final String FLOWNODE_RUN_FLAG_FORBIDDEN = "FORBIDDEN";


    /**
     * normal running task
     */
    public static final String FLOWNODE_RUN_FLAG_NORMAL = "NORMAL";

    public static final String FORMAT_S_S_COLON = "%s:%s";
    public static final String FORMAT_S_S = "%s/%s";
    public static final Integer SUCCESS = 0;

    public static final String DEFAULT = "default";

    public static final String WORKFLOW_INSTANCE_ID_MDC_KEY = "workflowInstanceId";
    public static final String TASK_INSTANCE_ID_MDC_KEY = "taskInstanceId";





    /**
     * comma ,
     */
    public static final String COMMA = ",";

    /**
     * workflow
     */
    public static final String WORKFLOW_LIST = "workFlowList";
    public static final String WORKFLOW_RELATION_LIST = "workFlowRelationList";

    /**
     * session user
     */
    public static final String SESSION_USER = "session.user";

    public static final String SESSION_ID = "sessionId";

    /**
     * spi constants
     */
    /**
     * alert plugin param field string
     **/
    public static final String STRING_PLUGIN_PARAM_FIELD = "field";
    /**
     * alert plugin param name string
     **/
    public static final String STRING_PLUGIN_PARAM_NAME = "name";
    /**
     * alert plugin param props string
     **/
    public static final String STRING_PLUGIN_PARAM_PROPS = "props";
    /**
     * alert plugin param type string
     **/
    public static final String STRING_PLUGIN_PARAM_TYPE = "type";
    /**
     * alert plugin param title string
     **/
    public static final String STRING_PLUGIN_PARAM_TITLE = "title";
    /**
     * alert plugin param value string
     **/
    public static final String STRING_PLUGIN_PARAM_VALUE = "value";
    /**
     * alert plugin param validate string
     **/
    public static final String STRING_PLUGIN_PARAM_VALIDATE = "validate";
    /**
     * alert plugin param options string
     **/
    public static final String STRING_PLUGIN_PARAM_OPTIONS = "options";
    /**
     * plugin param emit string
     **/
    public static final String STRING_PLUGIN_PARAM_EMIT = "emit";

    /**
     * COLON :
     */
    public static final String COLON = ":";

    /**
     * SPACE " "
     */
    public static final String SPACE = " ";

    /**
     * SINGLE_SLASH /
     */
    public static final String SINGLE_SLASH = "/";

    /**
     * DOUBLE_SLASH //
     */
    public static final String DOUBLE_SLASH = "//";

    /**
     * AT SIGN
     */
    public static final String AT_SIGN = "@";

    /**
     * SLASH /
     */
    public static final String SLASH = "/";

    /**
     * SEMICOLON ;
     */
    public static final String SEMICOLON = ";";

    /**
     * exit code success
     */
    public static final int EXIT_CODE_SUCCESS = 0;

    /**
     * exit code failure
     */
    public static final int EXIT_CODE_FAILURE = -1;

    /**
     * process or task definition failure
     */
    public static final int DEFINITION_FAILURE = -1;

    public static final int OPPOSITE_VALUE = -1;

    /**
     * process or task definition first version
     */
    public static final int VERSION_FIRST = 1;

    /**
     * ACCEPTED
     */
    public static final String ACCEPTED = "ACCEPTED";

    /**
     * SUCCEEDED
     */
    public static final String SUCCEEDED = "SUCCEEDED";
    /**
     * ENDED
     */
    public static final String ENDED = "ENDED";
    /**
     * NEW
     */
    public static final String NEW = "NEW";
    /**
     * NEW_SAVING
     */
    public static final String NEW_SAVING = "NEW_SAVING";
    /**
     * SUBMITTED
     */
    public static final String SUBMITTED = "SUBMITTED";
    /**
     * FAILED
     */
    public static final String FAILED = "FAILED";
    /**
     * KILLED
     */
    public static final String KILLED = "KILLED";
    /**
     * RUNNING
     */
    public static final String RUNNING = "RUNNING";
    /**
     * underline  "_"
     */
    public static final String UNDERLINE = "_";
    /**
     * application regex
     */
    public static final String APPLICATION_REGEX = "application_\\d+_\\d+";

    public static final char SUBTRACT_CHAR = '-';
    public static final char ADD_CHAR = '+';
    public static final char MULTIPLY_CHAR = '*';
    public static final char DIVISION_CHAR = '/';
    public static final char LEFT_BRACE_CHAR = '(';
    public static final char RIGHT_BRACE_CHAR = ')';
    public static final String ADD_STRING = "+";
    public static final String STAR = "*";
    public static final String DIVISION_STRING = "/";
    public static final String LEFT_BRACE_STRING = "(";
    public static final char P = 'P';
    public static final char N = 'N';
    public static final String SUBTRACT_STRING = "-";
    public static final String GLOBAL_PARAMS = "globalParams";
    public static final String LOCAL_PARAMS = "localParams";
    public static final String SUBPROCESS_INSTANCE_ID = "subProcessInstanceId";
    public static final String PROCESS_INSTANCE_STATE = "processInstanceState";
    public static final String PARENT_WORKFLOW_INSTANCE = "parentWorkflowInstance";
    public static final String CONDITION_RESULT = "conditionResult";
    public static final String SWITCH_RESULT = "switchResult";
    public static final String WAIT_START_TIMEOUT = "waitStartTimeout";
    public static final String DEPENDENCE = "dependence";
    public static final String TASK_LIST = "taskList";
    public static final String QUEUE = "queue";
    public static final String QUEUE_NAME = "queueName";
    public static final int LOG_QUERY_SKIP_LINE_NUMBER = 0;
    public static final int LOG_QUERY_LIMIT = 4096;
    public static final String BLOCKING_CONDITION = "blockingCondition";
    public static final String ALERT_WHEN_BLOCKING = "alertWhenBlocking";


}
