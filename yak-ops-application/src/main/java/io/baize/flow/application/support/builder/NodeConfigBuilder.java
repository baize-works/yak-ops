package io.baize.flow.application.support.builder;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.application.support.builder.context.DagBuildContext;

/**
 * Builder interface for creating node configuration objects.
 *
 * @param <T> the type of the node configuration to be built
 */
public interface NodeConfigBuilder<T> {

    String nodeType();

    T build(Config data);

    default T build(Config data, DagBuildContext context) {
        return build(data);
    }

    default String connectorName(Config data) {
        Config config = resolveNodeConfig(data);

        if (config.hasPath("connectorType")) {
            String connectorType = config.getString("connectorType");
            if (StringUtils.isNotBlank(connectorType)) {
                return connectorType;
            }
        }

        throw new RuntimeException("pluginName or connectorType is missing");
    }

    default Config resolveNodeConfig(Config data) {
        if (data == null) {
            throw new RuntimeException("node data is null");
        }
        return data.hasPath("config") ? data.getConfig("config") : data;
    }
}