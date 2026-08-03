package io.yak.ops.business.sync.offline.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.framework.common.Result;
import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationAuthenticator;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.DeregisterRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.HeartbeatRequest;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.LeaseResponse;
import io.yak.ops.business.sync.offline.worker.OfflineWorkerRegistrationModels.RegisterRequest;
import io.yak.ops.business.sync.offline.worker.RestartAwareOfflineWorkerRegistrationFacade;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Link-Up Worker 主动注册、心跳续租与优雅注销接口。 */
@ConditionalOnOfflineSyncEnabled
@RestController
@RequestMapping("/api/v1/offline/worker-registration")
public class OfflineWorkerRegistrationController {

  private final OfflineWorkerRegistrationAuthenticator authenticator;
  private final RestartAwareOfflineWorkerRegistrationFacade service;
  private final ObjectMapper objectMapper;

  public OfflineWorkerRegistrationController(
      OfflineWorkerRegistrationAuthenticator authenticator,
      RestartAwareOfflineWorkerRegistrationFacade service,
      @Qualifier("offlineSyncJsonMapper") ObjectMapper objectMapper) {
    this.authenticator = authenticator;
    this.service = service;
    this.objectMapper = objectMapper;
  }

  @PostMapping(value = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
  public Result<LeaseResponse> register(
      HttpServletRequest servletRequest,
      @RequestBody String body) {
    authenticator.authenticate(servletRequest, body);
    RegisterRequest request = read(body, RegisterRequest.class);
    return Result.success(service.register(request, remoteAddress(servletRequest)));
  }

  @PostMapping(value = "/heartbeat", consumes = MediaType.APPLICATION_JSON_VALUE)
  public Result<LeaseResponse> heartbeat(
      HttpServletRequest servletRequest,
      @RequestBody String body) {
    authenticator.authenticate(servletRequest, body);
    HeartbeatRequest request = read(body, HeartbeatRequest.class);
    return Result.success(service.heartbeat(request, remoteAddress(servletRequest)));
  }

  @PostMapping(value = "/deregister", consumes = MediaType.APPLICATION_JSON_VALUE)
  public Result<Boolean> deregister(
      HttpServletRequest servletRequest,
      @RequestBody String body) {
    authenticator.authenticate(servletRequest, body);
    DeregisterRequest request = read(body, DeregisterRequest.class);
    return Result.success(service.deregister(request, remoteAddress(servletRequest)));
  }

  private <T> T read(String body, Class<T> type) {
    try {
      return objectMapper.readValue(body, type);
    } catch (JsonProcessingException exception) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "动态 Worker 注册 JSON 格式不正确",
          exception);
    }
  }

  private String remoteAddress(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.trim().isEmpty()) {
      int comma = forwarded.indexOf(',');
      return (comma >= 0 ? forwarded.substring(0, comma) : forwarded).trim();
    }
    return request.getRemoteAddr();
  }
}
