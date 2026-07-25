package io.yak.ops.application.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Database option for dropdown/select components")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class DBOptionVO {

    @Schema(
            description = "Option value (typically the database ID or connection ID)",
            example = "1001"
    )
    private Object value;

    @Schema(
            description = "Option label to display (typically the database name or description)",
            example = "MySQL - Product Database"
    )
    private Object label;

    @Schema(
            description = "Database type",
            example = "MYSQL",
            allowableValues = {"MYSQL", "POSTGRE_SQL", "KINGBASE", "DAMENG", "ORACLE", "SQLSERVER", "CLICKHOUSE", "KAFKA", "ELASTICSEARCH"}
    )
    private Object dbType;
}
