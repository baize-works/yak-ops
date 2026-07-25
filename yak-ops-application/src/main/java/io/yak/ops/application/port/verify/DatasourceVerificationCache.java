package io.yak.ops.application.port.verify;

import io.yak.ops.application.model.vo.ClientDatasourceVerifyVO;
import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.dao.entity.LinkUpClient;

/** Cache boundary for successful automatic connectivity checks. */
public interface DatasourceVerificationCache {
    ClientDatasourceVerifyVO get(String key);
    void put(String key, ClientDatasourceVerifyVO value);
    void evict(String key);
    void clear();
    String buildKey(LinkUpClient client, DataSource datasource,
                    String pluginName, String connectorType, String role);
}
