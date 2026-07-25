package io.baize.flow.web.contract.dto.batch;

import lombok.Data;
import lombok.EqualsAndHashCode;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.web.contract.dto.command.BatchJobSaveCommand;
import io.baize.flow.web.contract.dto.command.ScriptJobContentCommand;
import io.baize.flow.web.contract.dto.config.BatchJobEnvConfig;
import io.baize.flow.web.contract.dto.config.JobBasicConfig;
import io.baize.flow.web.contract.dto.config.JobScheduleConfig;
import io.baize.flow.web.contract.dto.config.ScriptJobContent;

@Data
@EqualsAndHashCode(callSuper = false)
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class BatchScriptJobSaveCommand implements BatchJobSaveCommand, ScriptJobContentCommand {

    private Long id;

    private JobBasicConfig basic;

    private ScriptJobContent content;

    private JobScheduleConfig schedule;

    private BatchJobEnvConfig env;

    @Override
    public JobDefinitionMode getMode() {
        return JobDefinitionMode.SCRIPT;
    }
}
