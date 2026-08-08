package io.yak.ops.business.job.task;

import static org.assertj.core.api.Assertions.assertThat;

import io.yak.ops.common.bean.vo.sync.offline.OfflineJobDefinitionVO;
import org.junit.jupiter.api.Test;

class InMemoryTaskRegistryTest {

  @Test
  void shouldOnlyExposeOnlineTasksWithSchedulePaused() {
    assertThat(InMemoryTaskRegistry.isWorkflowEligible(task("ONLINE", "PAUSED"))).isTrue();

    assertThat(InMemoryTaskRegistry.isWorkflowEligible(task("OFFLINE", "PAUSED"))).isFalse();
    assertThat(InMemoryTaskRegistry.isWorkflowEligible(task("ONLINE", "NORMAL"))).isFalse();
  }

  @Test
  void shouldRejectIncompleteTaskMetadata() {
    assertThat(InMemoryTaskRegistry.isWorkflowEligible(null)).isFalse();
    assertThat(InMemoryTaskRegistry.isWorkflowEligible(
        OfflineJobDefinitionVO.builder()
            .jobName("未完成任务")
            .releaseState("ONLINE")
            .scheduleStatus("PAUSED")
            .build())).isFalse();
  }

  private OfflineJobDefinitionVO task(String releaseState, String scheduleStatus) {
    return OfflineJobDefinitionVO.builder()
        .id(1001L)
        .jobName("用户数据同步")
        .releaseState(releaseState)
        .scheduleStatus(scheduleStatus)
        .build();
  }
}
