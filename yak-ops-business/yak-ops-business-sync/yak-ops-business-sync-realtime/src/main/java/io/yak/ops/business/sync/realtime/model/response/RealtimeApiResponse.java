package io.yak.ops.business.sync.realtime.model.response;

import lombok.Getter;

/** 实时同步模块统一响应。 */
@Getter
public final class RealtimeApiResponse<T> {

  private final int code;
  private final String message;
  private final T data;

  private RealtimeApiResponse(int code, String message, T data) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  public static <T> RealtimeApiResponse<T> success(T data) {
    return new RealtimeApiResponse<>(0, "success", data);
  }

  public static RealtimeApiResponse<Void> success() {
    return success(null);
  }

  public static RealtimeApiResponse<Void> failure(String message) {
    return new RealtimeApiResponse<>(4001, message, null);
  }
}
