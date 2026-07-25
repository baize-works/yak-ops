package io.yak.ops.application.support.builder.context;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.domain.dag.DagGraph;
import io.yak.ops.application.model.dto.config.JobScheduleConfig;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Build context for generating LinkUp HOCON from DAG.
 *
 * <p>
 * It keeps DAG-level information that a single node builder cannot know,
 * such as whether the workflow contains transform nodes and how nodes are connected.
 * </p>
 */
public class DagBuildContext {

    private static final String KEY_DATA = "data";
    private static final String KEY_NODE_TYPE = "nodeType";

    private static final String NODE_TYPE_SOURCE = "source";
    private static final String NODE_TYPE_SINK = "sink";
    private static final String NODE_TYPE_TRANSFORM = "transform";

    private final boolean hasTransform;

    /**
     * Current job schedule config.
     *
     * <p>
     * Used by node builders to resolve schedule params, such as time variables
     * referenced in JDBC SQL or where_condition.
     * </p>
     */
    private final JobScheduleConfig scheduleConfig;

    /**
     * source node id -> downstream transform node id
     */
    private final Map<String, String> sourcePluginOutputMap;

    /**
     * sink node id -> upstream transform node id
     */
    private final Map<String, String> sinkPluginInputMap;

    private DagBuildContext(boolean hasTransform,
                            JobScheduleConfig scheduleConfig,
                            Map<String, String> sourcePluginOutputMap,
                            Map<String, String> sinkPluginInputMap) {
        this.hasTransform = hasTransform;
        this.scheduleConfig = scheduleConfig;
        this.sourcePluginOutputMap = sourcePluginOutputMap;
        this.sinkPluginInputMap = sinkPluginInputMap;
    }

    public static DagBuildContext from(DagGraph dagGraph) {
        return from(dagGraph, null);
    }

    public static DagBuildContext from(DagGraph dagGraph, JobScheduleConfig scheduleConfig) {
        if (dagGraph == null || dagGraph.getNodes() == null || dagGraph.getNodes().isEmpty()) {
            return empty(scheduleConfig);
        }

        List<Config> nodes = io.yak.ops.application.support.dag.DagConfigMapper.nodes(dagGraph);

        boolean hasTransform = nodes.stream()
                .map(DagBuildContext::getNodeData)
                .anyMatch(data -> NODE_TYPE_TRANSFORM.equalsIgnoreCase(getString(data, KEY_NODE_TYPE)));

        if (!hasTransform) {
            return new DagBuildContext(
                    false,
                    scheduleConfig,
                    new HashMap<>(),
                    new HashMap<>()
            );
        }

        Map<String, String> sourcePluginOutputMap = new HashMap<>();
        Map<String, String> sinkPluginInputMap = new HashMap<>();

        for (Config node : nodes) {
            String nodeId = getString(node, "id");
            Config data = getNodeData(node);
            String nodeType = getString(data, KEY_NODE_TYPE);

            if (StringUtils.isBlank(nodeId) || StringUtils.isBlank(nodeType)) {
                continue;
            }

            if (NODE_TYPE_SOURCE.equalsIgnoreCase(nodeType)) {
                sourcePluginOutputMap.put(nodeId, nodeId);
            }

            if (NODE_TYPE_SINK.equalsIgnoreCase(nodeType)) {
                sinkPluginInputMap.put(nodeId, nodeId);
            }
        }

        return new DagBuildContext(
                true,
                scheduleConfig,
                sourcePluginOutputMap,
                sinkPluginInputMap
        );
    }

    public static DagBuildContext empty() {
        return empty(null);
    }

    public static DagBuildContext empty(JobScheduleConfig scheduleConfig) {
        return new DagBuildContext(
                false,
                scheduleConfig,
                new HashMap<>(),
                new HashMap<>()
        );
    }

    public boolean hasTransform() {
        return hasTransform;
    }

    public JobScheduleConfig getScheduleConfig() {
        return scheduleConfig;
    }

    public String resolveSourcePluginOutput(Config sourceData) {
        if (!hasTransform || sourceData == null) {
            return "";
        }

        String nodeId = resolveNodeId(sourceData);
        if (StringUtils.isBlank(nodeId)) {
            return "";
        }

        return sourcePluginOutputMap.getOrDefault(nodeId, nodeId);
    }

    public String resolveSinkPluginInput(Config sinkData) {
        if (!hasTransform || sinkData == null) {
            return "";
        }

        String nodeId = resolveNodeId(sinkData);
        if (StringUtils.isBlank(nodeId)) {
            return "";
        }

        return sinkPluginInputMap.getOrDefault(nodeId, nodeId);
    }

    private String resolveNodeId(Config data) {
        /*
         * 当前 classify 传入的是 data，不包含外层 node id。
         * 所以后面 HoconConfigBuilder 里建议把外层 id 注入到 data 中。
         */
        return getString(data, "id");
    }

    private static Config getNodeData(Config node) {
        if (node != null && node.hasPath(KEY_DATA)) {
            return node.getConfig(KEY_DATA);
        }
        return node;
    }

    private static String getString(Config config, String path) {
        if (config == null || !config.hasPath(path)) {
            return "";
        }

        String value = config.getString(path);
        return value == null ? "" : value.trim();
    }
}
