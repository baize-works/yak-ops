package io.baize.flow.infrastructure.verify.job;

import jakarta.annotation.Resource;
import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.dao.entity.SeaTunnelClient;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DefaultConnectivityTestJobFactory implements ConnectivityTestJobFactory {

    @Resource
    private List<ConnectivityTestJobDefinitionBuilder> builders;

    @Override
    public ConnectivityTestJob build(SeaTunnelClient client, DataSource datasource) {
        return builders.stream()
                .filter(builder -> builder.supports(datasource.getDbType()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "暂不支持该数据源类型的测试任务构建: " + datasource.getDbType()))
                .build(client, datasource);
    }
}
