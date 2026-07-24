package io.baize.flow.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.api.exceptions.ApiException;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.api.service.DataSourceService;
import io.baize.flow.web.contract.dto.DataSourceDTO;
import io.baize.flow.web.contract.response.PaginationResult;
import io.baize.flow.web.contract.response.Result;
import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.web.contract.vo.DBOptionVO;
import io.baize.flow.web.contract.vo.DataSourceVO;
import io.baize.flow.plugin.spi.enums.Status;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

import static io.baize.flow.plugin.spi.enums.Status.*;


@Slf4j
@RestController
@Tag(name = "DATA_SOURCE_TAG")
@RequestMapping("/api/v1/data-source")
public class DataSourceController {

    @Resource
    private DataSourceService dataSourceService;

    /**
     * Creates a new data source.
     */
    @PostMapping
    @Operation(summary = "createDataSource", description = "CREATE_DATA_SOURCE_NOTES")
    @ApiException(CREATE_DATASOURCE_ERROR)
    public Result<DataSource> createDataSource(@RequestBody DataSourceDTO dto) {
        return Result.buildSuc(dataSourceService.createDataSource(dto));
    }

    /**
     * Updates an existing data source.
     */
    @PutMapping("/{id}")
    @Operation(summary = "updateDataSource", description = "UPDATE_DATA_SOURCE_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "DATA_SOURCE_ID", required = true)
    })
    @ApiException(UPDATE_DATASOURCE_ERROR)
    public Result<DataSource> updateDataSource(
            @PathVariable("id") Long id,
            @RequestBody DataSourceDTO dto) {
        return Result.buildSuc(dataSourceService.updateDataSource(id, dto));
    }

    /**
     * select a data source by ID.
     */
    @GetMapping("/{id}")
    @Operation(summary = "deleteDataSource", description = "DELETE_DATA_SOURCE_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "DATA_SOURCE_ID", required = true)
    })
    @ApiException(QUERY_DATASOURCE_ERROR)
    public Result<DataSource> selectById(@PathVariable("id") Long id) {
        return Result.buildSuc(dataSourceService.selectById(id));
    }

    /**
     * Deletes a data source by ID.
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "deleteDataSource", description = "DELETE_DATA_SOURCE_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "DATA_SOURCE_ID", required = true)
    })
    @ApiException(DELETE_DATA_SOURCE_FAILURE)
    public Result<Boolean> delete(@PathVariable("id") Long id) {
        dataSourceService.delete(id);
        return Result.buildSuc(true);
    }

    /**
     * Performs pagination query for data sources.
     */
    @PostMapping("/page")
    @Operation(summary = "queryDataSourceListPaging", description = "QUERY_DATA_SOURCE_LIST_PAGING_NOTES")
    @ApiException(QUERY_DATASOURCE_ERROR)
    public PaginationResult<DataSourceVO> queryDataSourceListPaging(@RequestBody DataSourceDTO dto) {
        return dataSourceService.queryDataSourceListPaging(dto);
    }

    /**
     * Retrieves data source options filtered by database type.
     */
    @GetMapping("/option")
    @Operation(summary = "queryDataSourceOptions", description = "QUERY_DATA_SOURCE_OPTIONS_NOTES")
    @Parameters({
            @Parameter(name = "dbType", description = "DATABASE_TYPE", required = true)
    })
    @ApiException(QUERY_DATASOURCE_ERROR)
    public Result<List<DBOptionVO>> option(@RequestParam("dbType") String dbType) {
        return Result.buildSuc(dataSourceService.option(dbType));
    }

    /**
     * Tests connection for an existing data source.
     */
    @GetMapping("/{id}/connect-test")
    @Operation(summary = "connectionTest", description = "CONNECT_DATA_SOURCE_TEST_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "DATA_SOURCE_ID", required = true)
    })
    @ApiException(CONNECTION_TEST_FAILURE)
    public Result<Boolean> connectionTest(@PathVariable("id") Long id) {
        return Result.buildSuc(dataSourceService.connectionTest(id));
    }

    /**
     * Tests connection with provided parameters without saving.
     */
    @PostMapping("/connect-test-with-param")
    @Operation(summary = "connectionTestWithParam", description = "CONNECT_DATA_SOURCE_TEST_WITH_PARAM_NOTES")
    @ApiException(CONNECTION_TEST_FAILURE)
    public Result<Boolean> connectionTestWithParam(@RequestBody Map<String, Object> requestBody) {
        Object connJsonObj = requestBody.get("connJson");
        if (connJsonObj == null || StringUtils.isBlank(String.valueOf(connJsonObj))) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "connJson");
        }
        return Result.buildSuc(dataSourceService.connectionTestWithParam(String.valueOf(connJsonObj)));
    }

    /**
     * Batch deletes multiple data sources.
     */
    @DeleteMapping("/batch")
    @Operation(summary = "batchDeleteDataSource", description = "BATCH_DELETE_DATA_SOURCE_NOTES")
    @ApiException(DELETE_DATA_SOURCE_FAILURE)
    public Result<Boolean> batchDelete(@RequestBody List<Long> ids) {
        return Result.buildSuc(dataSourceService.batchDelete(ids));
    }

    /**
     * Batch tests connections for multiple data sources.
     */
    @PostMapping("/batch-connect-test")
    @Operation(summary = "batchConnectionTest", description = "BATCH_CONNECT_DATA_SOURCE_TEST_NOTES")
    @ApiException(CONNECTION_TEST_FAILURE)
    public Result<Boolean> batchConnectionTest(@RequestBody List<Long> ids) {
        return Result.buildSuc(dataSourceService.batchConnectionTest(ids));
    }

    /**
     * Retrieves all data sources.
     */
    @GetMapping("/all")
    @Operation(summary = "queryAllDataSource", description = "QUERY_ALL_DATA_SOURCE_NOTES")
    @ApiException(QUERY_DATASOURCE_ERROR)
    public Result<List<DataSourceVO>> all() {
        return Result.buildSuc(dataSourceService.listAll());
    }

    /**
     * Upload JDBC driver jar.
     */
    @PostMapping(value = "/plugin/driver/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "uploadJdbcDriver", description = "UPLOAD_JDBC_DRIVER_NOTES")
    @ApiException(UPDATE_DATASOURCE_ERROR)
    public Result<Map<String, Object>> uploadJdbcDriver(
            @Parameter(description = "Driver jar file (.jar)", required = true)
            @RequestPart("file") MultipartFile file,
            @Parameter(description = "Plugin type")
            @RequestParam(value = "pluginType", required = false) String pluginType,
            @Parameter(description = "Whether to overwrite existing file")
            @RequestParam(value = "overwrite", required = false, defaultValue = "true") boolean overwrite) {
        return Result.buildSuc(dataSourceService.uploadJdbcDriver(file, pluginType, overwrite));
    }
}