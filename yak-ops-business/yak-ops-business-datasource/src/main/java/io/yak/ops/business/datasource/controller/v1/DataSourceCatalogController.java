package io.yak.ops.business.datasource.controller.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.yak.framework.common.Result;
import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.service.DataSourceCatalogService;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogColumnVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceCatalogTableVO;
import io.yak.ops.common.constant.datasource.DataSourceConstants;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 数据源 Catalog 元数据接口。 */
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
}
