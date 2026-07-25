package io.yak.ops.common.enums;

import java.time.Duration;

public enum TimeRange {
    H1(Duration.ofHours(1), "MINUTE"),
    H6(Duration.ofHours(6), "MINUTE"),
    H12(Duration.ofHours(12), "HOUR"),
    H24(Duration.ofHours(24), "HOUR"),
    D7(Duration.ofDays(7), "DAY"),
    D30(Duration.ofDays(30), "DAY");

    private final Duration duration;
    private final String granularity;

    TimeRange(Duration duration, String granularity) {
        this.duration = duration;
        this.granularity = granularity;
    }

    public Duration duration() {
        return duration;
    }

    public String granularity() {
        return granularity;
    }
}


