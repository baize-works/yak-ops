package io.yak.ops.business.sync.offline.form;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;

/**
 * Connector Schema 快照及其来源状态。
 *
 * @author weifuwan
 */
@RequiredArgsConstructor
public final class ConnectorSchemaSnapshot {
  private final JsonNode schema;
  private final String source;
  private final boolean stale;
  private final LocalDateTime syncedAt;

  public JsonNode getSchema() { return schema; }
  public String getSource() { return source; }
  public boolean isStale() { return stale; }
  public LocalDateTime getSyncedAt() { return syncedAt; }
}
