package io.yak.ops.web.contract.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Schema(description = "客户端验证数据源结果")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class ClientDatasourceVerifyVO {

    @Schema(description = "是否成功")
    private Boolean success;

    @Schema(description = "结果摘要")
    private String message;

    @Schema(description = "是否来自缓存")
    private Boolean fromCache;

    @Schema(description = "缓存过期时间戳，毫秒")
    private Long cacheExpireAt;

    @Schema(description = "客户端ID")
    private Long clientId;

    @Schema(description = "客户端名称")
    private String clientName;

    @Schema(description = "客户端地址")
    private String clientBaseUrl;

    @Schema(description = "数据源ID")
    private Long datasourceId;

    @Schema(description = "数据源名称")
    private String datasourceName;

    @Schema(description = "数据源类型")
    private String datasourceType;

    @Schema(description = "测试任务名称")
    private String testJobName;

    @Schema(description = "测试任务ID")
    private String testJobId;

    @Schema(description = "最终任务状态")
    private String finalJobStatus;

    @Schema(description = "失败原因")
    private String errorMessage;

    @Schema(description = "耗时，毫秒")
    private Long durationMs;

    private List<ClientDatasourceVerifyItemVO> items;

    public static ClientDatasourceVerifyVO success(String message) {
        ClientDatasourceVerifyVO vo = new ClientDatasourceVerifyVO();
        vo.setSuccess(true);
        vo.setMessage(message);
        vo.setFromCache(false);
        vo.setItems(new ArrayList<>());
        return vo;
    }

    public static ClientDatasourceVerifyVO fail(String message) {
        ClientDatasourceVerifyVO vo = new ClientDatasourceVerifyVO();
        vo.setSuccess(false);
        vo.setMessage(message);
        vo.setErrorMessage(message);
        vo.setFromCache(false);
        vo.setItems(new ArrayList<>());
        return vo;
    }

    public void addItem(ClientDatasourceVerifyItemVO item) {
        if (this.items == null) {
            this.items = new ArrayList<>();
        }
        this.items.add(item);
    }
}
