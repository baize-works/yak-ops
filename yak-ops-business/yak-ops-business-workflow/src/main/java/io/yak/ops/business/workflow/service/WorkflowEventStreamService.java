package io.yak.ops.business.workflow.service;

import io.yak.ops.business.workflow.model.WorkflowInstanceVO;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** 工作流实例状态 SSE 推送。 */
@Service
public class WorkflowEventStreamService {

  private static final Logger log = LoggerFactory.getLogger(WorkflowEventStreamService.class);
  private static final long STREAM_TIMEOUT_MILLIS = Duration.ofHours(1).toMillis();
  private static final String EVENT_NAME = "workflow";

  private final ConcurrentMap<String, CopyOnWriteArrayList<SseEmitter>> emitters =
      new ConcurrentHashMap<>();

  public SseEmitter subscribe(String executionId, WorkflowInstanceVO snapshot) {
    SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MILLIS);
    CopyOnWriteArrayList<SseEmitter> executionEmitters =
        emitters.computeIfAbsent(executionId, ignored -> new CopyOnWriteArrayList<>());
    executionEmitters.add(emitter);

    Runnable cleanup = () -> remove(executionId, emitter);
    emitter.onCompletion(cleanup);
    emitter.onTimeout(cleanup);
    emitter.onError(ignored -> cleanup.run());

    if (!send(executionId, emitter, snapshot)) {
      return emitter;
    }
    if (isTerminal(snapshot.status())) {
      cleanup.run();
      emitter.complete();
    }
    return emitter;
  }

  public void publish(WorkflowInstanceVO snapshot) {
    List<SseEmitter> executionEmitters = emitters.get(snapshot.id());
    if (executionEmitters == null || executionEmitters.isEmpty()) {
      return;
    }

    for (SseEmitter emitter : executionEmitters) {
      send(snapshot.id(), emitter, snapshot);
    }

    if (isTerminal(snapshot.status())) {
      CopyOnWriteArrayList<SseEmitter> terminalEmitters = emitters.remove(snapshot.id());
      if (terminalEmitters != null) {
        terminalEmitters.forEach(SseEmitter::complete);
      }
    }
  }

  private boolean send(
      String executionId,
      SseEmitter emitter,
      WorkflowInstanceVO snapshot) {
    try {
      emitter.send(SseEmitter.event()
          .name(EVENT_NAME)
          .id(Long.toString(System.nanoTime()))
          .data(snapshot));
      return true;
    } catch (IOException | IllegalStateException exception) {
      remove(executionId, emitter);
      log.debug(
          "[workflow] SSE client disconnected execution={}, message={}",
          executionId,
          exception.getMessage());
      return false;
    }
  }

  private void remove(String executionId, SseEmitter emitter) {
    emitters.computeIfPresent(executionId, (ignored, executionEmitters) -> {
      executionEmitters.remove(emitter);
      return executionEmitters.isEmpty() ? null : executionEmitters;
    });
  }

  private boolean isTerminal(String status) {
    return "SUCCESS".equals(status)
        || "SUCCESS_WITH_WARNINGS".equals(status)
        || "FAILED".equals(status)
        || "WARNING".equals(status)
        || "CANCELED".equals(status)
        || "TIMED_OUT".equals(status);
  }
}
