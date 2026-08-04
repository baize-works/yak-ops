package io.yak.ops.business.workflow.dag;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.ops.business.workflow.config.ConditionalOnWorkflowEnabled;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Dag;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Node;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2TaskReference;
import io.yak.ops.common.port.workflow.PublishedTaskVersionCatalog;
import io.yak.ops.common.port.workflow.PublishedTaskVersionCatalog.PublishedTaskVersion;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Validates every Workflow V2 task reference immediately before publication. */
@ConditionalOnWorkflowEnabled
@Component
public final class WorkflowV2PublicationValidator {

  private final List<PublishedTaskVersionCatalog> catalogs;

  public WorkflowV2PublicationValidator(List<PublishedTaskVersionCatalog> catalogs) {
    this.catalogs = catalogs == null ? List.of() : List.copyOf(catalogs);
  }

  public void validate(WorkflowV2Dag dag) {
    List<WorkflowV2Node> taskNodes = dag.getNodes().stream()
        .filter(node -> node.getKind() == WorkflowV2Node.Kind.TASK)
        .toList();
    if (taskNodes.isEmpty()) {
      return;
    }
    if (catalogs.isEmpty()) {
      throw new IllegalStateException(
          "Workflow V2 发布校验不可用：未装配已发布任务版本目录");
    }
    if (catalogs.size() > 1) {
      throw new IllegalStateException(
          "Workflow V2 发布校验配置错误：存在多个已发布任务版本目录");
    }
    PublishedTaskVersionCatalog catalog = catalogs.get(0);
    taskNodes.forEach(node -> validateTaskNode(node, catalog));
  }

  private static void validateTaskNode(
      WorkflowV2Node node,
      PublishedTaskVersionCatalog catalog) {
    WorkflowV2TaskReference ref = node.getTaskRef();
    long taskId = Long.parseLong(ref.getTaskId());
    long versionId = Long.parseLong(ref.getTaskVersionId());
    PublishedTaskVersion version = catalog.findPublishedVersion(taskId, versionId)
        .orElseThrow(() -> new IllegalArgumentException(
            "节点引用的已发布任务版本不存在或不可用：" + node.getKey()
                + "，taskId=" + taskId + "，versionId=" + versionId));
    if (version.versionNumber() != ref.getTaskVersionNumber()) {
      throw new IllegalArgumentException(
          "节点任务版本号不匹配：" + node.getKey() + "，引用="
              + ref.getTaskVersionNumber() + "，实际=" + version.versionNumber());
    }
    String actualType = version.taskType() == null
        ? "" : version.taskType().trim().toUpperCase(Locale.ROOT);
    if (!actualType.equals(ref.getTaskType())) {
      throw new IllegalArgumentException(
          "节点任务类型不匹配：" + node.getKey() + "，引用="
              + ref.getTaskType() + "，实际=" + actualType);
    }
    validateRequiredInputs(node, version.inputSchema());
  }

  private static void validateRequiredInputs(WorkflowV2Node node, JsonNode inputSchema) {
    if (inputSchema == null || !inputSchema.isObject()) return;
    JsonNode required = inputSchema.path("required");
    if (!required.isArray()) return;
    Set<String> boundTargets = new LinkedHashSet<>();
    node.getInputBindings().forEach(binding -> boundTargets.add(binding.getTarget()));
    for (JsonNode item : required) {
      if (item.isTextual() && !boundTargets.contains(item.asText())) {
        throw new IllegalArgumentException(
            "节点必填输入未绑定：" + node.getKey() + "/" + item.asText());
      }
    }
  }
}
