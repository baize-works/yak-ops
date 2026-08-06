package io.yak.ops.business.quality.service;

import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.business.quality.api.QualityApi.RegisterTableItem;
import io.yak.ops.business.quality.api.QualityApi.RegisterTablesRequest;
import io.yak.ops.business.quality.api.QualityApi.RegisterTablesView;
import io.yak.ops.business.quality.api.QualityApi.TableAssetPageRequest;
import io.yak.ops.business.quality.api.QualityApi.TableAssetPageView;
import io.yak.ops.business.quality.api.QualityApi.TableAssetView;
import io.yak.ops.business.quality.api.QualityApi.TableCandidatePageView;
import io.yak.ops.business.quality.api.QualityApi.TableCandidateView;
import io.yak.ops.business.quality.config.ConditionalOnQualityEnabled;
import io.yak.ops.business.quality.repository.QualityRepository;
import io.yak.ops.business.quality.repository.QualityRepository.PageResult;
import io.yak.ops.business.quality.repository.QualityRepository.TableAssetTarget;
import io.yak.ops.business.quality.repository.QualityRepository.TableAssetWrite;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogTableVO;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@ConditionalOnQualityEnabled
@Service
public class QualityTableAssetService {

  private final QualityRepository repository;
  private final DataSourceCatalogService catalogService;

  public QualityTableAssetService(
      QualityRepository repository,
      DataSourceCatalogService catalogService) {
    this.repository = repository;
    this.catalogService = catalogService;
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public TableAssetPageView page(TableAssetPageRequest request) {
    validateDataSourceId(request.dataSourceId());
    PageResult<TableAssetView> result = repository.pageTableAssets(request);
    return new TableAssetPageView(
        result.records(),
        result.total(),
        request.normalizedCurrent(),
        request.normalizedPageSize());
  }

  @Transactional(readOnly = true, transactionManager = "yakBusinessTransactionManager")
  public TableCandidatePageView candidates(
      long dataSourceId,
      String databaseName,
      String schemaName,
      String keyword,
      int current,
      int pageSize) {
    validateDataSourceId(dataSourceId);
    int safeCurrent = Math.max(1, current);
    int safePageSize = Math.max(1, Math.min(pageSize, 100));

    Set<String> registeredTargets = repository
        .listTableAssetTargets(dataSourceId, databaseName)
        .stream()
        .map(target -> targetKey(
            target.databaseName(), target.schemaName(), target.tableName()))
        .collect(Collectors.toSet());

    List<TableCandidateView> available = catalogService
        .listTables(dataSourceId, databaseName, schemaName, trimToNull(keyword))
        .stream()
        .map(table -> toCandidate(table, databaseName))
        .filter(table -> !registeredTargets.contains(targetKey(
            table.databaseName(), table.schemaName(), table.tableName())))
        .sorted(Comparator.comparing(
            TableCandidateView::tableName,
            String.CASE_INSENSITIVE_ORDER))
        .toList();

    int fromIndex = Math.min((safeCurrent - 1) * safePageSize, available.size());
    int toIndex = Math.min(fromIndex + safePageSize, available.size());
    return new TableCandidatePageView(
        available.subList(fromIndex, toIndex),
        available.size(),
        safeCurrent,
        safePageSize);
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public RegisterTablesView register(RegisterTablesRequest request, String operator) {
    validateDataSourceId(request.dataSourceId());
    String selectedDatabase = trimToNull(request.databaseName());
    List<DataSourceCatalogTableVO> physicalTables = catalogService.listTables(
        request.dataSourceId(), selectedDatabase, null, null);

    Map<String, DataSourceCatalogTableVO> physicalTableMap = physicalTables.stream()
        .collect(Collectors.toMap(
            table -> targetKey(
                firstNonBlank(table.getDatabase(), selectedDatabase),
                table.getSchema(),
                table.getName()),
            table -> table,
            (left, right) -> left,
            LinkedHashMap::new));

    Map<String, RegisterTableItem> requestedTables = new LinkedHashMap<>();
    for (RegisterTableItem item : request.tables()) {
      String database = firstNonBlank(item.databaseName(), selectedDatabase);
      requestedTables.putIfAbsent(
          targetKey(database, item.schemaName(), item.tableName()),
          item);
    }

    String registeredBy = normalizeOperator(operator);
    List<TableAssetWrite> writes = requestedTables.entrySet().stream()
        .map(entry -> {
          RegisterTableItem requested = entry.getValue();
          DataSourceCatalogTableVO physical = physicalTableMap.get(entry.getKey());
          if (physical == null) {
            throw new IllegalArgumentException(
                "数据表已不存在或无法通过数据源插件发现：" + requested.tableName());
          }
          return new TableAssetWrite(
              request.dataSourceId(),
              request.dataSourceName().trim(),
              firstNonBlank(physical.getDatabase(), selectedDatabase),
              trimToNull(physical.getSchema()),
              physical.getName(),
              trimToNull(physical.getType()),
              trimToNull(physical.getRemarks()),
              registeredBy);
        })
        .toList();

    int registered = repository.registerTableAssets(writes);
    return new RegisterTablesView(request.tables().size(), registered);
  }

  @Transactional(transactionManager = "yakBusinessTransactionManager")
  public boolean unregister(long id) {
    if (id <= 0) {
      throw new IllegalArgumentException("注册表编号无效");
    }
    if (repository.countMonitorsForTableAsset(id) > 0) {
      throw new IllegalStateException("当前数据表已配置质量监控，请先删除监控后再取消注册");
    }
    if (!repository.deleteTableAsset(id)) {
      throw new IllegalArgumentException("注册数据表不存在：" + id);
    }
    return true;
  }

  private TableCandidateView toCandidate(
      DataSourceCatalogTableVO table,
      String selectedDatabase) {
    return new TableCandidateView(
        firstNonBlank(table.getDatabase(), selectedDatabase),
        trimToNull(table.getSchema()),
        table.getName(),
        trimToNull(table.getType()),
        trimToNull(table.getRemarks()));
  }

  private void validateDataSourceId(Long dataSourceId) {
    if (dataSourceId == null || dataSourceId <= 0) {
      throw new IllegalArgumentException("数据源编号无效");
    }
  }

  private static String targetKey(
      String databaseName,
      String schemaName,
      String tableName) {
    return String.join(
        "\u0001",
        normalizeKeyPart(databaseName),
        normalizeKeyPart(schemaName),
        normalizeKeyPart(tableName));
  }

  private static String normalizeKeyPart(String value) {
    String normalized = trimToNull(value);
    return normalized == null ? "" : normalized.toLowerCase(Locale.ROOT);
  }

  private static String firstNonBlank(String first, String second) {
    String normalized = trimToNull(first);
    return normalized == null ? trimToNull(second) : normalized;
  }

  private static String normalizeOperator(String operator) {
    String normalized = trimToNull(operator);
    return normalized == null ? "system" : normalized;
  }

  private static String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
