package io.yak.ops.business.development.execution;

import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.config.DataDevelopmentProperties;
import io.yak.ops.business.development.domain.DataDevelopmentModel.ExecutionEvent;
import io.yak.ops.business.development.repository.DataDevelopmentExecutionRepository;
import io.yak.ops.business.development.repository.DataDevelopmentRepository;
import io.yak.ops.business.development.service.DataDevelopmentJsonCodec;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Persists execution events and fans them out to browser SSE subscribers. */
@ConditionalOnDataDevelopmentEnabled
@Component
public class DataDevelopmentExecutionEventStream {

  private static final String SSE_EVENT_NAME = "execution-event";

  private final DataDevelopmentExecutionRepository repository;
  private final DataDevelopmentRepository controlRepository;
  private final DataDevelopmentJsonCodec json;
  private final int replayLimit;
  private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();
  private final Map<Long, Object> sequenceLocks = new ConcurrentHashMap<>();

  public DataDevelopmentExecutionEventStream(
      DataDevelopmentExecutionRepository repository,
      DataDevelopmentRepository controlRepository,
      DataDevelopmentJsonCodec json,
      DataDevelopmentProperties properties) {
    this.repository = repository;
    this.controlRepository = controlRepository;
    this.json = json;
    this.replayLimit = Math.max(100, properties.getExecution().getEventReplayLimit());
  }

  public ExecutionEvent publish(
      long executionId,
      Long attemptId,
      String eventType,
      Object payload) {
    ExecutionEvent event;
    Object lock = sequenceLocks.computeIfAbsent(executionId, ignored -> new Object());
    synchronized (lock) {
      long sequence = repository.nextEventSequence(executionId);
      event = repository.insertEvent(
          executionId,
          attemptId,
          sequence,
          eventType,
          json.write(json.toTree(payload == null ? Map.of() : payload)),
          LocalDateTime.now());
    }
    broadcast(event);
    if (terminal(eventType)) {
      complete(executionId);
      sequenceLocks.remove(executionId);
    }
    return event;
  }

  public SseEmitter subscribe(long executionId, long afterSequence) {
    var execution = controlRepository.findExecution(executionId)
        .orElseThrow(() -> new IllegalArgumentException("任务执行不存在：" + executionId));
    SseEmitter emitter = new SseEmitter(0L);
    CopyOnWriteArrayList<SseEmitter> subscribers = emitters.computeIfAbsent(
        executionId,
        ignored -> new CopyOnWriteArrayList<>());

    try {
      List<ExecutionEvent> replay = repository.listEvents(
          executionId,
          Math.max(0L, afterSequence),
          replayLimit);
      for (ExecutionEvent event : replay) {
        send(emitter, event);
      }
      if (execution.status().terminal()) {
        emitter.complete();
        return emitter;
      }
      subscribers.add(emitter);
      emitter.onCompletion(() -> remove(executionId, emitter));
      emitter.onTimeout(() -> remove(executionId, emitter));
      emitter.onError(error -> remove(executionId, emitter));
    } catch (IOException error) {
      emitter.completeWithError(error);
    }
    return emitter;
  }

  private void broadcast(ExecutionEvent event) {
    List<SseEmitter> subscribers = emitters.getOrDefault(
        event.executionId(),
        new CopyOnWriteArrayList<>());
    for (SseEmitter emitter : subscribers) {
      try {
        send(emitter, event);
      } catch (IOException | IllegalStateException error) {
        remove(event.executionId(), emitter);
      }
    }
  }

  private static void send(SseEmitter emitter, ExecutionEvent event) throws IOException {
    emitter.send(SseEmitter.event()
        .id(Long.toString(event.sequenceNo()))
        .name(SSE_EVENT_NAME)
        .data(event));
  }

  private void complete(long executionId) {
    List<SseEmitter> subscribers = emitters.remove(executionId);
    if (subscribers == null) {
      return;
    }
    subscribers.forEach(emitter -> {
      try {
        emitter.complete();
      } catch (IllegalStateException ignored) {
        // The client may already have disconnected.
      }
    });
  }

  private void remove(long executionId, SseEmitter emitter) {
    List<SseEmitter> subscribers = emitters.get(executionId);
    if (subscribers == null) {
      return;
    }
    subscribers.remove(emitter);
    if (subscribers.isEmpty()) {
      emitters.remove(executionId, subscribers);
    }
  }

  private static boolean terminal(String eventType) {
    return "EXECUTION_SUCCEEDED".equals(eventType)
        || "EXECUTION_FAILED".equals(eventType)
        || "EXECUTION_CANCELED".equals(eventType)
        || "EXECUTION_TIMED_OUT".equals(eventType)
        || "EXECUTION_LOST".equals(eventType);
  }

  @PreDestroy
  public void close() {
    emitters.values().forEach(values -> values.forEach(SseEmitter::complete));
    emitters.clear();
  }
}
