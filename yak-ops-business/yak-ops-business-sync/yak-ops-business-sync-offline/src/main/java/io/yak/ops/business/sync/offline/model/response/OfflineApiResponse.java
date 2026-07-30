package io.yak.ops.business.sync.offline.model.response;

import lombok.Getter;

/** 离线同步模块统一响应。 */
@Getter
public final class OfflineApiResponse<T> {

  private static final int SUCCESS_CODE = 200;

  private final int code;
  private final String message;
  private final T data;

  private OfflineApiResponse(int code, String message, T data) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  public static <T> OfflineApiResponse<T> success(T data) {
    return new OfflineApiResponse<>(SUCCESS_CODE, "成功", data);
  }

  public static OfflineApiResponse<Void> success() {
    return success(null);
  }

  public static OfflineApiResponse<Void> failure(String message) {
    return new OfflineApiResponse<>(4001, message, null);
  }
}
