package io.yak.ops.application.support.builder;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import io.yak.ops.application.support.builder.context.DagBuildContext;
import io.yak.ops.application.support.builder.sink.SinkNodeConfigBuilder;
import io.yak.ops.application.support.builder.source.SourceNodeConfigBuilder;
import io.yak.ops.application.support.builder.transform.TransformNodeConfigBuilder;
import io.yak.ops.domain.dag.DagGraph;
import io.yak.ops.application.support.utils.SeaTunnelConfigUtil;
import io.yak.ops.web.contract.dto.config.BatchJobEnvConfig;
import io.yak.ops.web.contract.dto.config.JobEnvConfig;
import io.yak.ops.web.contract.dto.config.JobScheduleConfig;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Builds a complete SeaTunnel job configuration in HOCON format.
 */
@Component
@Slf4j
public class HoconConfigBuilder {

    private static final String KEY_ID = "id";
    private static final String KEY_DATA = "data";
    private static final String KEY_NODE_TYPE = "nodeType";

    @Resource
    private NodeConfigBuilderRegistry registry;

    @Resource
    private EnvConfigBuilder envConfigBuilder;

    public String build(DagGraph dagGraph, JobEnvConfig envConfig) {
        DagBuildContext context = DagBuildContext.from(dagGraph);

        NodeGroup group = groupNodes(io.yak.ops.application.support.dag.DagConfigMapper.nodes(dagGraph), context);

        return SeaTunnelConfigUtil.generateConfig(
                envConfigBuilder.build(envConfig),
                render(group.sources()),
                render(group.transforms()),
                render(group.sinks())
        );
    }

    private NodeGroup groupNodes(List<Config> nodes, DagBuildContext context) {
        NodeGroup nodeGroup = new NodeGroup();

        nodes.stream()
                .filter(n -> n.hasPath(KEY_DATA))
                .map(this::resolveNodeDataWithId)
                .forEach(data -> classify(data, nodeGroup, context));

        return nodeGroup;
    }

    /**
     * Keep outer node id in data.
     *
     * <p>
     * ReactFlow node id is outside data, but source/sink plugin_input/plugin_output
     * needs this id when transform exists.
     * </p>
     */
    private Config resolveNodeDataWithId(Config node) {
        Config data = node.getConfig(KEY_DATA);

        if (!node.hasPath(KEY_ID)) {
            return data;
        }

        String nodeId = node.getString(KEY_ID);

        Map<String, Object> idMap = new HashMap<>();
        idMap.put(KEY_ID, nodeId);

        return ConfigFactory.parseMap(idMap).withFallback(data).resolve();
    }

    private void classify(Config data, NodeGroup g, DagBuildContext context) {
        String nodeType = data.getString(KEY_NODE_TYPE);
        NodeConfigBuilder<?> builder = registry.get(nodeType);

        if (builder instanceof SourceNodeConfigBuilder) {
            SourceNodeConfigBuilder sourceBuilder = (SourceNodeConfigBuilder) builder;
            g.addSource(sourceBuilder.connectorName(data), sourceBuilder.build(data, context));
            return;
        }

        if (builder instanceof SinkNodeConfigBuilder) {
            SinkNodeConfigBuilder sinkBuilder = (SinkNodeConfigBuilder) builder;
            g.addSink(sinkBuilder.connectorName(data), sinkBuilder.build(data, context));
            return;
        }

        if (builder instanceof TransformNodeConfigBuilder) {
            TransformNodeConfigBuilder transformBuilder = (TransformNodeConfigBuilder) builder;
            g.addTransform(transformBuilder.build(data, context));
            return;
        }

        log.warn("Unknown builder type: {}", builder.getClass());
    }

    public String build(DagGraph dagGraph, JobEnvConfig envConfig, JobScheduleConfig scheduleConfig) {
        DagBuildContext context = DagBuildContext.from(dagGraph, scheduleConfig);

        NodeGroup group = groupNodes(io.yak.ops.application.support.dag.DagConfigMapper.nodes(dagGraph), context);

        return SeaTunnelConfigUtil.generateConfig(
                envConfigBuilder.build(envConfig),
                render(group.sources()),
                render(group.transforms()),
                render(group.sinks())
        );
    }

    private String render(List<RenderedItem> items) {
        return items.stream()
                .map(RenderedItem::toHocon)
                .collect(Collectors.joining("\n"));
    }
}
