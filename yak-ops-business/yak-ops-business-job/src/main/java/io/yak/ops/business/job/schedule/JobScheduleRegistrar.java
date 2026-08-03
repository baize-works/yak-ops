package io.yak.ops.business.job.schedule;

/**
 * 业务调度计划注册器。
 *
 * <p>每种业务能力独立实现一个注册器，例如离线同步、工作流和数据质量。</p>
 */
public interface JobScheduleRegistrar {

  /**
   * 注册器类型，用于日志和故障定位。
   */
  String registrationType();

  /**
   * 将业务侧持久化计划同步到 Yak Schedule。
   */
  void synchronize();
}
