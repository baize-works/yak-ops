package io.yak.ops.business.development.api;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.List;

/** Read-only contracts exposed to Workflow for selecting immutable published tasks. */
public final class WorkflowTaskLibraryApi {

  private WorkflowTaskLibraryApi() {
  }

  public enum SortBy {
    UPDATED_AT,
    PUBLISHED_AT,
    RECENTLY_USED
  }

  public record TaskLibraryQuery(
      Long projectId,
      Long folderId,
      String taskType,
      String keyword,
      Boolean favoriteOnly,
      Boolean recentlyUsed,
      SortBy sortBy,
      Integer offset,
      Integer limit) {
  }

  public record PublishedTaskItem(
      String taskId,
      String name,
      String description,
      String projectId,
      String projectCode,
      String projectName,
      String folderId,
      String folderName,
      String taskType,
      String engineType,
      String publishedVersionId,
      int publishedVersionNumber,
      String pluginVersion,
      int schemaVersion,
      JsonNode inputSchema,
      JsonNode outputSchema,
      String contentDigest,
      String publishedBy,
      LocalDateTime publishedAt,
      LocalDateTime updatedAt,
      boolean favorite,
      LocalDateTime lastUsedAt) {
  }

  public record PublishedTaskPage(
      List<PublishedTaskItem> items,
      long total,
      int offset,
      int limit) {

    public PublishedTaskPage {
      items = items == null ? List.of() : List.copyOf(items);
    }
  }

  public record PublishedTaskVersionView(
      String taskId,
      String taskName,
      String projectId,
      String projectName,
      String taskType,
      String engineType,
      String versionId,
      int versionNumber,
      String pluginVersion,
      int schemaVersion,
      JsonNode inputSchema,
      JsonNode outputSchema,
      String contentDigest,
      String publishedBy,
      LocalDateTime publishedAt,
      boolean currentVersion) {
  }
}
