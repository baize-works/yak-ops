package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.*;
import io.yak.ops.common.enums.JobDefinitionMode;
import io.yak.ops.domain.enums.JobMode;
import io.yak.ops.common.enums.ReleaseState;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@TableName("t_baize_flow_job_definition")
public class JobDefinitionEntity extends BaseEntity {

    private String jobName;
    private String jobDesc;

    private JobDefinitionMode mode;
    private JobMode jobType;

    private Long clientId;

    private Integer jobVersion;
    private ReleaseState releaseState;

    private String sourceType;
    private String sinkType;
    private String sourceTable;
    private String sinkTable;

    private Long sourceDatasourceId;
    private Long sinkDatasourceId;
}
