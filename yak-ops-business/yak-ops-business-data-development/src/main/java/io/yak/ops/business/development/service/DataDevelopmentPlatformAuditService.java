package io.yak.ops.business.development.service;

import io.yak.ops.business.development.config.ConditionalOnDataDevelopmentEnabled;
import io.yak.ops.business.development.repository.DataDevelopmentPlatformRepository;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Central write-only audit boundary for platform and execution mutations. */
@ConditionalOnDataDevelopmentEnabled
@Service
public final class DataDevelopmentPlatformAuditService {

  private final DataDevelopmentPlatformRepository repository;
  private final DataDevelopmentJsonCodec json;

  public DataDevelopmentPlatformAuditService(
      DataDevelopmentPlatformRepository repository,
      DataDevelopmentJsonCodec json) {
    this.repository = repository;
    this.json = json;
  }

  public void record(
      String action,
      String resourceType,
      Object resourceId,
      Map<String, ?> summary,
      String operator) {
    repository.insertAudit(
        require(action), require(resourceType), resourceId == null ? null : String.valueOf(resourceId),
        json.write(json.toTree(summary == null ? Map.of() : summary)),
        StringUtils.hasText(operator) ? operator.trim() : "system",
        LocalDateTime.now());
  }

  private static String require(String value) {
    if (!StringUtils.hasText(value)) throw new IllegalArgumentException("审计字段不能为空");
    return value.trim();
  }
}
