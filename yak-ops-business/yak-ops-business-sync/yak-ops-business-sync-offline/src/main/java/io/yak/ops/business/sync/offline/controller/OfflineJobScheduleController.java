package io.yak.ops.business.sync.offline.controller;

import io.yak.framework.common.Result;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 离线同步调度表达式辅助接口。 */
@ConditionalOnOfflineSyncEnabled
@RestController
@RequestMapping("/api/v1/job/schedule")
public class OfflineJobScheduleController {

  private static final DateTimeFormatter FORMATTER =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  @GetMapping("/last5-execution-times")
  public Result<List<String>> nextFive(@RequestParam String cron) {
    if (!StringUtils.hasText(cron)) {
      throw new IllegalArgumentException("cron 不能为空");
    }
    CronExpression expression = CronExpression.parse(cron.trim());
    List<String> values = new ArrayList<>(5);
    LocalDateTime cursor = LocalDateTime.now();
    for (int index = 0; index < 5; index++) {
      cursor = expression.next(cursor);
      if (cursor == null) {
        break;
      }
      values.add(cursor.format(FORMATTER));
    }
    return Result.success(values);
  }
}
