package io.yak.ops.business.development.api;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Draft;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Project;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Resource;
import io.yak.ops.business.development.domain.DataDevelopmentModel.Task;
import io.yak.ops.plugin.task.api.TaskPluginFactory.Descriptor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;

/** REST request and composite view contracts for data development. */
public final class DataDevelopmentApi {

  private DataDevelopmentApi() {
  }

  public record CreateProjectRequest(
      @NotBlank String code,
      @NotBlank String name,
      String description) {
  }

  public record CreateFolderRequest(
      Long parentId,
      @NotBlank String name,
      String description,
      Integer sortOrder) {
  }

  public record CreateTaskRequest(
      Long parentId,
      @NotBlank String name,
      String description,
      @NotBlank String taskType,
      String engineType,
      Integer sortOrder) {
  }

  public record UpdateResourceRequest(
      @NotBlank String name,
      String description,
      Integer sortOrder) {
  }

  public record MoveResourceRequest(
      Long parentId,
      Integer sortOrder) {
  }

  public record SaveDraftRequest(
      @NotNull @PositiveOrZero Long baseRevision,
      @NotNull JsonNode definition) {
  }

  public record ValidateTaskRequest(JsonNode definition) {
  }

  public record PublishTaskRequest(
      @NotNull @PositiveOrZero Long draftRevision,
      String comment) {
  }

  public record CreateExecutionRequest(
      @NotBlank String sourceType,
      Long draftRevision,
      Long taskVersionId,
      JsonNode definitionSnapshot,
      JsonNode runtime,
      JsonNode input,
      String idempotencyKey) {
  }

  public record TaskPluginView(Descriptor descriptor) {
  }

  public record TaskDetailView(
      Resource resource,
      Task task,
      Draft draft) {
  }

  /**
   * Complete authoring snapshot used by the web workbench.
   *
   * <p>The workspace endpoint deliberately returns task drafts in one request during the first
   * integration phase. The API can be split into lazy resource/document loading later without
   * changing the persisted task envelope.</p>
   */
  public record WorkspaceView(
      Project project,
      List<TaskDetailView> tasks) {
  }

  public record ValidationView(
      boolean valid,
      JsonNode normalizedDefinition,
      String contentDigest,
      List<String> warnings) {
  }
}
