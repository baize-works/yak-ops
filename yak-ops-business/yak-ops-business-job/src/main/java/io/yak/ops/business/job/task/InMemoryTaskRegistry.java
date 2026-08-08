package io.yak.ops.business.job.task;

import io.yak.framework.common.PagingData;
import io.yak.ops.business.sync.offline.service.OfflineJobDefinitionService;
import io.yak.ops.common.bean.dto.sync.offline.OfflineJobDefinitionQueryDTO;
import io.yak.ops.common.bean.vo.sync.offline.OfflineJobDefinitionVO;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

/**
 * 第一阶段任务注册表。
 *
 * <p>注册表本身仅保存在内存中，数据同步任务元数据从现有离线同步定义服务投影而来，
 * 不新增任务表，也不复制同步任务的具体配置。</p>
 */
@Service
public class InMemoryTaskRegistry implements TaskRegistry {

  private static final int PAGE_SIZE = 200;

  private final ObjectProvider<OfflineJobDefinitionService> definitionServiceProvider;
  private final ConcurrentMap<String, TaskDefinition> tasks = new ConcurrentHashMap<>();

  public InMemoryTaskRegistry(
      ObjectProvider<OfflineJobDefinitionService> definitionServiceProvider) {
    this.definitionServiceProvider = definitionServiceProvider;
  }

  @Override
  public List<TaskDefinition> list() {
    refresh();
    return tasks.values().stream()
        .sorted(Comparator.comparing(TaskDefinition::name))
        .toList();
  }

  @Override
  public TaskDefinition get(String taskId) {
    if (taskId == null || taskId.isBlank()) {
      throw new IllegalArgumentException("taskId 不能为空");
    }
    refresh();
    TaskDefinition task = tasks.get(taskId.trim());
    if (task == null) {
      throw new IllegalArgumentException("任务不存在或尚不可执行：" + taskId);
    }
    return task;
  }

  private void refresh() {
    OfflineJobDefinitionService service = definitionServiceProvider.getIfAvailable();
    if (service == null) {
      tasks.clear();
      return;
    }

    Map<String, TaskDefinition> snapshot = new LinkedHashMap<>();
    int pageNo = 1;
    while (true) {
      OfflineJobDefinitionQueryDTO query = new OfflineJobDefinitionQueryDTO();
      query.setCurrent(pageNo);
      query.setPageSize(PAGE_SIZE);
      PagingData<OfflineJobDefinitionVO> page = service.page(query);
      for (OfflineJobDefinitionVO definition : page.getBizData()) {
        if (definition.getId() == null || definition.getJobName() == null) {
          continue;
        }
        try {
          service.resolveLogicalJobSpec(service.require(definition.getId()));
          String id = String.valueOf(definition.getId());
          snapshot.put(id, new TaskDefinition(id, definition.getJobName(), "SYNC"));
        } catch (RuntimeException ignored) {
          // 草稿或没有可执行 JobSpec 的同步任务不进入工作流任务列表。
        }
      }
      if (page.getPagination() == null || pageNo >= page.getPagination().getPages()) {
        break;
      }
      pageNo++;
    }

    tasks.clear();
    tasks.putAll(snapshot);
  }
}
