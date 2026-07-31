package io.yak.ops.spi.resource;

/**
 * 资源文件外部同步扩展点。
 *
 * <p>Git/DataOps 文件集成后续只需实现该接口并注册为 Spring Bean，资源业务无需修改。
 */
public interface ResourceFileSyncProvider {

  /** 同步提供方唯一名称，例如 git。 */
  String type();

  /** 消费一次资源变更事件。 */
  void synchronize(ResourceFileSyncContext context);
}
