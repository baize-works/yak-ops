package org.apache.seatunnel.plugin.datasource.api.cdc;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CdcDatasourcePrecheckItem {

    private String code;

    private String name;

    private Boolean success;

    private String actualValue;

    private String expectedValue;

    private String message;

    public static CdcDatasourcePrecheckItem success(
            String code,
            String name,
            String actualValue,
            String expectedValue,
            String message) {
        return new CdcDatasourcePrecheckItem(
                code,
                name,
                true,
                actualValue,
                expectedValue,
                message
        );
    }

    public static CdcDatasourcePrecheckItem fail(
            String code,
            String name,
            String actualValue,
            String expectedValue,
            String message) {
        return new CdcDatasourcePrecheckItem(
                code,
                name,
                false,
                actualValue,
                expectedValue,
                message
        );
    }
}
