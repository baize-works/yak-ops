package io.yak.ops.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.api.exceptions.ApiException;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.application.service.DatasourcePluginService;
import io.yak.ops.application.model.response.Result;
import io.yak.ops.plugin.spi.enums.Status;
import io.yak.ops.plugin.spi.form.PluginConfigResponse;
import org.springframework.web.bind.annotation.*;

import static io.yak.ops.plugin.spi.enums.Status.*;


@Slf4j
@RestController
@RequestMapping("/api/v1/data-source/plugin/config")
@Tag(name = "DATA_SOURCE_PLUGIN_TAG")
public class DataSourcePluginConfigController {

    @Resource
    private DatasourcePluginService datasourcePluginService;

    /**
     * Get datasource plugin configuration form.
     */
    @GetMapping
    @Operation(summary = "getPluginConfig", description = "GET_DATASOURCE_PLUGIN_CONFIG_NOTES")
    @Parameters({
            @Parameter(name = "pluginType", description = "PLUGIN_TYPE", required = true)
    })
    @ApiException(DATASOURCE_PLUGIN_CONFIG_ERROR)
    public Result<PluginConfigResponse> getPluginConfig(
            @RequestParam("pluginType") String pluginType) {

        if (StringUtils.isBlank(pluginType)) {
            throw new ServiceException(Status.DATASOURCE_PLUGIN_TYPE_EMPTY);
        }

        return Result.buildSuc(
                datasourcePluginService.getPluginConfig(pluginType)
        );
    }

    /**
     * Install datasource plugin.
     */
    @PostMapping("/install")
    @Operation(summary = "installPlugin", description = "INSTALL_DATASOURCE_PLUGIN_NOTES")
    @Parameters({
            @Parameter(name = "pluginType", description = "PLUGIN_TYPE", required = true)
    })
    @ApiException(DATASOURCE_PLUGIN_INSTALL_ERROR)
    public Result<Boolean> installPlugin(
            @RequestParam("pluginType") String pluginType) {

        if (StringUtils.isBlank(pluginType)) {
            throw new ServiceException(Status.DATASOURCE_PLUGIN_TYPE_EMPTY);
        }

        datasourcePluginService.installPlugin(pluginType);

        return Result.buildSuc(true);
    }
}
