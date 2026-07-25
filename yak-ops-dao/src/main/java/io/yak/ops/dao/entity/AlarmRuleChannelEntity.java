package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

/**
 * Many-to-many link between an alarm rule and an alarm channel.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@TableName("t_baize_flow_alarm_rule_channel")
public class AlarmRuleChannelEntity extends BaseEntity {

    private Long ruleId;

    private Long channelId;
}
