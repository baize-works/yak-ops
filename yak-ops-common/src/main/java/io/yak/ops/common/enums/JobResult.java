package io.yak.ops.common.enums;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NonNull;

import java.io.Serializable;

@Data
@AllArgsConstructor
public class JobResult implements Serializable {

    @NonNull private JobStatus status;

    private String error;

    public JobResult(@NonNull JobStatus status) {
        this.status = status;
    }
}
