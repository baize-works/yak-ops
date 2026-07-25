package io.yak.ops.application.model.vo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import io.yak.ops.application.model.dto.config.JobBasicConfig;
import io.yak.ops.application.model.dto.config.JobScheduleConfig;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class JobDefinitionEditDetailVO {

    private Long id;

    private JobBasicConfig basic;

    /**
     * GUIDE_SINGLE / GUIDE_MULTI workflow content.
     */
    private Object workflow;

    /**
     * SCRIPT mode content.
     */
    private Object content;

    private JobScheduleConfig schedule;

    private Object env;

    private Object mode;

    private Object runtimeType;

    private JobDefinitionStateVO state;
}
