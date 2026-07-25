package io.yak.ops.web.contract.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Column metadata information for database tables")
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public class ColumnOptionVO {

    @Schema(
            description = "Column order/key index",
            example = "1"
    )
    private Integer key;

    @Schema(
            description = "Column name",
            example = "user_id"
    )
    private Object fieldName;

    @Schema(
            description = "Column data type",
            example = "VARCHAR(255)"
    )
    private Object fieldType;

    @Schema(
            description = "Column position in the table (starting from 1)",
            example = "1"
    )
    private Integer ordinalPosition;

    @Schema(
            description = "Whether the column allows NULL values",
            example = "NO",
            allowableValues = {"YES", "NO"}
    )
    private String isNullable;

    @Schema(
            description = "Column comment/description",
            example = "User ID (primary key)"
    )
    private String fieldComment;

    @Schema(
            description = "Column key type (PRI, UNI, MUL, etc.)",
            example = "PRI",
            allowableValues = {"PRI", "UNI", "MUL", ""}
    )
    private String fieldKey;
}
