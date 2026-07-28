package io.yak.ops.business.datasource.controller.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.yak.framework.common.Result;
import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogColumnOptionVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogColumnVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogOptionVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogTableVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceQueryResultVO;
import io.yak.ops.common.constant.datasource.DataSourceConstants;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 数据源 Catalog 元数据和预览接口。 */
@Tag(name = "数据源 Catalog 元数据接口")
@RestController
@ConditionalOnDataSourceEnabled
@RequiredArgsConstructor
@RequestMapping(DataSourceConstants.API_PREFIX + "/catalog")
public class DataSourceCatalogController {

  private final DataSourceCatalogService catalogService;

  @Operation(summary = "查询数据库列表")
  @GetMapping("/{id}/databases")
  public Result<List<String>> databases(@PathVariable("id") Long id) {
    return Result.success(catalogService.listDatabases(id));
  }

  @Operation(summary = "查询 Schema 列表")
  @GetMapping("/{id}/schemas")
  public Result<List<String>> schemas(
      @PathVariable("id") Long id,
      @RequestParam(value = "database", required = false) String database) {
    return Result.success(catalogService.listSchemas(id, database));
  }

  @Operation(summary = "查询表和视图列表")
  @GetMapping("/{id}/tables")
  public Result<List<DataSourceCatalogTableVO>> tables(
      @PathVariable("id") Long id,
      @RequestParam(value = "database", required = false) String database,
      @RequestParam(value = "schema", required = false) String schema,
      @RequestParam(value = "keyword", required = false) String keyword) {
    return Result.success(catalogService.listTables(id, database, schema, keyword));
  }

  @Operation(summary = "查询表字段列表")
  @GetMapping("/{id}/columns")
  public Result<List<DataSourceCatalogColumnVO>> columns(
      @PathVariable("id") Long id,
      @RequestParam(value = "database", required = false) String database,
      @RequestParam(value = "schema", required = false) String schema,
      @RequestParam("table") String table) {
    return Result.success(catalogService.listColumns(id, database, schema, table));
  }

  @Operation(summary = "查询数据源表选项")
  @GetMapping("/list/{id}")
  public Result<List<DataSourceCatalogOptionVO>> listTable(@PathVariable("id") Long id) {
    return Result.success(catalogService.listTable(id));
  }

  @Operation(summary = "按匹配模式查询数据源表")
  @GetMapping("/listByMatchMode/{id}")
  public Result<List<DataSourceCatalogOptionVO>> listTableReference(
      @PathVariable("id") Long id,
      @RequestParam(value = "matchMode", required = false) String matchMode,
      @RequestParam(value = "keyword", required = false) String keyword) {
    return Result.success(catalogService.listTableReference(id, matchMode, keyword));
  }

  @Operation(summary = "查询表或 SQL 字段")
  @PostMapping("/column/{id}")
  public Result<List<DataSourceCatalogColumnOptionVO>> listColumn(
      @PathVariable("id") Long id,
      @RequestBody Map<String, Object> requestBody) {
    return Result.success(catalogService.listColumn(id, requestBody));
  }

  @Operation(summary = "预览前 20 条数据")
  @PostMapping("/getTop20Data/{id}")
  public Result<DataSourceQueryResultVO> preview(
      @PathVariable("id") Long id,
      @RequestBody Map<String, Object> requestBody) {
    return Result.success(catalogService.preview(id, requestBody));
  }

  @Operation(summary = "统计表或 SQL 查询结果")
  @PostMapping("/count/{id}")
  public Result<Long> count(
      @PathVariable("id") Long id,
      @RequestBody Map<String, Object> requestBody) {
    return Result.success(catalogService.count(id, requestBody));
  }

  @Operation(summary = "构建查询 SQL 模板")
  @PostMapping("/sql-template/{id}")
  public Result<String> buildSqlTemplate(
      @PathVariable("id") Long id,
      @RequestBody Map<String, Object> requestBody) {
    return Result.success(catalogService.buildSqlTemplate(id, requestBody));
  }

  @Operation(summary = "解析 SQL 变量")
  @PostMapping("/resolve-sql/{id}")
  public Result<String> resolveSql(
      @PathVariable("id") Long id,
      @RequestBody Map<String, Object> requestBody) {
    return Result.success(catalogService.resolveSql(id, requestBody));
  }
}
