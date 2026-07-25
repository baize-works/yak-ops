package io.yak.ops.domain.dag;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import lombok.Data;
import lombok.NoArgsConstructor;
import io.yak.ops.common.utils.JSONUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Represents a DAG graph structure.
 * <p>
 * This class holds node and edge definitions in Jackson JSON format
 * and provides utility methods to convert node definitions
 * into Typesafe {@link Config} objects.
 */
@Data
@NoArgsConstructor
public class DagGraph {

    /**
     * List of node definitions represented as Jackson ObjectNode objects
     */
    private List<ObjectNode> nodes;

    /**
     * List of edge definitions represented as Jackson ObjectNode objects
     */
    private List<ObjectNode> edges;

    /**
     * Convert all node JSON objects into {@link Config} instances.
     *
     * @return list of node configurations in Typesafe Config format
     */
    public List<Config> getNodesAsConfig() {
        if (nodes == null || nodes.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<Config> configs = new ArrayList<>(nodes.size());
        for (ObjectNode node : nodes) {
            configs.add(convertJsonNodeToConfig(node));
        }
        return configs;
    }

    /**
     * Convert a Jackson {@link ObjectNode} into a Typesafe {@link Config}.
     *
     * @param jsonNode node definition in JSON format
     * @return corresponding Typesafe Config object
     */
    private Config convertJsonNodeToConfig(ObjectNode jsonNode) {
        Map<String, Object> map =
                JSONUtils.parseObject(JSONUtils.toJsonString(jsonNode), Map.class);
        return ConfigFactory.parseMap(map);
    }
}
