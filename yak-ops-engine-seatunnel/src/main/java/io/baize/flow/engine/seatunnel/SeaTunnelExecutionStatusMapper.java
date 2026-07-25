package io.baize.flow.engine.seatunnel;

import io.baize.flow.engine.api.JobExecutionStatus;
import java.util.Locale;

/** The only place where SeaTunnel lifecycle values enter the platform contract. */
public final class SeaTunnelExecutionStatusMapper {
    private SeaTunnelExecutionStatusMapper() { }
    public static JobExecutionStatus map(String vendorStatus) {
        if (vendorStatus == null) return JobExecutionStatus.UNKNOWN;
        return switch (vendorStatus.toUpperCase(Locale.ROOT)) {
            case "CREATED", "SUBMITTED", "QUEUED" -> JobExecutionStatus.SUBMITTED;
            case "INITIALIZING", "RUNNING", "RESTARTING" -> JobExecutionStatus.RUNNING;
            case "CANCELLING", "CANCELING" -> JobExecutionStatus.CANCELLING;
            case "CANCELED", "CANCELLED" -> JobExecutionStatus.CANCELED;
            case "FINISHED", "SUCCESS", "SUCCEEDED" -> JobExecutionStatus.SUCCEEDED;
            case "FAILED", "ERROR" -> JobExecutionStatus.FAILED;
            default -> JobExecutionStatus.UNKNOWN;
        };
    }
}
