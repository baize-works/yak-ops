package io.yak.ops.business.development.service;

import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.plugin.task.api.TaskPluginCatalog;
import io.yak.ops.plugin.task.api.TaskPluginFactory.Descriptor;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

/** Read facade for the installed task-plugin catalog. */
@ConditionalOnDataDevelopmentEnabled
@Service
public class TaskPluginCatalogService {

  private final TaskPluginCatalog catalog;

  public TaskPluginCatalogService(TaskPluginCatalog catalog) {
    this.catalog = catalog;
  }

  public List<Descriptor> list() {
    return catalog.descriptors().stream()
        .sorted(Comparator.comparing(Descriptor::category).thenComparing(Descriptor::name))
        .toList();
  }

  public Descriptor require(String taskType) {
    return catalog.descriptor(taskType);
  }
}
