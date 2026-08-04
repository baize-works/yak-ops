package io.yak.ops.business.development.service;

import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskPage;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskVersionView;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.SortBy;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.TaskLibraryQuery;
import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.repository.WorkflowTaskLibraryRepository;
import io.yak.ops.business.development.repository.WorkflowTaskLibraryRepository.SearchCriteria;
import io.yak.ops.business.development.repository.WorkflowTaskLibraryRepository.SearchResult;
import java.util.Locale;
import org.springframework.stereotype.Service;

/** Application boundary for Workflow's read-only published task library. */
@ConditionalOnDataDevelopmentEnabled
@Service
public final class WorkflowTaskLibraryService {

  private static final int DEFAULT_LIMIT = 50;
  private static final int MAX_LIMIT = 100;

  private final WorkflowTaskLibraryRepository repository;

  public WorkflowTaskLibraryService(WorkflowTaskLibraryRepository repository) {
    this.repository = repository;
  }

  public PublishedTaskPage search(TaskLibraryQuery query, String operator) {
    TaskLibraryQuery source = query == null
        ? new TaskLibraryQuery(null, null, null, null, null, null, null, null, null)
        : query;
    boolean recentlyUsed = Boolean.TRUE.equals(source.recentlyUsed());
    SortBy sortBy = source.sortBy() == null
        ? (recentlyUsed ? SortBy.RECENTLY_USED : SortBy.UPDATED_AT)
        : source.sortBy();
    SearchCriteria criteria = new SearchCriteria(
        positiveOrNull(source.projectId(), "projectId"),
        nonNegativeOrNull(source.folderId(), "folderId"),
        upperOrNull(source.taskType()),
        lowerOrNull(source.keyword()),
        Boolean.TRUE.equals(source.favoriteOnly()),
        recentlyUsed,
        sortBy,
        Math.max(0, source.offset() == null ? 0 : source.offset()),
        normalizeLimit(source.limit()),
        normalizeOperator(operator));
    SearchResult result = repository.search(criteria);
    return new PublishedTaskPage(
        result.items(),
        result.total(),
        criteria.offset(),
        criteria.limit());
  }

  public PublishedTaskVersionView getPublishedVersion(
      long taskId,
      long versionId,
      String operator) {
    if (taskId <= 0L) {
      throw new IllegalArgumentException("taskId 必须为正整数");
    }
    if (versionId <= 0L) {
      throw new IllegalArgumentException("versionId 必须为正整数");
    }
    return repository.findPublishedVersion(taskId, versionId, normalizeOperator(operator))
        .orElseThrow(() -> new IllegalArgumentException(
            "已发布任务版本不存在或不可用于工作流：taskId=" + taskId
                + "，versionId=" + versionId));
  }

  private static int normalizeLimit(Integer value) {
    if (value == null) {
      return DEFAULT_LIMIT;
    }
    return Math.min(MAX_LIMIT, Math.max(1, value));
  }

  private static Long positiveOrNull(Long value, String field) {
    if (value == null) {
      return null;
    }
    if (value <= 0L) {
      throw new IllegalArgumentException(field + " 必须为正整数");
    }
    return value;
  }

  private static Long nonNegativeOrNull(Long value, String field) {
    if (value == null) {
      return null;
    }
    if (value < 0L) {
      throw new IllegalArgumentException(field + " 不能小于 0");
    }
    return value;
  }

  private static String upperOrNull(String value) {
    String text = trimToNull(value);
    return text == null ? null : text.toUpperCase(Locale.ROOT);
  }

  private static String lowerOrNull(String value) {
    String text = trimToNull(value);
    return text == null ? null : text.toLowerCase(Locale.ROOT);
  }

  private static String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String text = value.trim();
    return text.isEmpty() ? null : text;
  }

  private static String normalizeOperator(String operator) {
    String text = trimToNull(operator);
    return text == null ? "system" : text;
  }
}
