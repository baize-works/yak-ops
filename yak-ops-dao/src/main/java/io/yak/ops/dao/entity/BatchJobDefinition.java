package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.*;
import io.yak.ops.domain.enums.JobMode;
import io.yak.ops.common.enums.SyncModeEnum;

import java.util.Date;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@TableName("t_yak_ops_job_definition")
public class BatchJobDefinition {

    @TableId(type = IdType.INPUT)
    private Long id;

    private String jobName;

    private String jobDesc;

    private String jobDefinitionInfo;

    private Integer jobVersion;

    private Integer parallelism;

    private JobMode jobType;

    private SyncModeEnum syncMode;

    private String sourceType;

    private String sourceTable;

    private String sinkType;

    private String sinkTable;

    private Date createTime;

    private Date updateTime;
}
