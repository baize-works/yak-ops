package io.yak.ops.application.model.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "客户端验证数据源请求")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class ClientDatasourceVerifyDTO {

    @Schema(description = "数据源ID", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long datasourceId;

    @Schema(description = "数据源插件名称", requiredMode = Schema.RequiredMode.REQUIRED)
    private String pluginName;

    /**
     * 前端当前选择的连接器类型。
     * 例如：Jdbc、CDC
     */
    private String connectorType;

    /**
     * 测试触发方式：
     * AUTO   自动触发，可以走缓存
     * MANUAL 手动点击，必须真实测试
     */
    @Schema(description = "触发方式：AUTO 自动触发；MANUAL 手动触发", example = "AUTO")
    private String triggerMode;

    /**
     * 是否强制刷新。
     * true 时不读缓存，直接真实测试。
     */
    @Schema(description = "是否强制刷新缓存", example = "false")
    private Boolean forceRefresh;

    /**
     * SOURCE / SINK
     */
    private String role;

    @Schema(description = "超时时间，单位毫秒", example = "15000")
    private Long timeoutMs;

    @Schema(description = "轮询间隔，单位毫秒", example = "1000")
    private Long pollIntervalMs;
}
