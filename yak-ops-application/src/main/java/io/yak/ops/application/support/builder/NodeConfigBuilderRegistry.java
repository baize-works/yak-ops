package io.yak.ops.application.support.builder;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registry for all {@link NodeConfigBuilder} implementations.
 *
 * <p>
 * This class maintains a mapping from node type string → NodeConfigBuilder instance.
 * It allows retrieval of a builder by node type.
 * </p>
 */
@Component
public class NodeConfigBuilderRegistry {

    /** Thread-safe map holding nodeType → builder instance */
    private final Map<String, NodeConfigBuilder<?>> holder = new ConcurrentHashMap<>();

    /**
     * Constructor that auto-wires all NodeConfigBuilder beans in the Spring context
     * and registers them in the holder map.
     *
     * @param builders list of all NodeConfigBuilder beans
     */
    @Autowired
    public NodeConfigBuilderRegistry(List<NodeConfigBuilder<?>> builders) {
        builders.forEach(b -> holder.put(b.nodeType(), b));
    }

    /**
     * Retrieve a NodeConfigBuilder by node type.
     *
     * @param nodeType type of the node
     * @param <T>      generic type parameter for builder
     * @return NodeConfigBuilder instance for the given node type
     * @throws IllegalArgumentException if the nodeType is unsupported
     */
    @SuppressWarnings("unchecked")
    public <T> NodeConfigBuilder<T> get(String nodeType) {
        NodeConfigBuilder<?> builder = holder.get(nodeType);
        if (builder == null) {
            throw new IllegalArgumentException("Unsupported nodeType: " + nodeType);
        }
        return (NodeConfigBuilder<T>) builder;
    }
}
