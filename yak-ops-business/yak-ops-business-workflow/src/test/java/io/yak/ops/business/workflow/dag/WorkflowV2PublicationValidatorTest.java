package io.yak.ops.business.workflow.dag;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2BindingSource;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Dag;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2InputBinding;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2Node;
import io.yak.ops.common.bean.entity.workflow.v2.WorkflowV2TaskReference;
import io.yak.ops.common.port.workflow.PublishedTaskVersionCatalog;
import io.yak.ops.common.port.workflow.PublishedTaskVersionCatalog.PublishedTaskVersion;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class WorkflowV2PublicationValidatorTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void acceptsPinnedPublishedVersionWithRequiredInputsBound() {
    WorkflowV2Node task = task();
    WorkflowV2BindingSource source = new WorkflowV2BindingSource();
    source.setType(WorkflowV2BindingSource.Type.START_INPUT);
    source.setPath("$.orderId");
    task.setInputBindings(List.of(new WorkflowV2InputBinding("orderId", source)));

    WorkflowV2PublicationValidator validator = new WorkflowV2PublicationValidator(
        List.of(catalog("HTTP", 3, "{\"required\":[\"orderId\"]}")));

    WorkflowV2Dag dag = new WorkflowV2Dag();
    dag.setNodes(List.of(task));
    assertDoesNotThrow(() -> validator.validate(dag));
  }

  @Test
  void rejectsMismatchedTaskType() {
    WorkflowV2PublicationValidator validator = new WorkflowV2PublicationValidator(
        List.of(catalog("SHELL", 3, "{}")));
    WorkflowV2Dag dag = new WorkflowV2Dag();
    dag.setNodes(List.of(task()));

    assertThrows(IllegalArgumentException.class, () -> validator.validate(dag));
  }

  @Test
  void rejectsMissingRequiredInputBinding() {
    WorkflowV2PublicationValidator validator = new WorkflowV2PublicationValidator(
        List.of(catalog("HTTP", 3, "{\"required\":[\"orderId\"]}")));
    WorkflowV2Dag dag = new WorkflowV2Dag();
    dag.setNodes(List.of(task()));

    assertThrows(IllegalArgumentException.class, () -> validator.validate(dag));
  }

  private PublishedTaskVersionCatalog catalog(
      String taskType,
      long versionNumber,
      String inputSchema) {
    return (taskId, versionId) -> Optional.of(new PublishedTaskVersion(
        taskId,
        versionId,
        versionNumber,
        taskType,
        read(inputSchema),
        mapper.createObjectNode(),
        "digest",
        LocalDateTime.now(),
        false));
  }

  private com.fasterxml.jackson.databind.JsonNode read(String value) {
    try {
      return mapper.readTree(value);
    } catch (Exception exception) {
      throw new IllegalArgumentException(exception);
    }
  }

  private static WorkflowV2Node task() {
    WorkflowV2Node node = new WorkflowV2Node();
    node.setKey("taskA");
    node.setName("taskA");
    node.setKind(WorkflowV2Node.Kind.TASK);
    node.setTaskRef(new WorkflowV2TaskReference("10", "20", 3, "HTTP"));
    return node;
  }
}
