package io.yak.ops.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.annotation.Resource;
import javax.validation.Valid;
import io.yak.ops.api.exceptions.ApiException;
import io.yak.ops.application.service.ConnectorParamMetaService;
import io.yak.ops.application.model.dto.ConnectorParamMetaCreateDTO;
import io.yak.ops.application.model.dto.ConnectorParamMetaQueryDTO;
import io.yak.ops.application.model.dto.ConnectorParamMetaUpdateDTO;
import io.yak.ops.application.model.response.PaginationResult;
import io.yak.ops.application.model.response.Result;
import io.yak.ops.application.model.vo.ConnectorParamMetaOptionVO;
import io.yak.ops.application.model.vo.ConnectorParamMetaVO;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static io.yak.ops.plugin.spi.enums.Status.*;

@RestController
@Tag(name = "CONNECTOR_PARAM_META_TAG")
@RequestMapping("/api/v1/connector-param-meta")
public class ConnectorParamMetaController {

    @Resource
    private ConnectorParamMetaService connectorParamMetaService;

    /**
     * 新增参数元数据
     */
    @PostMapping
    @Operation(summary = "createConnectorParamMeta", description = "CREATE_CONNECTOR_PARAM_META_NOTES")
    @ApiException(CREATE_CONNECTOR_PARAM_META_ERROR)
    public Result<Long> create(@Valid @RequestBody ConnectorParamMetaCreateDTO dto) {
        return Result.buildSuc(connectorParamMetaService.create(dto));
    }

    /**
     * 更新参数元数据
     */
    @PutMapping("/{id}")
    @Operation(summary = "updateConnectorParamMeta", description = "UPDATE_CONNECTOR_PARAM_META_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "CONNECTOR_PARAM_META_ID", required = true)
    })
    @ApiException(UPDATE_CONNECTOR_PARAM_META_ERROR)
    public Result<Boolean> update(
            @PathVariable("id") Long id,
            @Valid @RequestBody ConnectorParamMetaUpdateDTO dto) {
        return Result.buildSuc(connectorParamMetaService.update(id, dto));
    }

    /**
     * 根据ID查询详情
     */
    @GetMapping("/{id}")
    @Operation(summary = "getConnectorParamMetaById", description = "GET_CONNECTOR_PARAM_META_BY_ID_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "CONNECTOR_PARAM_META_ID", required = true)
    })
    @ApiException(QUERY_CONNECTOR_PARAM_META_ERROR)
    public Result<ConnectorParamMetaVO> getById(@PathVariable("id") Long id) {
        return Result.buildSuc(connectorParamMetaService.getById(id));
    }

    /**
     * 分页查询
     */
    @PostMapping("/page")
    @Operation(summary = "pageQueryConnectorParamMeta", description = "PAGE_QUERY_CONNECTOR_PARAM_META_NOTES")
    @ApiException(QUERY_CONNECTOR_PARAM_META_ERROR)
    public PaginationResult<ConnectorParamMetaVO> pageQuery(@RequestBody ConnectorParamMetaQueryDTO dto) {
        return connectorParamMetaService.pageQuery(dto);
    }

    /**
     * 根据 connectorName/type 获取参数列表
     */
    @GetMapping("/list")
    @Operation(summary = "listConnectorParamMeta", description = "LIST_CONNECTOR_PARAM_META_NOTES")
    @ApiException(QUERY_CONNECTOR_PARAM_META_ERROR)
    public Result<List<ConnectorParamMetaVO>> list(
            @RequestParam(name = "connectorName", required = false) String connectorName,
            @RequestParam(name = "type", required = false) String type
    ) {
        return Result.buildSuc(connectorParamMetaService.list(connectorName, type));
    }

    /**
     * 删除
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "deleteConnectorParamMeta", description = "DELETE_CONNECTOR_PARAM_META_NOTES")
    @Parameters({
            @Parameter(name = "id", description = "CONNECTOR_PARAM_META_ID", required = true)
    })
    @ApiException(DELETE_CONNECTOR_PARAM_META_ERROR)
    public Result<Boolean> delete(@PathVariable("id") Long id) {
        connectorParamMetaService.delete(id);
        return Result.buildSuc(true);
    }

    /**
     * 获取连接器参数选项，用于前端任务配置面板下拉选择
     */
    @GetMapping("/option")
    @Operation(
            summary = "optionConnectorParamMeta",
            description = "OPTION_CONNECTOR_PARAM_META_NOTES"
    )
    @ApiException(QUERY_CONNECTOR_PARAM_META_ERROR)
    public Result<List<ConnectorParamMetaOptionVO>> option(
            @RequestParam(name = "connectorName", required = false) String connectorName,
            @RequestParam(name = "connectorType", required = false) String connectorType,
            @RequestParam(name = "type", required = false) String type
    ) {
        return Result.buildSuc(
                connectorParamMetaService.option(connectorName, connectorType, type)
        );
    }
}
