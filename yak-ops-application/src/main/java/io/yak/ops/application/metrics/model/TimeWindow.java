package io.yak.ops.application.metrics.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TimeWindow {
    private LocalDateTime start;
    private LocalDateTime end;
}
