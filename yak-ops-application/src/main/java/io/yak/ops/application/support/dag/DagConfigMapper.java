package io.yak.ops.application.support.dag;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import io.yak.ops.domain.dag.DagGraph;
import io.yak.ops.domain.dag.DagNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Application adapter from domain DAG nodes to HOCON configuration. */
public final class DagConfigMapper {
    private DagConfigMapper() { }
    public static List<Config> nodes(DagGraph graph) {
        List<Config> configs = new ArrayList<Config>();
        for (DagNode node : graph.getNodes()) {
            Map<String,Object> value = new LinkedHashMap<String,Object>();
            value.put("id", node.getId());
            value.put("data", new LinkedHashMap<String,Object>(node.getAttributes()));
            configs.add(ConfigFactory.parseMap(value));
        }
        return configs;
    }
}
