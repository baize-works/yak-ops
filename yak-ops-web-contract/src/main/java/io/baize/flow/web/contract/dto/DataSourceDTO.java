package io.baize.flow.web.contract.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import io.baize.flow.common.enums.ConnStatus;
import io.baize.flow.common.enums.EnvironmentEnum;
import io.baize.flow.web.contract.dto.pagination.PaginationBaseDTO;
import io.baize.flow.plugin.spi.enums.DbType;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "Data source DTO for creating and updating data sources")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class DataSourceDTO extends PaginationBaseDTO {

    private Long id;

    private String name;

    private DbType dbType;

    private EnvironmentEnum environment;

    private String originalJson;

    private String connectionParams;

    private String remark;

    private ConnStatus connStatus;
}
