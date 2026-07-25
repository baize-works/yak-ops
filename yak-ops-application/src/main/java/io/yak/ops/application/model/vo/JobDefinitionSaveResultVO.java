package io.yak.ops.application.model.vo;

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
@Deprecated
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
