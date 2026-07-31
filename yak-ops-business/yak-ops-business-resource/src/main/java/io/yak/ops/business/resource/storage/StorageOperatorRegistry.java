package io.yak.ops.business.resource.storage;

import io.yak.ops.business.resource.config.ConditionalOnResourceEnabled;
import io.yak.ops.business.resource.config.ResourceProperties;
import io.yak.ops.business.resource.exception.ResourceException;
import io.yak.ops.common.bean.vo.resource.ResourceStoragePluginVO;
import io.yak.ops.common.enums.resource.ResourceErrorCode;
import io.yak.ops.common.enums.resource.ResourceStorageType;
import io.yak.ops.spi.storage.StorageOperator;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** 已安装资源存储插件注册表。 */
@Component
@ConditionalOnResourceEnabled
public class StorageOperatorRegistry {

  private final Map<ResourceStorageType, StorageOperator> operators;
  private final ResourceProperties properties;

  public StorageOperatorRegistry(
      List<StorageOperator> storageOperators,
      ResourceProperties properties) {
    this.properties = properties;
    Map<ResourceStorageType, StorageOperator> mapped =
        new EnumMap<>(ResourceStorageType.class);
    for (StorageOperator operator : storageOperators) {
      StorageOperator previous = mapped.put(operator.type(), operator);
      if (previous != null) {
        throw new IllegalStateException("重复的资源存储插件：" + operator.type());
      }
    }
    this.operators = Collections.unmodifiableMap(mapped);
  }

  public StorageOperator require(ResourceStorageType type) {
    ResourceStorageType effective = type == null ? properties.getStorage().getType() : type;
    StorageOperator operator = operators.get(effective);
    if (operator == null) {
      throw new ResourceException(
          ResourceErrorCode.STORAGE_PLUGIN_NOT_FOUND,
          effective == null ? "未配置默认存储类型" : effective.name());
    }
    return operator;
  }

  public List<ResourceStoragePluginVO> list() {
    List<ResourceStoragePluginVO> plugins = new ArrayList<>();
    ResourceStorageType activeType = properties.getStorage().getType();
    for (StorageOperator operator : operators.values()) {
      plugins.add(ResourceStoragePluginVO.builder()
          .type(operator.type())
          .name(operator.name())
          .active(operator.type() == activeType)
          .build());
    }
    return plugins;
  }
}
