package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;

/**
 * Many-to-many link between an alarm rule and an alarm channel.
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@TableName("t_yak_ops_alarm_rule_channel")
public class AlarmRuleChannelEntity extends BaseEntity {

    private Long ruleId;

    private Long channelId;
}
