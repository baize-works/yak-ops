package io.yak.ops.business.development.repository;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.PublishedTaskItem;
import io.yak.ops.business.development.api.WorkflowTaskLibraryApi.SortBy;
import io.yak.ops.business.development.repository.WorkflowTaskLibraryRepository.SearchCriteria;
import io.yak.ops.business.development.service.DataDevelopmentJsonCodec;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

class JdbcWorkflowTaskLibraryRepositoryTest {

  @Test
  void queryProjectsOnlySafePublishedTaskMetadata() {
    NamedParameterJdbcTemplate jdbc = org.mockito.Mockito.mock(
        NamedParameterJdbcTemplate.class);
    when(jdbc.queryForObject(
        anyString(),
        any(MapSqlParameterSource.class),
        eq(Long.class))).thenReturn(0L);
    when(jdbc.query(
        anyString(),
        any(MapSqlParameterSource.class),
        org.mockito.ArgumentMatchers.<RowMapper<PublishedTaskItem>>any()))
        .thenReturn(List.of());

    JdbcWorkflowTaskLibraryRepository repository =
        new JdbcWorkflowTaskLibraryRepository(jdbc, new DataDevelopmentJsonCodec());
    repository.search(new SearchCriteria(
        10L,
        0L,
        "HTTP",
        "order",
        true,
        true,
        SortBy.RECENTLY_USED,
        0,
        50,
        "admin"));

    ArgumentCaptor<String> countSql = ArgumentCaptor.forClass(String.class);
    ArgumentCaptor<String> listSql = ArgumentCaptor.forClass(String.class);
    verify(jdbc).queryForObject(
        countSql.capture(),
        any(MapSqlParameterSource.class),
        eq(Long.class));
    verify(jdbc).query(
        listSql.capture(),
        any(MapSqlParameterSource.class),
        org.mockito.ArgumentMatchers.<RowMapper<PublishedTaskItem>>any());

    String sql = countSql.getValue() + "\n" + listSql.getValue();
    assertTrue(sql.contains("t.status='PUBLISHED'"));
    assertTrue(sql.contains("t.published_version_id IS NOT NULL"));
    assertTrue(sql.contains("favorite.resource_id IS NOT NULL"));
    assertTrue(sql.contains("recent.last_used_at IS NOT NULL"));
    assertTrue(sql.contains("v.input_schema"));
    assertTrue(sql.contains("v.output_schema"));
    assertFalse(sql.contains("definition_snapshot"));
    assertFalse(sql.contains("compiled_spec"));
  }
}
