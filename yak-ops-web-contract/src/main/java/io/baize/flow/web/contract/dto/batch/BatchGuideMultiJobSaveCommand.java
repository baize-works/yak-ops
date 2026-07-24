package io.baize.flow.web.contract.dto.batch;

import lombok.Data;
import lombok.EqualsAndHashCode;
import io.baize.flow.common.enums.JobDefinitionMode;
import io.baize.flow.web.contract.dto.command.BatchJobSaveCommand;
import io.baize.flow.web.contract.dto.command.GuideMultiJobContentCommand;
import io.baize.flow.web.contract.dto.config.BatchJobEnvConfig;
import io.baize.flow.web.contract.dto.config.GuideMultiJobContent;
import io.baize.flow.web.contract.dto.config.JobBasicConfig;
import io.baize.flow.web.contract.dto.config.JobScheduleConfig;

@Data
@EqualsAndHashCode(callSuper = false)
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class BatchGuideMultiJobSaveCommand implements BatchJobSaveCommand, GuideMultiJobContentCommand {

    private Long id;

    private JobBasicConfig basic;

    private GuideMultiJobContent content;

    private JobScheduleConfig schedule;

    private BatchJobEnvConfig env;

    @Override
    public JobDefinitionMode getMode() {
        return JobDefinitionMode.GUIDE_MULTI;
    }
}