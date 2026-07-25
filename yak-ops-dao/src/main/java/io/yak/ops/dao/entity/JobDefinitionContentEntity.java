package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import io.yak.ops.common.enums.JobDefinitionMode;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("t_yak_ops_job_definition_content")
public class JobDefinitionContentEntity {

    private Long id;
    private Long jobDefinitionId;
    private Integer version;
    private JobDefinitionMode mode;
    private Integer contentSchemaVersion;
    private String definitionContent;
    private String envConfig;
    private Date createTime;
}
