package io.yak.ops.business.sync.offline.service;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.domain.OfflineExecutionStatus;
import io.yak.ops.business.sync.offline.engine.LinkUpClient;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpJobLogEntry;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpJobLogPageResponse;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpProtocolException;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpRequestException;
import io.yak.ops.business.sync.offline.engine.LinkUpClient.LinkUpTransportException;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository;
import io.yak.ops.business.sync.offline.repository.OfflineExecutionControlRepository.ExecutionEventRecord;
import io.yak.ops.common.bean.po.sync.offline.OfflineJobExecutionPO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineExecutionLogEntryVO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineExecutionLogPageVO;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** 将 Yak Ops 状态事件和 Link-Up 物理日志合并成统一时间线。 */
@ConditionalOnOfflineSyncEnabled
@Component
public class OfflineExecutionLogService {
  private static final DateTimeFormatter FORMAT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

  private final OfflineExecutionControlRepository repository;
  private final LinkUpClient linkUpClient;

  public OfflineExecutionLogService(
      OfflineExecutionControlRepository repository,
      LinkUpClient linkUpClient) {
    this.repository = repository;
    this.linkUpClient = linkUpClient;
  }

  public OfflineExecutionLogPageVO logs(
      OfflineJobExecutionPO execution,
      String cursorValue,
      int limit) {
    if (execution == null || execution.getId() == null) {
      throw new IllegalArgumentException("离线同步执行实例不能为空");
    }
    if (limit < 1 || limit > 1000) {
      throw new IllegalArgumentException("日志 limit 必须在 1 到 1000 之间");
    }

    Cursor cursor = Cursor.parse(cursorValue);
    List<ExecutionEventRecord> events =
        repository.listExecutionEventsAfter(
            execution.getId(),
            cursor.yakEventId,
            limit);

    List<OfflineExecutionLogEntryVO> items = new ArrayList<>();
    long nextYakEventId = cursor.yakEventId;
    for (ExecutionEventRecord event : events) {
      items.add(toYakOpsEntry(execution, event));
      if (event.getId() != null) {
        nextYakEventId = Math.max(nextYakEventId, event.getId());
      }
    }

    long nextLinkCursor = cursor.linkCursor;
    boolean linkUpAvailable = true;
    boolean linkUpCompleted = !StringUtils.hasText(execution.getEngineJobId());
    String warning = null;

    if (StringUtils.hasText(execution.getEngineJobId())) {
      try {
        LinkUpJobLogPageResponse response =
            linkUpClient.logs(
                execution.getEngineJobId(),
                cursor.linkCursor,
                limit);
        if (response != null) {
          nextLinkCursor = value(response.getNextCursor(), cursor.linkCursor);
          linkUpCompleted = Boolean.TRUE.equals(response.getCompleted());
          if (response.getItems() != null) {
            for (LinkUpJobLogEntry entry : response.getItems()) {
              items.add(toLinkUpEntry(execution, response, entry));
            }
          }
        }
      } catch (LinkUpRequestException exception) {
        linkUpAvailable = false;
        warning =
            exception.getStatusCode() == 404 || exception.getStatusCode() == 405
                ? "当前 Link-Up 版本尚未提供任务日志接口，请先升级 Worker"
                : "Link-Up 日志请求失败：" + exception.getMessage();
      } catch (LinkUpTransportException | LinkUpProtocolException exception) {
        linkUpAvailable = false;
        warning = "暂时无法读取 Link-Up 日志：" + exception.getMessage();
      }
    }

    items.sort(
        Comparator.comparing(
                OfflineExecutionLogEntryVO::getTimestampMillis,
                Comparator.nullsLast(Long::compareTo))
            .thenComparing(
                OfflineExecutionLogEntryVO::getSource,
                Comparator.nullsLast(String::compareTo))
            .thenComparingLong(OfflineExecutionLogEntryVO::getSequence));

    boolean terminal = !OfflineExecutionStatus.isActive(execution.getStatus());
    boolean yakCompleted = events.size() < limit;
    boolean completed =
        terminal
            && yakCompleted
            && (linkUpCompleted || !linkUpAvailable);

    return OfflineExecutionLogPageVO.builder()
        .items(items)
        .nextCursor(Cursor.encode(nextYakEventId, nextLinkCursor))
        .completed(completed)
        .linkUpAvailable(linkUpAvailable)
        .warning(warning)
        .build();
  }

  private OfflineExecutionLogEntryVO toYakOpsEntry(
      OfflineJobExecutionPO execution,
      ExecutionEventRecord event) {
    Long timestampMillis = epochMillis(event.getCreateTime());
    String from = text(event.getFromStatus());
    String to = text(event.getToStatus());
    String transition = from + " -> " + to;
    String message =
        StringUtils.hasText(event.getMessage())
            ? transition + " | " + event.getMessage()
            : transition;

    return OfflineExecutionLogEntryVO.builder()
        .sequence(value(event.getId(), 0L))
        .timestampMillis(timestampMillis)
        .timestamp(format(timestampMillis))
        .source("YAK_OPS")
        .level(level(event.getToStatus()))
        .stage(event.getEventType())
        .externalExecutionId(execution.getExternalExecutionId())
        .engineJobId(execution.getEngineJobId())
        .message(message)
        .build();
  }

  private OfflineExecutionLogEntryVO toLinkUpEntry(
      OfflineJobExecutionPO execution,
      LinkUpJobLogPageResponse response,
      LinkUpJobLogEntry entry) {
    Long timestampMillis = entry == null ? null : entry.getTimestampMillis();
    String logger = entry == null ? null : entry.getLogger();
    String message = entry == null ? null : entry.getMessage();

    return OfflineExecutionLogEntryVO.builder()
        .sequence(entry == null ? 0L : value(entry.getSequence(), 0L))
        .timestampMillis(timestampMillis)
        .timestamp(format(timestampMillis))
        .source("LINK_UP")
        .level(
            entry == null || !StringUtils.hasText(entry.getLevel())
                ? "INFO"
                : entry.getLevel().toUpperCase(Locale.ROOT))
        .stage(linkStage(logger, message))
        .externalExecutionId(
            firstText(
                response == null ? null : response.getExternalExecutionId(),
                execution.getExternalExecutionId()))
        .engineJobId(
            firstText(
                response == null ? null : response.getJobId(),
                execution.getEngineJobId()))
        .runId(response == null ? null : response.getRunId())
        .thread(entry == null ? null : entry.getThread())
        .logger(logger)
        .message(message)
        .build();
  }

  private String linkStage(String logger, String message) {
    String normalizedLogger =
        logger == null ? "" : logger.toLowerCase(Locale.ROOT);
    String normalizedMessage =
        message == null ? "" : message.toLowerCase(Locale.ROOT);

    if (normalizedMessage.contains("catalog sql")
        || normalizedMessage.contains("create table")
        || normalizedLogger.contains("catalog")) {
      return "SCHEMA";
    }
    if (normalizedLogger.contains("taskexecutor")) {
      return "TASK";
    }
    if (normalizedLogger.contains("jobexecution")) {
      return "JOB";
    }
    if (normalizedLogger.contains("split")) {
      return "SPLIT";
    }
    return "ENGINE";
  }

  private String level(String status) {
    if (!StringUtils.hasText(status)) {
      return "INFO";
    }
    String normalized = status.trim().toUpperCase(Locale.ROOT);
    if ("FAILED".equals(normalized) || "LOST".equals(normalized)) {
      return "ERROR";
    }
    if ("CANCELED".equals(normalized)
        || "CANCELLED".equals(normalized)) {
      return "WARN";
    }
    return "INFO";
  }

  private Long epochMillis(LocalDateTime value) {
    return value == null
        ? null
        : value.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
  }

  private String format(Long timestampMillis) {
    return timestampMillis == null
        ? null
        : FORMAT.format(
            Instant.ofEpochMilli(timestampMillis)
                .atZone(ZoneId.systemDefault()));
  }

  private String text(String value) {
    return StringUtils.hasText(value) ? value : "-";
  }

  private String firstText(String first, String second) {
    return StringUtils.hasText(first) ? first : second;
  }

  private long value(Long value, long fallback) {
    return value == null ? fallback : value;
  }

  private static final class Cursor {
    private final long yakEventId;
    private final long linkCursor;

    private Cursor(long yakEventId, long linkCursor) {
      this.yakEventId = yakEventId;
      this.linkCursor = linkCursor;
    }

    private static Cursor parse(String value) {
      if (!StringUtils.hasText(value)) {
        return new Cursor(0L, 0L);
      }
      String[] parts = value.trim().split(":", -1);
      if (parts.length != 2) {
        throw new IllegalArgumentException("日志 cursor 格式不正确");
      }
      try {
        long yakEventId = Long.parseLong(parts[0]);
        long linkCursor = Long.parseLong(parts[1]);
        if (yakEventId < 0L || linkCursor < 0L) {
          throw new IllegalArgumentException("日志 cursor 不能为负数");
        }
        return new Cursor(yakEventId, linkCursor);
      } catch (NumberFormatException exception) {
        throw new IllegalArgumentException("日志 cursor 格式不正确", exception);
      }
    }

    private static String encode(long yakEventId, long linkCursor) {
      return yakEventId + ":" + linkCursor;
    }
  }
}
