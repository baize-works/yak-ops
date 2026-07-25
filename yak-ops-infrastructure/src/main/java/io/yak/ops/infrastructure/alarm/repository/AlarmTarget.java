package io.yak.ops.infrastructure.alarm.repository;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * A matched alarm rule together with the channels it should dispatch to.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AlarmTarget {

    private Long ruleId;

    private String ruleName;

    /** INFO / WARN / CRITICAL */
    private String severity;

    private List<AlarmTargetChannel> channels;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AlarmTargetChannel {

        private Long channelId;

        /** SPI key, e.g. WEBHOOK. */
        private String channelType;

        /** Channel config as stored JSON. */
        private String configJson;
    }
}
