package io.yak.ops.application.support.dag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.domain.dag.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

/**
 * Utility class for parsing and validating DAG definitions.
 */
public final class DagUtil {

    private static final Logger log = LoggerFactory.getLogger(DagUtil.class);

    /**
     * Default immutable validator chain applied to DAG validation.
     */
    private static final List<DagValidator> DEFAULT_VALIDATORS =
            Collections.unmodifiableList(Arrays.asList(
                    new IsolatedNodeValidator(),
                    new GraphConnectivityValidator(),
                    new CycleDetectionValidator(),
                    new TransformSingleConnectionValidator()
            ));

    private DagUtil() {
    }

    /**
     * Parse and validate a DAG JSON string using the default validators.
     */
    public static DagGraph parseAndCheck(String json) throws DagValidationException {
        return parseAndCheck(json, DEFAULT_VALIDATORS);
    }

    /**
     * Parse and validate a DAG JSON string using the specified validators.
     */
    public static DagGraph parseAndCheck(String json, List<DagValidator> validators)
            throws DagValidationException {

        DagCheckResult result = checkOnly(json, validators);

        if (!result.isValid()) {
            StringBuilder errorMsg = new StringBuilder("DAG validation failed:\n");
            result.getErrors().forEach(error -> errorMsg.append("- ").append(error).append("\n"));
            throw new DagValidationException(errorMsg.toString());
        }

        result.getWarnings().forEach(warning ->
                log.warn("DAG warning: {}", warning));

        ObjectNode dagJson = parseJsonObject(json);

        return toDomainGraph(dagJson);
    }

    /**
     * Validate only using default validators.
     */
    public static DagCheckResult checkOnly(String json) {
        return checkOnly(json, DEFAULT_VALIDATORS);
    }

    /**
     * Validate only using specified validators.
     */
    public static DagCheckResult checkOnly(String json, List<DagValidator> validators) {

        try {
            ObjectNode dagJson = parseJsonObject(json);

            DagGraph graph = toDomainGraph(dagJson);
            return performValidation(graph, validators);

        } catch (Exception e) {
            DagCheckResult result = new DagCheckResult();
            result.addError("Failed to parse DAG JSON: " + e.getMessage());
            return result;
        }
    }

    /**
     * Execute validators.
     */
    private static DagCheckResult performValidation(
            DagGraph graph,
            List<DagValidator> validators) {

        DagCheckResult result = new DagCheckResult();
        result.setValid(true);

        if (validators == null || validators.isEmpty()) {
            return result;
        }

        for (DagValidator validator : validators) {

            if (!result.isValid()) {
                break;
            }

            try {
                validator.validate(graph, result);
            } catch (Exception e) {
                result.addError("Validator execution failed: " + e.getMessage());
                log.error("Validator {} failed",
                        validator.getClass().getSimpleName(), e);
            }
        }

        return result;
    }

    /**
     * Parse JSON string to ObjectNode safely.
     */
    private static ObjectNode parseJsonObject(String json) {

        JsonNode node = JSONUtils.parseObject(json);

        if (!(node instanceof ObjectNode)) {
            throw new IllegalArgumentException("Invalid DAG JSON");
        }

        return (ObjectNode) node;
    }

    private static DagGraph toDomainGraph(ObjectNode root) {
        List<DagNode> nodes = new ArrayList<DagNode>();
        JsonNode nodeArray = root.get("nodes");
        if (nodeArray != null && nodeArray.isArray()) {
            for (JsonNode item : nodeArray) {
                if (!item.isObject()) continue;
                JsonNode data = item.get("data");
                Map<String, Object> attributes = data == null
                        ? Collections.<String, Object>emptyMap()
                        : JSONUtils.parseObject(JSONUtils.toJsonString(data), Map.class);
                nodes.add(new DagNode(text(item, "id"), first(text(item, "name"), text(data, "title")),
                        text(data, "nodeType"), attributes));
            }
        }
        List<DagEdge> edges = new ArrayList<DagEdge>();
        JsonNode edgeArray = root.get("edges");
        if (edgeArray != null && edgeArray.isArray()) {
            for (JsonNode item : edgeArray) if (item.isObject())
                edges.add(new DagEdge(text(item, "id"), text(item, "source"), text(item, "target")));
        }
        return new DagGraph(nodes, edges);
    }

    private static String text(JsonNode node, String field) {
        if (node == null || node.get(field) == null || node.get(field).isNull()) return null;
        return node.get(field).asText();
    }

    private static String first(String first, String second) { return first == null ? second : first; }

    /**
     * Custom exception for DAG validation failures.
     */
    public static class DagValidationException extends RuntimeException {
        public DagValidationException(String message) {
            super(message);
        }
    }
}
