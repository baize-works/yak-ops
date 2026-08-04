package io.yak.ops.business.development.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskItem;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskPage;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskVersionView;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.SortBy;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.TaskLibraryQuery;
import io.yak.ops.business.development.repository.WorkflowTaskLibraryRepository;
import io.yak.ops.business.development.repository.WorkflowTaskLibraryRepository.SearchCriteria;
import io.yak.ops.business.development.repository.WorkflowTaskLibraryRepository.SearchResult;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class WorkflowTaskLibraryServiceTest {

  private static final ObjectMapper JSON = new ObjectMapper();

  @Test
  void normalizesFiltersAndUsesRecentOrdering() {
    CapturingRepository repository = new CapturingRepository();
    repository.searchResult = new SearchResult(List.of(item()), 1L);
    WorkflowTaskLibraryService service = new WorkflowTaskLibraryService(repository);

    PublishedTaskPage page = service.search(
        new TaskLibraryQuery(
            10L,
            0L,
            " http ",
            " Order API ",
            true,
            true,
            null,
            -5,
            500),
        " bruce ");

    SearchCriteria criteria = repository.criteria;
    assertEquals(10L, criteria.projectId());
    assertEquals(0L, criteria.folderId());
    assertEquals("HTTP", criteria.taskType());
    assertEquals("order api", criteria.keyword());
    assertTrue(criteria.favoriteOnly());
    assertTrue(criteria.recentlyUsed());
    assertEquals(SortBy.RECENTLY_USED, criteria.sortBy());
    assertEquals(0, criteria.offset());
    assertEquals(100, criteria.limit());
    assertEquals("bruce", criteria.operator());
    assertEquals(1L, page.total());
    assertEquals("1001", page.items().getFirst().taskId());
  }

  @Test
  void rejectsInvalidProjectId() {
    WorkflowTaskLibraryService service = new WorkflowTaskLibraryService(
        new CapturingRepository());

    IllegalArgumentException exception = assertThrows(
        IllegalArgumentException.class,
        () -> service.search(
            new TaskLibraryQuery(-1L, null, null, null, null, null, null, null, null),
            "admin"));

    assertTrue(exception.getMessage().contains("projectId"));
  }

  @Test
  void returnsOnlyRepositoryApprovedPublishedVersion() {
    CapturingRepository repository = new CapturingRepository();
    PublishedTaskVersionView version = version();
    repository.version = Optional.of(version);
    WorkflowTaskLibraryService service = new WorkflowTaskLibraryService(repository);

    assertEquals(version, service.getPublishedVersion(1001L, 2003L, "admin"));
    assertEquals(1001L, repository.taskId);
    assertEquals(2003L, repository.versionId);
  }

  @Test
  void reportsUnavailablePublishedVersion() {
    WorkflowTaskLibraryService service = new WorkflowTaskLibraryService(
        new CapturingRepository());

    IllegalArgumentException exception = assertThrows(
        IllegalArgumentException.class,
        () -> service.getPublishedVersion(1001L, 9999L, "admin"));

    assertTrue(exception.getMessage().contains("不可用于工作流"));
  }

  private static PublishedTaskItem item() {
    LocalDateTime now = LocalDateTime.of(2026, 8, 5, 0, 30);
    return new PublishedTaskItem(
        "1001",
        "查询订单",
        "通过订单号查询订单",
        "10",
        "order-center",
        "订单中心",
        null,
        null,
        "HTTP",
        "HTTP",
        "2003",
        3,
        "1.0.0",
        1,
        JSON.createObjectNode(),
        JSON.createObjectNode(),
        "digest",
        "admin",
        now,
        now,
        true,
        now);
  }

  private static PublishedTaskVersionView version() {
    LocalDateTime now = LocalDateTime.of(2026, 8, 5, 0, 30);
    return new PublishedTaskVersionView(
        "1001",
        "查询订单",
        "10",
        "订单中心",
        "HTTP",
        "HTTP",
        "2003",
        3,
        "1.0.0",
        1,
        JSON.createObjectNode(),
        JSON.createObjectNode(),
        "digest",
        "admin",
        now,
        true);
  }

  private static final class CapturingRepository implements WorkflowTaskLibraryRepository {

    private SearchCriteria criteria;
    private SearchResult searchResult = new SearchResult(List.of(), 0L);
    private Optional<PublishedTaskVersionView> version = Optional.empty();
    private long taskId;
    private long versionId;

    @Override
    public SearchResult search(SearchCriteria criteria) {
      this.criteria = criteria;
      return searchResult;
    }

    @Override
    public Optional<PublishedTaskVersionView> findPublishedVersion(
        long taskId,
        long versionId,
        String operator) {
      this.taskId = taskId;
      this.versionId = versionId;
      return version;
    }
  }
}
