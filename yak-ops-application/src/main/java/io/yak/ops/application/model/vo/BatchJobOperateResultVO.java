package io.yak.ops.application.model.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
/**
 * @deprecated Phase 4/5 compatibility contract; migrate to an application or web contract.
 */
@Deprecated
public class BatchJobOperateResultVO {

    private int totalCount;
    private int successCount;
    private int skippedCount;
    private int failedCount;

    private List<Item> successItems = new ArrayList<>();
    private List<Item> skippedItems = new ArrayList<>();
    private List<Item> failedItems = new ArrayList<>();

    public void addSuccess(Long jobDefinitionId, Long jobInstanceId, String message) {
        successCount++;
        successItems.add(new Item(jobDefinitionId, jobInstanceId, message));
    }

    public void addSkipped(Long jobDefinitionId, Long jobInstanceId, String message) {
        skippedCount++;
        skippedItems.add(new Item(jobDefinitionId, jobInstanceId, message));
    }

    public void addFailed(Long jobDefinitionId, Long jobInstanceId, String message) {
        failedCount++;
        failedItems.add(new Item(jobDefinitionId, jobInstanceId, message));
    }

    @Data
    public static class Item {
        private Long jobDefinitionId;
        private Long jobInstanceId;
        private String message;

        public Item(Long jobDefinitionId, Long jobInstanceId, String message) {
            this.jobDefinitionId = jobDefinitionId;
            this.jobInstanceId = jobInstanceId;
            this.message = message;
        }
    }
}
