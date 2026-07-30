package io.yak.ops.business.sync.realtime.model.request;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Data;

/** 任务提交参数。 */
@Data
public class JobSubmitRequest {
  private String savepointPath;
  private Map<String, String> runtimeOptions = new LinkedHashMap<>();
}
