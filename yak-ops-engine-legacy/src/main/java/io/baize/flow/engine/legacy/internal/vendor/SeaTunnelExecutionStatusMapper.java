package io.baize.flow.engine.legacy.internal.vendor;

import io.baize.flow.engine.api.JobExecutionStatus;
import java.util.Map;
import java.util.Locale;

/** The only place where SeaTunnel lifecycle values enter the platform contract. */
public final class SeaTunnelExecutionStatusMapper {
    private static final Map<String, JobExecutionStatus> STATUS_MAP = Map.ofEntries(
            Map.entry("CREATED", JobExecutionStatus.SUBMITTED),
            Map.entry("SUBMITTED", JobExecutionStatus.SUBMITTED),
            Map.entry("QUEUED", JobExecutionStatus.SUBMITTED),
            Map.entry("INITIALIZING", JobExecutionStatus.RUNNING),
            Map.entry("RUNNING", JobExecutionStatus.RUNNING),
            Map.entry("RESTARTING", JobExecutionStatus.RUNNING),
            Map.entry("CANCELLING", JobExecutionStatus.CANCELLING),
            Map.entry("CANCELING", JobExecutionStatus.CANCELLING),
            Map.entry("CANCELED", JobExecutionStatus.CANCELED),
            Map.entry("CANCELLED", JobExecutionStatus.CANCELED),
            Map.entry("FINISHED", JobExecutionStatus.SUCCEEDED),
            Map.entry("SUCCESS", JobExecutionStatus.SUCCEEDED),
            Map.entry("SUCCEEDED", JobExecutionStatus.SUCCEEDED),
            Map.entry("FAILED", JobExecutionStatus.FAILED),
            Map.entry("ERROR", JobExecutionStatus.FAILED));

    private SeaTunnelExecutionStatusMapper() { }
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

    public record StatusResolution(JobExecutionStatus status, String rawStatus) { }
}
