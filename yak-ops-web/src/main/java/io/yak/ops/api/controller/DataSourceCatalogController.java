package io.yak.ops.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import io.yak.ops.api.exceptions.ApiException;
import io.yak.ops.application.service.DataSourceCatalogService;
import io.yak.ops.application.model.response.Result;
import io.yak.ops.common.QueryResult;
import io.yak.ops.application.model.vo.ColumnOptionVO;
import io.yak.ops.application.model.vo.OptionVO;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import static io.yak.ops.plugin.spi.enums.Status.*;


@Slf4j
@RestController
@RequestMapping("/api/v1/data-source/catalog")
@Tag(name = "DATA_SOURCE_CATALOG_TAG")
public class DataSourceCatalogController {

    @Resource
    private DataSourceCatalogService dataSourceCatalogService;

    /**
     * List all tables from datasource.
     */
    @GetMapping("/list/{id}")
    @Operation(summary = "listTable", description = "LIST_DATASOURCE_TABLE_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "DATA_SOURCE_ID", required = true)
    })
    @ApiException(DATASOURCE_CATALOG_TABLE_LIST_ERROR)
    public Result<List<OptionVO>> listTable(@PathVariable("id") Long id) {
        return Result.buildSuc(dataSourceCatalogService.listTable(id));
    }

    /**
     * List table references by match mode.
     */
    @GetMapping("/listByMatchMode/{id}")
    @Operation(summary = "listTableReference", description = "LIST_DATASOURCE_TABLE_REFERENCE_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "DATA_SOURCE_ID", required = true),
            @Parameter(name = "matchMode", description = "MATCH_MODE"),
            @Parameter(name = "keyword", description = "KEYWORD")
    })
    @ApiException(DATASOURCE_CATALOG_TABLE_REFERENCE_ERROR)
    public Result<List<OptionVO>> listTableReference(
            @PathVariable("id") Long id,
            @RequestParam(value = "matchMode", required = false) String matchMode,
            @RequestParam(value = "keyword", required = false) String keyword) {

        return Result.buildSuc(
                dataSourceCatalogService.listTableReference(id, matchMode, keyword)
        );
    }

    /**
     * List columns of table.
     */
    @PostMapping("/column/{id}")
    @Operation(summary = "listColumn", description = "LIST_DATASOURCE_COLUMN_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "DATA_SOURCE_ID", required = true)
    })
    @ApiException(DATASOURCE_CATALOG_COLUMN_LIST_ERROR)
    public Result<List<ColumnOptionVO>> listColumn(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> requestBody) {

        return Result.buildSuc(
                dataSourceCatalogService.listColumn(id, requestBody)
        );
    }

    /**
     * Preview top 20 rows of data.
     */
    @PostMapping("/getTop20Data/{id}")
    @Operation(summary = "getTop20Data", description = "GET_TOP20_DATA_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "DATA_SOURCE_ID", required = true)
    })
    @ApiException(DATASOURCE_CATALOG_PREVIEW_DATA_ERROR)
    public Result<QueryResult> getTop20Data(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> requestBody) {

        return Result.buildSuc(
                dataSourceCatalogService.getTop20Data(id, requestBody)
        );
    }

    /**
     * Count rows from table.
     */
    @PostMapping("/count/{id}")
    @Operation(summary = "count", description = "COUNT_DATASOURCE_TABLE_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "DATA_SOURCE_ID", required = true)
    })
    @ApiException(DATASOURCE_CATALOG_COUNT_ERROR)
    public Result<Integer> count(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> requestBody) {

        return Result.buildSuc(
                dataSourceCatalogService.count(id, requestBody)
        );
    }

    /**
     * Build SQL template.
     */
    @PostMapping("/sql-template/{id}")
    @Operation(summary = "buildSqlTemplate", description = "BUILD_SQL_TEMPLATE_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "DATA_SOURCE_ID", required = true)
    })
    @ApiException(DATASOURCE_CATALOG_SQL_TEMPLATE_ERROR)
    public Result<String> buildSqlTemplate(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> requestBody) {

        return Result.buildSuc(
                dataSourceCatalogService.buildSqlTemplate(id, requestBody)
        );
    }

    /**
     * Resolve SQL variables.
     */
    @PostMapping("/resolve-sql/{id}")
    @Operation(summary = "resolveSql", description = "RESOLVE_SQL_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "DATA_SOURCE_ID", required = true)
    })
    @ApiException(DATASOURCE_CATALOG_RESOLVE_SQL_ERROR)
    public Result<String> resolveSql(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> requestBody) {

        return Result.buildSuc(
                dataSourceCatalogService.resolveSql(id, requestBody)
        );
    }
}
