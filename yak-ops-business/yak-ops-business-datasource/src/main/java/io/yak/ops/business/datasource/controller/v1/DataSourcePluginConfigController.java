package io.yak.ops.business.datasource.controller.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.yak.framework.common.Result;
import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.service.DataSourcePluginConfigService;
import io.yak.ops.common.bean.vo.datasource.DataSourcePluginConfigVO;
import io.yak.ops.common.constant.datasource.DataSourceConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 数据源动态表单配置接口。 */
@Tag(name = "数据源表单配置接口")
@RestController
@ConditionalOnDataSourceEnabled
@RequiredArgsConstructor
@RequestMapping(DataSourceConstants.API_PREFIX + "/plugin/config")
public class DataSourcePluginConfigController {

  private final DataSourcePluginConfigService pluginConfigService;

  @Operation(summary = "查询数据源动态表单配置")
  @GetMapping
  public Result<DataSourcePluginConfigVO> getPluginConfig(
      @RequestParam("pluginType") String pluginType) {
    return Result.success(pluginConfigService.getPluginConfig(pluginType));
  }

  @Operation(summary = "安装数据源配置")
  @PostMapping("/install")
  public Result<Boolean> installPlugin(
      @RequestParam("pluginType") String pluginType) {
    return Result.success(pluginConfigService.installPlugin(pluginType));
  }
}
