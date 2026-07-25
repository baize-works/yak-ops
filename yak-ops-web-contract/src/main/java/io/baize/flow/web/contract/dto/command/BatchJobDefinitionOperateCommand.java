package io.baize.flow.web.contract.dto.command;

import javax.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class BatchJobDefinitionOperateCommand {

    @NotEmpty(message = "jobDefinitionIds cannot be empty")
    private List<Long> jobDefinitionIds;
}
