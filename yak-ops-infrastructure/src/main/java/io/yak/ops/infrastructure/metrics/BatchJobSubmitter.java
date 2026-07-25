package io.yak.ops.infrastructure.metrics;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.domain.enums.JobSubmitStage;
import io.yak.ops.domain.exception.JobSubmitException;
import io.yak.ops.application.service.application.BatchJobSubmissionUseCase;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.engine.api.EngineEndpoint;
import io.yak.ops.engine.api.ExecutionEngine;
import io.yak.ops.engine.api.EngineGateway;
import io.yak.ops.engine.api.EngineGatewayRegistry;
import io.yak.ops.engine.api.JobSubmitCommand;
import io.yak.ops.web.contract.vo.JobInstanceVO;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;


/**
 * Submitter for batch SeaTunnel jobs.
 *
 * <p>
 * This class only handles batch job submission, metrics monitoring,
 * and result watching.
 * </p>
 */
@Component
@Slf4j
public class BatchJobSubmitter implements BatchJobSubmissionUseCase {

    private static final String JOB_TYPE_BATCH = "BATCH";

    private final JobConfigFileService configFileService;
    private final EngineGatewayRegistry engineGatewayRegistry;
    private final JobMetricsMonitor batchMetricsMonitor;
    private final JobResultWatcher batchJobResultWatcher;
    private final JobResultHandler batchJobResultHandler;

    public BatchJobSubmitter(JobConfigFileService configFileService,
                             EngineGatewayRegistry engineGatewayRegistry,
                             JobMetricsMonitor batchMetricsMonitor,
                             JobResultWatcher batchJobResultWatcher,
                             JobResultHandler batchJobResultHandler) {
        this.configFileService = configFileService;
        this.engineGatewayRegistry = engineGatewayRegistry;
        this.batchMetricsMonitor = batchMetricsMonitor;
        this.batchJobResultWatcher = batchJobResultWatcher;
        this.batchJobResultHandler = batchJobResultHandler;
    }

    @Override
    public void submit(JobInstanceVO instance) {
        validate(instance);

        Long instanceId = instance.getId();
        Long jobDefinitionId = instance.getJobDefinitionId();
        Long clientId = instance.getClientId();

        String hoconConfig = instance.getRuntimeConfig();
        String logPath = instance.getLogPath();

        JobFileLogger jobLogger = new JobFileLogger(logPath);
        jobLogger.info("=== Batch Job Submit Start (REST API) ===");
        jobLogger.info("Batch instanceId: " + instanceId);
        jobLogger.info("Batch definitionId: " + jobDefinitionId);
        jobLogger.info("Client id: " + clientId);

        String configFile = null;
        String engineId = null;
        boolean submitted = false;

        try {
            jobLogger.info("Writing batch config file...");
            configFile = configFileService.writeConfig(instanceId, hoconConfig);
            jobLogger.info("Batch config file written to: " + configFile);

            jobLogger.info("Submitting batch job via REST API...");
            log.info("Submitting batch job to Zeta, instanceId={}, clientId={}", instanceId, clientId);

            String filename = "batch-job-" + instanceId + ".conf";

            EngineEndpoint endpoint = new EngineEndpoint(new ExecutionEngine("legacy"), String.valueOf(clientId), null, null, java.util.java.util.Collections.emptyMap());
            EngineGateway gateway = engineGatewayRegistry.get(endpoint.engine());
            engineId = gateway.submit(new JobSubmitCommand(endpoint, safeConfig(hoconConfig), java.util.Collections.unmodifiableMap(new java.util.LinkedHashMap() {{ put("fileName", filename); put("jobName", instance.getJobName()); }}), "job-instance-" + instanceId)).externalExecutionId();
            submitted = true;

            log.info("Submit batch job response received, instanceId={}, engineId={}", instanceId, engineId);
            jobLogger.info("Submit batch job response received: engineId=" + engineId);

            batchJobResultHandler.updateEngineId(instanceId, engineId);

            JobRuntimeContext ctx = buildRuntimeContext(
                    instance,
                    engineId,
                    configFile
            );

            registerPostSubmitWatchers(ctx, jobLogger);

            jobLogger.info("=== Batch Job Submit Complete ===");
        } catch (Exception e) {
            if (submitted) {
                handlePostSubmitFailure(jobLogger, instanceId, engineId, e);
                return;
            }

            handleCoreFailure(jobLogger, instanceId, e);
        } finally {
            jobLogger.close();
        }
    }

    @Override
    public void pause(JobInstanceVO instance) {
        if (instance == null || instance.getId() == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobInstance");
        }

        if (instance.getClientId() == null || instance.getClientId() <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "clientId");
        }

        if (instance.getEngineJobId() == null ) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "engineJobId");
        }

        Long instanceId = instance.getId();
        Long clientId = instance.getClientId();
        String engineJobId = instance.getEngineJobId();

        log.info("Stopping batch SeaTunnel job: instanceId={}, clientId={}, engineJobId={}",
                instanceId, clientId, engineJobId);

        EngineEndpoint endpoint = new EngineEndpoint(new ExecutionEngine("legacy"), String.valueOf(clientId), null, null, java.util.java.util.Collections.emptyMap());
        engineGatewayRegistry.get(endpoint.engine()).cancel(endpoint, engineJobId);

        log.info("Stop batch engine job response: instanceId={}, clientId={}, engineJobId={}",
                instanceId, clientId, engineJobId);
    }

    private void registerPostSubmitWatchers(JobRuntimeContext ctx,
                                            JobFileLogger jobLogger) {
        boolean metricsRegistered = false;
        boolean watcherRegistered = false;

        try {
            batchMetricsMonitor.register(ctx);
            metricsRegistered = true;

            jobLogger.info("Batch metrics monitor registered");
            log.info("Batch metrics monitor registered, instanceId={}, engineId={}",
                    ctx.getInstanceId(), ctx.getEngineId());
        } catch (Exception e) {
            jobLogger.warn("Batch metrics monitor register failed: " + e.getMessage());

            log.warn("Batch metrics monitor register failed, instanceId={}, engineId={}",
                    ctx.getInstanceId(), ctx.getEngineId(), e);
        }

        try {
            batchJobResultWatcher.registerByRest(ctx);
            watcherRegistered = true;

            jobLogger.info("Batch REST result watcher registered");
            log.info("Batch REST result watcher registered, instanceId={}, engineId={}",
                    ctx.getInstanceId(), ctx.getEngineId());
        } catch (Exception e) {
            jobLogger.warn("Batch result watcher register failed: " + e.getMessage());

            log.warn("Batch result watcher register failed, instanceId={}, engineId={}",
                    ctx.getInstanceId(), ctx.getEngineId(), e);
        }

        if (!metricsRegistered || !watcherRegistered) {
            jobLogger.warn(
                    "Batch post-submit watcher registration incomplete. " +
                            "The job has already been submitted to SeaTunnel Engine. " +
                            "metricsRegistered=" + metricsRegistered +
                            ", watcherRegistered=" + watcherRegistered
            );
        }
    }

    private JobRuntimeContext buildRuntimeContext(JobInstanceVO instance,
                                                  String engineId,
                                                  String configFile) {
        JobRuntimeContext ctx = new JobRuntimeContext();

        ctx.setInstanceId(instance.getId());
        ctx.setJobDefinitionId(instance.getJobDefinitionId());
        ctx.setClientId(instance.getClientId());
        ctx.setEngineId(engineId);
        ctx.setConfigFile(configFile);
        ctx.setJobType(JOB_TYPE_BATCH);

        return ctx;
    }

    private void handleCoreFailure(JobFileLogger jobLogger,
                                   Long instanceId,
                                   Exception e) {
        jobLogger.error("Batch job submit failed before engine accepted the job", e);

        try {
            batchJobResultHandler.handleFailure(instanceId, e);
        } catch (Exception handlerEx) {
            log.error("Batch handleFailure threw exception, instanceId={}", instanceId, handlerEx);
        }

        throw (e instanceof JobSubmitException)
                ? (JobSubmitException) e
                : new JobSubmitException(JobSubmitStage.SUBMIT, "Submit batch job failed", e);
    }

    private void handlePostSubmitFailure(JobFileLogger jobLogger,
                                         Long instanceId,
                                         String engineId,
                                         Exception e) {
        jobLogger.error(
                "Batch job was submitted to SeaTunnel Engine, but post-submit handling failed. " +
                        "instanceId=" + instanceId + ", engineId=" + engineId,
                e
        );

        log.warn(
                "Batch post-submit handling failed after job accepted by engine, instanceId={}, engineId={}",
                instanceId,
                engineId,
                e
        );

        /*
         * Do not mark the batch job instance as FAILED here.
         *
         * Reason:
         * The SeaTunnel Engine has already accepted the job.
         * If we mark the local instance as failed now, local state may conflict
         * with the real engine state.
         */
    }

    private void validate(JobInstanceVO instance) {
        if (instance == null) {
            throw new IllegalArgumentException("Batch job instance must not be null");
        }

        if (instance.getId() == null) {
            throw new IllegalArgumentException("Batch job instance id must not be null");
        }

        if (instance.getClientId() == null) {
            throw new IllegalArgumentException("Batch job client id must not be null");
        }

        if (StringUtils.isBlank(instance.getLogPath())) {
            throw new IllegalArgumentException("Batch job log path must not be blank");
        }

        if (StringUtils.isBlank(instance.getRuntimeConfig())) {
            throw new IllegalArgumentException("Batch job runtime config must not be blank");
        }
    }

    private String safeConfig(String config) {
        return config == null ? "" : config;
    }
}
