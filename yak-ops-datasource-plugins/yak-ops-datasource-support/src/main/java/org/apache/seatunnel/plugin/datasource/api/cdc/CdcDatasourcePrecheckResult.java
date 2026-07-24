package org.apache.seatunnel.plugin.datasource.api.cdc;


import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CdcDatasourcePrecheckResult {

    private boolean success;

    private String message;

    private List<CdcDatasourcePrecheckItem> items = new ArrayList<>();

    public static CdcDatasourcePrecheckResult success(String message) {
        CdcDatasourcePrecheckResult result = new CdcDatasourcePrecheckResult();
        result.setSuccess(true);
        result.setMessage(message);
        return result;
    }

    public static CdcDatasourcePrecheckResult fail(String message) {
        CdcDatasourcePrecheckResult result = new CdcDatasourcePrecheckResult();
        result.setSuccess(false);
        result.setMessage(message);
        return result;
    }

    public void addItem(CdcDatasourcePrecheckItem item) {
        if (item == null) {
            return;
        }
        this.items.add(item);
    }

    public void refreshSuccess() {
        this.success = this.items.stream()
                .allMatch(item -> Boolean.TRUE.equals(item.getSuccess()));

        this.message = this.success
                ? "CDC 前置校验通过"
                : "CDC 前置校验未通过";
    }
}
