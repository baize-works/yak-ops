package io.yak.ops.engine.legacy.internal.vendor;

import io.yak.ops.engine.api.JobExecutionStatus;
import java.util.Map;
import java.util.Locale;

/** The only place where LinkUp lifecycle values enter the platform contract. */
public final class LinkUpExecutionStatusMapper {
    private static final Map<String, JobExecutionStatus> STATUS_MAP;

    static {
        Map<String, JobExecutionStatus> statuses = new java.util.LinkedHashMap<>();
        statuses.put("CREATED", JobExecutionStatus.SUBMITTED);
        statuses.put("SUBMITTED", JobExecutionStatus.SUBMITTED);
        statuses.put("QUEUED", JobExecutionStatus.SUBMITTED);
        statuses.put("INITIALIZING", JobExecutionStatus.RUNNING);
        statuses.put("RUNNING", JobExecutionStatus.RUNNING);
        statuses.put("RESTARTING", JobExecutionStatus.RUNNING);
        statuses.put("CANCELLING", JobExecutionStatus.CANCELLING);
        statuses.put("CANCELING", JobExecutionStatus.CANCELLING);
        statuses.put("CANCELED", JobExecutionStatus.CANCELED);
        statuses.put("CANCELLED", JobExecutionStatus.CANCELED);
        statuses.put("FINISHED", JobExecutionStatus.SUCCEEDED);
        statuses.put("SUCCESS", JobExecutionStatus.SUCCEEDED);
        statuses.put("SUCCEEDED", JobExecutionStatus.SUCCEEDED);
        statuses.put("FAILED", JobExecutionStatus.FAILED);
        statuses.put("ERROR", JobExecutionStatus.FAILED);
        STATUS_MAP = java.util.Collections.unmodifiableMap(statuses);
    }

    private LinkUpExecutionStatusMapper() { }
    public static JobExecutionStatus map(String vendorStatus) {
        return resolve(vendorStatus).status();
    }

    /** Resolves only explicitly recognized values and retains the original wire value. */
    public static StatusResolution resolve(String vendorStatus) {
        if (vendorStatus == null) return new StatusResolution(JobExecutionStatus.UNKNOWN, null);
        String normalized = vendorStatus.trim().toUpperCase(Locale.ROOT);
        return new StatusResolution(
                STATUS_MAP.getOrDefault(normalized, JobExecutionStatus.UNKNOWN), vendorStatus);
    }

    public static final class StatusResolution {


        private final JobExecutionStatus status;

        private final String rawStatus;


        public StatusResolution(JobExecutionStatus status, String rawStatus) {

            this.status = status;

            this.rawStatus = rawStatus;

        }


        public JobExecutionStatus status() { return status; }



        public JobExecutionStatus getStatus() { return status; }


        public String rawStatus() { return rawStatus; }



        public String getRawStatus() { return rawStatus; }


        @Override

        public boolean equals(Object o) {

            if (this == o) return true;

            if (o == null || getClass() != o.getClass()) return false;

            StatusResolution that = (StatusResolution) o;

            return java.util.Objects.equals(status, that.status) && java.util.Objects.equals(rawStatus, that.rawStatus);

        }


        @Override

        public int hashCode() { return java.util.Objects.hash(status, rawStatus); }


        @Override

        public String toString() {

            return "StatusResolution[" + "status=" + status + ", " + "rawStatus=" + rawStatus + "]";

        }

    }
}
