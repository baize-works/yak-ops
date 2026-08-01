package io.yak.ops.business.sync.offline.form;

import io.yak.ops.business.sync.offline.config.ConditionalOnOfflineSyncEnabled;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
/**
 * Connector Form Schema 查询与刷新门面。
 *
 * @author weifuwan
 */
@ConditionalOnOfflineSyncEnabled
@Service
@RequiredArgsConstructor
public class ConnectorFormSchemaService {

  private final ConnectorSchemaRegistry schemaRegistry;
  private final ConnectorFormSchemaComposer composer;


  public ConnectorFormSchema get(String connectorId, String role) {
    return composer.compose(schemaRegistry.get(connectorId, role));
  }

  public List<ConnectorFormSchema> list(String role) {
    List<ConnectorFormSchema> result = new ArrayList<>();
    for (ConnectorSchemaSnapshot snapshot : schemaRegistry.list(role)) {
      result.add(composer.compose(snapshot));
    }
    return result;
  }

  public int refresh() {
    return schemaRegistry.refresh();
  }
}
