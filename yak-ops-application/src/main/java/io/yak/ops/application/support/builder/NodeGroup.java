package io.yak.ops.application.support.builder;

import com.typesafe.config.Config;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Represents a group of nodes in a SeaTunnel job.
 *
 * <p>
 * This class organizes configuration blocks into three categories:
 * </p>
 * <ul>
 *     <li>Sources: mapped by connector type</li>
 *     <li>Sinks: mapped by connector type</li>
 *     <li>Transforms: a simple ordered list</li>
 * </ul>
 *
 * <p>
 * Each configuration can later be rendered as {@link RenderedItem} for HOCON generation.
 * </p>
 */
public class NodeGroup {

    /** Map of source connector name → list of source configurations */
    private final Map<String, List<Config>> sources = new LinkedHashMap<>();

    /** Map of sink connector name → list of sink configurations */
    private final Map<String, List<Config>> sinks = new LinkedHashMap<>();

    /** List of transform configurations in order */
    private final List<Config> transforms = new ArrayList<>();

    /**
     * Add a source configuration for a given connector.
     *
     * @param connector source connector type/name
     * @param cfg       configuration block
     */
    void addSource(String connector, Config cfg) {
        sources.computeIfAbsent(connector, k -> new ArrayList<>()).add(cfg);
    }

    /**
     * Add a sink configuration for a given connector.
     *
     * @param connector sink connector type/name
     * @param cfg       configuration block
     */
    void addSink(String connector, Config cfg) {
        sinks.computeIfAbsent(connector, k -> new ArrayList<>()).add(cfg);
    }

    /**
     * Add a transform configuration.
     *
     * @param cfg transform configuration block
     */
    void addTransform(Config cfg) {
        transforms.add(cfg);
    }

    /**
     * Get all source configurations wrapped as {@link RenderedItem}.
     *
     * @return list of rendered sources
     */
    List<RenderedItem> sources() {
        return flat(sources);
    }

    /**
     * Get all sink configurations wrapped as {@link RenderedItem}.
     *
     * @return list of rendered sinks
     */
    List<RenderedItem> sinks() {
        return flat(sinks);
    }

    /**
     * Get all transform configurations wrapped as {@link RenderedItem}.
     *
     * @return list of rendered transforms
     */
    List<RenderedItem> transforms() {
        return transforms.stream()
                .map(c -> new RenderedItem(null, c))
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Flatten a map of connector → list of configs into a list of {@link RenderedItem},
     * using the connector name as the root key for HOCON rendering.
     *
     * @param map map of connector name → list of configurations
     * @return flattened list of rendered items
     */
    private static List<RenderedItem> flat(Map<String, List<Config>> map) {
        return map.entrySet().stream()
                .flatMap(e -> e.getValue().stream()
                        .map(c -> new RenderedItem(e.getKey(), c)))
                .collect(java.util.stream.Collectors.toList());
    }
}
