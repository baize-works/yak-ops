package io.yak.ops.common.bean.dto.sync.offline;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import lombok.Data;

/**
 * 离线同步 Source 或 Sink 端点配置。
 *
 * <p>公共连接信息位于端点根节点；单表模式暂时保留 config，
 * 多表模式使用 database、tables、命名规则和 options 等明确字段。</p>
 *
 * @author weifuwan
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class OfflineJobEndpointDTO {

  private String connectorId;
  private String pluginName;
  private String dbType;
  private String dataSourceId;

  /** 单表同步以及旧版本兼容配置。 */
  private JsonNode config;

  /** Connector 动态扩展参数，不包含 Yak Ops 管理的标准字段。 */
  private JsonNode options;

  /** 多表同步来源库或目标库。 */
  private String database;

  /** 多表同步来源表列表。 */
  private List<String> tables;

  /** 多表同步来源表过滤规则。 */
  private String tablePattern;

  /** SAME_NAME、PREFIX 或 SUFFIX。 */
  private String tableNamingRule;

  private String tablePrefix;
  private String tableSuffix;
  private Boolean autoCreateTable;
  private String writeMode;

  /** UPSERT 模式使用，多个字段使用英文逗号分隔。 */
  private String primaryKey;
}
