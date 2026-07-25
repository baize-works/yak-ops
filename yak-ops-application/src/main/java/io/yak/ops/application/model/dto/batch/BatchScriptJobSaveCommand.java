package io.yak.ops.application.model.dto.batch;

import lombok.Data;
import lombok.EqualsAndHashCode;
import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.application.model.dto.command.BatchJobSaveCommand;
import io.yak.ops.application.model.dto.command.ScriptJobContentCommand;
import io.yak.ops.application.model.dto.config.BatchJobEnvConfig;
import io.yak.ops.application.model.dto.config.JobBasicConfig;
import io.yak.ops.application.model.dto.config.JobScheduleConfig;
import io.yak.ops.application.model.dto.config.ScriptJobContent;

@Data
@EqualsAndHashCode(callSuper = false)
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
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
