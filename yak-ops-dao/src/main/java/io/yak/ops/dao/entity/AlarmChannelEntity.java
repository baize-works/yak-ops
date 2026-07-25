package io.yak.ops.dao.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

/**
 * A configured alarm channel instance (e.g. a specific webhook endpoint).
 * The {@code channelType} is the SPI key used to resolve an
 * {@link org.apache.seatunnel.plugin.alarm.api.AlarmChannel} implementation.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@TableName("t_baize_flow_alarm_channel")
public class AlarmChannelEntity extends BaseEntity {

    private String name;

    /** SPI key, e.g. WEBHOOK / DINGTALK. */
    private String channelType;

    /** Channel config as JSON string, parsed at delivery time. */
    private String configJson;

    /** 0 disabled, 1 enabled. */
    private Integer enabled;

    private String description;
}
