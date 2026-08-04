package io.yak.ops.common.port.workflow;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Read-only port used by Workflow to validate immutable data-development task versions.
 *
 * <p>The contract intentionally excludes task definitions, compiled specs and runtime secrets.
 */
public interface PublishedTaskVersionCatalog {

  Optional<PublishedTaskVersion> findPublishedVersion(long taskId, long versionId);

  record PublishedTaskVersion(
      long taskId,
      long versionId,
      long versionNumber,
      String taskType,
      JsonNode inputSchema,
      JsonNode outputSchema,
      String contentDigest,
      LocalDateTime publishedAt,
      boolean currentVersion) {
  }
}
