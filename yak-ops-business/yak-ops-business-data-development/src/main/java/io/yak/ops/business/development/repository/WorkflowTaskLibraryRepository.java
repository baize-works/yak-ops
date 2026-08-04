package io.yak.ops.business.development.repository;

import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskItem;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskVersionView;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.SortBy;
import java.util.List;
import java.util.Optional;

/** Read-only persistence boundary used by Workflow task selection. */
public interface WorkflowTaskLibraryRepository {

  SearchResult search(SearchCriteria criteria);

  Optional<PublishedTaskVersionView> findPublishedVersion(
      long taskId,
      long versionId,
      String operator);

  record SearchCriteria(
      Long projectId,
      Long folderId,
      String taskType,
      String keyword,
      boolean favoriteOnly,
      boolean recentlyUsed,
      SortBy sortBy,
      int offset,
      int limit,
      String operator) {
  }

  record SearchResult(List<PublishedTaskItem> items, long total) {

    public SearchResult {
      items = items == null ? List.of() : List.copyOf(items);
    }
  }
}
