package io.yak.ops.common.constants;

public class ConfigConstant {
    public static final String SEATUNNEL_SERVICE_NAME = "st:impl:seaTunnelServer";

    public static final String SEATUNNEL_ID_GENERATOR_NAME = "SeaTunnelIdGenerator";

    public static final String DEFAULT_SEATUNNEL_CLUSTER_NAME = "seatunnel";

    public static final String REST_SUBMIT_JOBS_PARAMS = "params";

    /**
     * The default port number for the cluster auto-discovery mechanism's multicast communication.
     */
    public static final int DEFAULT_SEATUNNEL_MULTICAST_PORT = 53326;

    public static final String SYSPROP_SEATUNNEL_CONFIG = "seatunnel.config";

    public static final String HAZELCAST_SEATUNNEL_CONF_FILE_PREFIX = "seatunnel";

    public static final String HAZELCAST_SEATUNNEL_DEFAULT_YAML = "seatunnel.yaml";

    public static final int OPERATION_RETRY_TIME = 30;

    public static final int OPERATION_RETRY_SLEEP = 2000;

    public static final String IMAP_RUNNING_JOB_INFO = "engine_runningJobInfo";

    public static final String IMAP_RUNNING_JOB_STATE = "engine_runningJobState";

    public static final String IMAP_FINISHED_JOB_STATE = "engine_finishedJobState";

    public static final String IMAP_FINISHED_JOB_METRICS = "engine_finishedJobMetrics";

    public static final String IMAP_FINISHED_JOB_VERTEX_INFO = "engine_finishedJobVertexInfo";

    public static final String IMAP_STATE_TIMESTAMPS = "engine_stateTimestamps";

    public static final String IMAP_OWNED_SLOT_PROFILES = "engine_ownedSlotProfilesIMap";

    public static final String IMAP_CHECKPOINT_ID = "engine_checkpoint-id-map";

    public static final String IMAP_RUNNING_JOB_METRICS = "engine_runningJobMetrics";

    public static final String IMAP_CONNECTOR_JAR_REF_COUNTERS = "engine_connectorJarRefCounters";

    public static final String PROP_FILE = "zeta.version.properties";
}
