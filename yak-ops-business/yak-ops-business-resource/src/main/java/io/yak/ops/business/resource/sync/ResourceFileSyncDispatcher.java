package io.yak.ops.business.resource.sync;

import io.yak.ops.business.resource.config.ConditionalOnResourceEnabled;
import io.yak.ops.spi.resource.ResourceFileSyncContext;
import io.yak.ops.spi.resource.ResourceFileSyncProvider;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** 资源变更事件分发器；当前没有 Git 实现时自动为空操作。 */
@Slf4j
@Component
@ConditionalOnResourceEnabled
public class ResourceFileSyncDispatcher {

  private final List<ResourceFileSyncProvider> providers;

  public ResourceFileSyncDispatcher(List<ResourceFileSyncProvider> providers) {
    this.providers = providers;
  }

  public void dispatchAfterCommit(ResourceFileSyncContext context) {
    if (context == null || providers.isEmpty()) {
      return;
    }
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override
        public void afterCommit() {
          dispatch(context);
        }
      });
      return;
    }
    dispatch(context);
  }

  private void dispatch(ResourceFileSyncContext context) {
    for (ResourceFileSyncProvider provider : providers) {
      try {
        provider.synchronize(context);
      } catch (RuntimeException exception) {
        log.warn(
            "Resource sync provider {} failed for resource {}",
            provider.type(),
            context.getResourceId(),
            exception);
      }
    }
  }
}
