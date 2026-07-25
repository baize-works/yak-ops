package io.yak.ops.infrastructure.metrics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Runtime context information for a SeaTunnel job instance.
 *
 * This object carries the essential metadata required during
 * job execution, monitoring, and result handling.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class JobRuntimeContext {

    /**
     * Unique identifier of the job instance in the admin system.
     * Used for tracking, monitoring, and persistence.
     */
    private Long instanceId;

    /**
     * Engine-side job identifier.
     * This ID is used to communicate with the SeaTunnel engine
     * for metrics collection and job result querying.
     */
    private String engineId;

    private Long jobDefinitionId;

    /**
     * Path to the job configuration file.
     * Used when submitting or reloading job execution parameters.
     */
    private String configFile;

    private Long clientId;

    private String jobType;
}
