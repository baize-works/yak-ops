package io.yak.ops.application.model.dto.command;

import javax.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class BatchJobDefinitionOperateCommand {

    @NotEmpty(message = "jobDefinitionIds cannot be empty")
    private List<Long> jobDefinitionIds;
}
