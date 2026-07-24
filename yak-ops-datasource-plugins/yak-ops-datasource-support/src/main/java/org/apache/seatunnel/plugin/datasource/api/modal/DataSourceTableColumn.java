package org.apache.seatunnel.plugin.datasource.api.modal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DataSourceTableColumn {
    /**
     * Column name as it appears in the database.
     */
    private String columnName;

    /**
     * Simplified Java-style type (e.g., STRING, INTEGER, TIMESTAMP).
     */
    private String columnType;

    /**
     * Native database type string (e.g., VARCHAR(255), NUMBER(10,2)).
     */
    private String sourceType;

    /**
     * 1-based position of the column in the table definition.
     */
    private Integer ordinalPosition;

    private String isNullable;

    private String columnComment;

    private String columnKey;


}
