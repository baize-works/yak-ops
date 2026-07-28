package io.yak.ops.common.enums.datasource;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 数据源连通状态。 */
@Getter
@RequiredArgsConstructor
public enum DataSourceConnStatus {

  UNKNOWN("未测试"),
  CONNECTED("连接可用"),
  DISCONNECTED("连接不可用");

  private final String displayName;
}
