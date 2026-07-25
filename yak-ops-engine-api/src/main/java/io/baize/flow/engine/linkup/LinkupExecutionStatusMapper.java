package io.baize.flow.engine.linkup;

import io.baize.flow.domain.job.JobExecutionStatus;
import java.util.Locale;

/** Linkup adapter boundary mapper, kept with the engine contract until the Linkup module is introduced. */
public final class LinkupExecutionStatusMapper {
    private LinkupExecutionStatusMapper() { }
    public static JobExecutionStatus map(String status) {
        if (status == null) return JobExecutionStatus.UNKNOWN;
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "CREATED" -> JobExecutionStatus.CREATED;
            case "SUBMITTING" -> JobExecutionStatus.SUBMITTING;
            case "SUBMITTED", "QUEUED" -> JobExecutionStatus.SUBMITTED;
            case "RUNNING", "RESTARTING" -> JobExecutionStatus.RUNNING;
            case "CANCELLING", "CANCELING" -> JobExecutionStatus.CANCELLING;
            case "CANCELED", "CANCELLED" -> JobExecutionStatus.CANCELED;
            case "SUCCEEDED", "SUCCESS", "FINISHED" -> JobExecutionStatus.SUCCEEDED;
            case "FAILED", "ERROR" -> JobExecutionStatus.FAILED;
            default -> JobExecutionStatus.UNKNOWN;
        };
    }
}
