package io.yak.ops.business.quality.schedule;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.yak.ops.business.quality.api.QualityApi.RunMode;
import io.yak.ops.business.quality.api.QualityApi.ScheduleFrequency;
import io.yak.ops.business.quality.api.QualityApi.ScheduleWeekday;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class QualityScheduleCalculatorTest {

  private final QualityScheduleCalculator calculator = new QualityScheduleCalculator();

  @Test
  void shouldCalculateNextDailyTime() {
    LocalDateTime from = LocalDateTime.of(2026, 8, 6, 10, 0);
    assertEquals(
        LocalDateTime.of(2026, 8, 7, 9, 0),
        calculator.nextRun(
            RunMode.SCHEDULE, ScheduleFrequency.DAILY, "09:00", null, null, from));
  }

  @Test
  void shouldCalculateNextWeeklyTime() {
    LocalDateTime from = LocalDateTime.of(2026, 8, 6, 10, 0);
    assertEquals(
        LocalDateTime.of(2026, 8, 10, 9, 30),
        calculator.nextRun(
            RunMode.SCHEDULE,
            ScheduleFrequency.WEEKLY,
            "09:30",
            ScheduleWeekday.MON,
            null,
            from));
  }

  @Test
  void shouldCalculateCronTime() {
    LocalDateTime from = LocalDateTime.of(2026, 8, 6, 10, 0);
    assertEquals(
        LocalDateTime.of(2026, 8, 7, 9, 0),
        calculator.nextRun(
            RunMode.SCHEDULE,
            ScheduleFrequency.CRON,
            null,
            null,
            "0 0 9 * * *",
            from));
  }

  @Test
  void shouldRejectInvalidCron() {
    assertThrows(
        IllegalArgumentException.class,
        () -> calculator.validateCron("invalid cron"));
  }
}
