package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.Date;

/**
 * Persisted record of an alarm delivery attempt, for auditing and retries.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@TableName("t_baize_flow_alarm_record")
public class AlarmRecordEntity extends BaseEntity {

    private Long ruleId;

    private Long channelId;

    private String channelType;

    private Long jobInstanceId;

    private Long jobDefinitionId;

    private String jobName;

    private String newStatus;

    private String severity;

    /** 1 success, 0 failure. */
    private Integer success;

    private String errorMessage;

    private String content;

    private Date sentTime;
}
