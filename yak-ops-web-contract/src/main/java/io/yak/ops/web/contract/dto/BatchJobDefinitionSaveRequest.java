package io.yak.ops.web.contract.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class BatchJobDefinitionSaveRequest {

    /**
     * 编辑时有值，新增时可为空
     */
    private Long id;

    private Basic basic;

    private Workflow workflow;

    private Schedule schedule;

    private Env env;

    @Data
    public static class Basic {
        private String jobName;
        private String description;
        private String bridgeClientId;
        /**
         * GUIDE_SINGLE / GUIDE_MULTI / SCRIPT
         */
        private String mode;
        private String sourceType;
        private String targetType;
        private String sourceDataSourceId;
        private String targetDataSourceId;
    }

    @Data
    public static class Workflow {
        private List<Map<String, Object>> nodes;
        private List<Map<String, Object>> edges;
    }

    @Data
    public static class Schedule {
        private List<ParamItem> paramsList;

        private String instanceGenerateMode;
        private String scheduleRunType;
        private String timeoutMode;
        private Integer timeoutValue;
        private String timeoutUnit;
        private String rerunPolicy;
        private Boolean autoRetry;
        private Integer retryTimes;
        private Integer retryInterval;

        private String scheduleType;
        private String hourMode;

        private Map<String, Object> hourlyRangeValue;
        private Map<String, Object> hourlyAppointValue;
        private Map<String, Object> dailyValue;
        private Map<String, Object> weeklyValue;

        private String effectType;
        private String cronExpression;

        /**
         * 前端以后如果补传可直接用
         */
        private String scheduleStatus;
    }

    @Data
    public static class ParamItem {
        private String key;
        private String paramName;
        private String paramValue;
    }

    @Data
    public static class Env {
        /**
         * 前端传的是 job.mode
         */
        private String jobMode;

        private Integer parallelism;

        @JsonProperty("job.mode")
        public void setJobMode(String jobMode) {
            this.jobMode = jobMode;
        }
    }
}
