package io.yak.ops.business.resource.service.impl;

import io.yak.ops.business.resource.config.ConditionalOnResourceEnabled;
import io.yak.ops.business.resource.config.ResourceProperties;
import io.yak.ops.business.resource.dao.ResourceDao;
import io.yak.ops.business.resource.exception.ResourceException;
import io.yak.ops.business.resource.storage.StorageOperatorRegistry;
import io.yak.ops.business.resource.sync.ResourceFileSyncDispatcher;
import io.yak.ops.business.resource.util.ResourcePathUtils;
import io.yak.ops.common.bean.dto.resource.ResourceQueryDTO;
import io.yak.ops.common.bean.po.resource.ResourcePO;
import io.yak.ops.common.bean.vo.resource.ResourceVO;
import io.yak.ops.common.enums.resource.ResourceErrorCode;
import io.yak.ops.common.enums.resource.ResourceNodeType;
import io.yak.ops.common.enums.resource.ResourceStorageType;
import io.yak.ops.spi.resource.ResourceFileSyncAction;
import io.yak.ops.spi.resource.ResourceFileSyncContext;
import io.yak.ops.spi.storage.StorageOperator;
import io.yak.ops.spi.storage.StoragePluginException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;

/** 资源服务共享的元数据、路径、存储异常与同步事件支持。 */
@Slf4j
@Component
@ConditionalOnResourceEnabled
@RequiredArgsConstructor
class ResourceServiceSupport {

  private final ResourceDao resourceDao;
  private final StorageOperatorRegistry storageRegistry;
  private final ResourceFileSyncDispatcher syncDispatcher;
  private final ResourceProperties properties;

  ParentContext parent(Long parentId) {
    Long normalized = normalizeParentId(parentId);
    if (normalized == 0L) {
      ResourceStorageType type = properties.getStorage().getType();
      storageRegistry.require(type);
      return new ParentContext(0L, "/", type);
    }
    ResourcePO parent = resourceDao.selectById(normalized);
    if (parent == null) {
      throw new ResourceException(ResourceErrorCode.PARENT_NOT_FOUND);
    }
    if (parent.getNodeType() != ResourceNodeType.DIRECTORY) {
      throw new ResourceException(ResourceErrorCode.PARENT_NOT_DIRECTORY);
    }
    return new ParentContext(parent.getId(), parent.getFullPath(), parent.getStorageType());
  }

  ResourcePO require(Long id) {
    if (id == null || id <= 0L) {
      throw new ResourceException(ResourceErrorCode.NOT_FOUND);
    }
    ResourcePO resource = resourceDao.selectById(id);
    if (resource == null) {
      throw new ResourceException(ResourceErrorCode.NOT_FOUND, String.valueOf(id));
    }
    return resource;
  }

  ResourcePO requireFile(Long id) {
    ResourcePO resource = require(id);
    if (resource.getNodeType() != ResourceNodeType.FILE) {
      throw new ResourceException(ResourceErrorCode.DIRECTORY_CONTENT_UNSUPPORTED);
    }
    return resource;
  }

  void ensureNameAvailable(Long parentId, String name, Long excludeId) {
    if (resourceDao.existsByParentAndName(normalizeParentId(parentId), name, excludeId)) {
      throw new ResourceException(ResourceErrorCode.DUPLICATE_NAME, name);
    }
  }

  ResourceQueryDTO normalizeQuery(ResourceQueryDTO queryDTO) {
    ResourceQueryDTO normalized = queryDTO == null ? new ResourceQueryDTO() : queryDTO;
    normalized.setKeyword(trimToNull(normalized.getKeyword()));
    if (StringUtils.hasText(normalized.getNodeType())) {
      String nodeType = normalized.getNodeType().trim().toUpperCase(Locale.ROOT);
      try {
        ResourceNodeType.valueOf(nodeType);
      } catch (IllegalArgumentException exception) {
        throw new ResourceException(ResourceErrorCode.INVALID_NODE_TYPE, nodeType);
      }
      normalized.setNodeType(nodeType);
    }
    return normalized;
  }

  ResourcePO newResource(
      Long parentId,
      String name,
      String fullPath,
      ResourceNodeType nodeType,
      ResourceStorageType storageType,
      String storagePath,
      String contentType,
      String suffix,
      Long fileSize,
      String checksum,
      String description) {
    LocalDateTime now = LocalDateTime.now();
    ResourcePO resource = new ResourcePO();
    resource.setParentId(normalizeParentId(parentId));
    resource.setName(name);
    resource.setFullPath(fullPath);
    resource.setNodeType(nodeType);
    resource.setStorageType(storageType);
    resource.setStoragePath(storagePath);
    resource.setContentType(contentType);
    resource.setSuffix(suffix);
    resource.setFileSize(fileSize == null ? 0L : fileSize);
    resource.setChecksum(checksum);
    resource.setDescription(trimToNull(description));
    resource.setVersion(1);
    resource.setGitSyncStatus("NONE");
    resource.setCreateTime(now);
    resource.setUpdateTime(now);
    return resource;
  }

  void insert(ResourcePO resource) {
    if (resourceDao.insert(resource) <= 0) {
      throw new ResourceException(ResourceErrorCode.CREATE_FAILED);
    }
  }

  void relocate(ResourcePO resource, ParentContext targetParent, String targetName) {
    if (resource.getId().equals(targetParent.id)) {
      throw new ResourceException(ResourceErrorCode.INVALID_MOVE_TARGET);
    }
    if (targetParent.storageType != resource.getStorageType()) {
      throw new ResourceException(ResourceErrorCode.CROSS_STORAGE_MOVE_UNSUPPORTED);
    }
    String oldFullPath = resource.getFullPath();
    String newFullPath = ResourcePathUtils.childPath(targetParent.fullPath, targetName);
    if (newFullPath.equals(oldFullPath)) {
      resource.setName(targetName);
      resource.setParentId(targetParent.id);
      return;
    }
    if (newFullPath.startsWith(oldFullPath + "/")) {
      throw new ResourceException(ResourceErrorCode.INVALID_MOVE_TARGET);
    }
    String oldStoragePath = resource.getStoragePath();
    String newStoragePath = ResourcePathUtils.storagePath(newFullPath);
    StorageOperator operator = storageRegistry.require(resource.getStorageType());
    storageRun(() -> operator.move(oldStoragePath, newStoragePath, false));

    List<ResourcePO> updates = new ArrayList<>();
    resource.setParentId(targetParent.id);
    resource.setName(targetName);
    resource.setFullPath(newFullPath);
    resource.setStoragePath(newStoragePath);
    resource.setVersion(nextVersion(resource));
    resource.setUpdateTime(LocalDateTime.now());
    updates.add(resource);

    if (resource.getNodeType() == ResourceNodeType.DIRECTORY) {
      for (ResourcePO descendant : resourceDao.selectDescendants(oldFullPath)) {
        String suffix = descendant.getFullPath().substring(oldFullPath.length());
        descendant.setFullPath(newFullPath + suffix);
        descendant.setStoragePath(ResourcePathUtils.storagePath(descendant.getFullPath()));
        descendant.setVersion(nextVersion(descendant));
        descendant.setUpdateTime(LocalDateTime.now());
        updates.add(descendant);
      }
    }

    if (!resourceDao.updateBatch(updates)) {
      try {
        operator.move(newStoragePath, oldStoragePath, false);
      } catch (RuntimeException rollbackException) {
        log.error("Failed to rollback storage move: {} -> {}",
            newStoragePath, oldStoragePath, rollbackException);
      }
      throw new ResourceException(ResourceErrorCode.UPDATE_FAILED);
    }
  }

  ResourceVO toVO(ResourcePO resource) {
    return ResourceVO.builder()
        .id(resource.getId())
        .parentId(resource.getParentId())
        .name(resource.getName())
        .fullPath(resource.getFullPath())
        .nodeType(resource.getNodeType())
        .storageType(resource.getStorageType())
        .contentType(resource.getContentType())
        .suffix(resource.getSuffix())
        .fileSize(resource.getFileSize())
        .checksum(resource.getChecksum())
        .description(resource.getDescription())
        .version(resource.getVersion())
        .gitSyncStatus(resource.getGitSyncStatus())
        .createTime(resource.getCreateTime())
        .updateTime(resource.getUpdateTime())
        .build();
  }

  void dispatch(ResourcePO resource, ResourceFileSyncAction action, String oldFullPath) {
    syncDispatcher.dispatchAfterCommit(ResourceFileSyncContext.builder()
        .resourceId(resource.getId())
        .action(action)
        .nodeType(resource.getNodeType())
        .storageType(resource.getStorageType())
        .oldFullPath(oldFullPath)
        .fullPath(resource.getFullPath())
        .storagePath(resource.getStoragePath())
        .version(resource.getVersion())
        .build());
  }

  void storageRun(Runnable operation) {
    try {
      operation.run();
    } catch (ResourceException exception) {
      throw exception;
    } catch (StoragePluginException exception) {
      throw storageException(exception);
    } catch (RuntimeException exception) {
      throw storageException(exception);
    }
  }

  <T> T storageGet(StorageSupplier<T> operation) {
    try {
      return operation.get();
    } catch (ResourceException exception) {
      throw exception;
    } catch (StoragePluginException exception) {
      throw storageException(exception);
    } catch (RuntimeException exception) {
      throw storageException(exception);
    }
  }

  void cleanupCreatedObject(StorageOperator operator, String storagePath, boolean recursive) {
    try {
      operator.delete(storagePath, recursive);
    } catch (RuntimeException cleanupException) {
      log.warn("Failed to cleanup storage object after persistence failure: {}",
          storagePath, cleanupException);
    }
  }

  void runAfterCommit(Runnable action) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      action.run();
      return;
    }
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override
      public void afterCommit() {
        action.run();
      }
    });
  }

  Long normalizeParentId(Long parentId) {
    return parentId == null || parentId <= 0L ? 0L : parentId;
  }

  int nextVersion(ResourcePO resource) {
    return resource.getVersion() == null ? 1 : resource.getVersion() + 1;
  }

  String trimToNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private ResourceException storageException(RuntimeException exception) {
    return new ResourceException(
        ResourceErrorCode.STORAGE_OPERATION_FAILED,
        exception.getMessage(),
        exception);
  }

  @FunctionalInterface
  interface StorageSupplier<T> {
    T get();
  }

  static final class ParentContext {

    final Long id;
    final String fullPath;
    final ResourceStorageType storageType;

    ParentContext(Long id, String fullPath, ResourceStorageType storageType) {
      this.id = Objects.requireNonNull(id, "parent id");
      this.fullPath = Objects.requireNonNull(fullPath, "parent full path");
      this.storageType = Objects.requireNonNull(storageType, "parent storage type");
    }
  }
}
