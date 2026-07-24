package io.baize.flow.web.contract.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class JobDefinitionSaveResultVO {

    /**
     * Job definition id.
     */
    private Long id;

    /**
     * State after save.
     */
    private JobDefinitionStateVO state;
}