package io.baize.flow.application.support.hocon;


import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.application.job.handler.JobDefinitionModeHandler;
import io.baize.flow.application.job.registry.JobDefinitionModeHandlerRegistry;
import io.baize.flow.web.contract.dto.command.JobDefinitionSaveCommand;
import io.baize.flow.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;

/**
 * Default hocon builder implementation based on mode handlers.
 */
@Slf4j
@Component
public class DefaultJobDefinitionHoconBuilder implements JobDefinitionHoconBuilder {

    private final JobDefinitionModeHandlerRegistry handlerRegistry;

    public DefaultJobDefinitionHoconBuilder(JobDefinitionModeHandlerRegistry handlerRegistry) {
        this.handlerRegistry = handlerRegistry;
    }

    @Override
    public String build(JobDefinitionSaveCommand command) {
        validate(command);

        try {
            JobDefinitionModeHandler handler = handlerRegistry.getHandler(command.getMode());
            handler.validate(command);

            String hocon = handler.buildHoconConfig(command);
            if (StringUtils.isBlank(hocon)) {
                throw new ServiceException(Status.BUILD_JOB_INSTANCE_CONFIG_ERROR, "hocon config is empty");
            }
            return hocon;
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Build job hocon config failed, command={}", command, e);
            throw new ServiceException(Status.BUILD_JOB_INSTANCE_CONFIG_ERROR);
        }
    }

    /**
     * Validate build input.
     */
    private void validate(JobDefinitionSaveCommand command) {
        if (command == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobDefinition");
        }
        if (command.getMode() == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "mode");
        }
        if (command.getBasic() == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "basic");
        }
        if (StringUtils.isBlank(command.getBasic().getJobName())) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "jobName");
        }
    }
}
