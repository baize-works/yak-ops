package io.baize.flow.application.job.handler.single;


import java.util.*;

public final class WorkflowNodeHelper {

    private WorkflowNodeHelper() {
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> safeMap(Object obj) {
        if (obj instanceof Map) {
            return (Map<String, Object>) obj;
        }
        return Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    public static List<Map<String, Object>> castToMapList(Object obj) {
        if (!(obj instanceof List)) {
            return Collections.emptyList();
        }

        List<?> rawList = (List<?>) obj;
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : rawList) {
            if (item instanceof Map) {
                result.add((Map<String, Object>) item);
            }
        }
        return result;
    }

    public static List<Map<String, Object>> getNodes(Map<String, Object> workflow) {
        return castToMapList(workflow.get("nodes"));
    }

    public static List<Map<String, Object>> getEdges(Map<String, Object> workflow) {
        return castToMapList(workflow.get("edges"));
    }

    public static List<Map<String, Object>> findNodesByType(List<Map<String, Object>> nodes, String nodeType) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> node : nodes) {
            Map<String, Object> data = safeMap(node.get("data"));
            String currentNodeType = getString(data, "nodeType");
            if (nodeType.equalsIgnoreCase(currentNodeType)) {
                result.add(node);
            }
        }
        return result;
    }

    public static Map<String, Object> findFirstNodeByType(Map<String, Object> workflow, String nodeType) {
        List<Map<String, Object>> nodes = getNodes(workflow);
        for (Map<String, Object> node : nodes) {
            Map<String, Object> data = safeMap(node.get("data"));
            String currentNodeType = getString(data, "nodeType");
            if (nodeType.equalsIgnoreCase(currentNodeType)) {
                return node;
            }
        }
        return Collections.emptyMap();
    }

    public static Set<String> collectNodeIds(List<Map<String, Object>> nodes) {
        Set<String> ids = new HashSet<>();
        for (Map<String, Object> node : nodes) {
            String id = getString(node, "id");
            if (!id.isEmpty()) {
                ids.add(id);
            }
        }
        return ids;
    }

    public static String getNodeId(Map<String, Object> node) {
        return getString(node, "id");
    }

    public static String getString(Map<String, Object> map, String key) {
        if (map == null || map.isEmpty() || key == null) {
            return "";
        }
        Object value = map.get(key);
        return value == null ? "" : safeTrim(String.valueOf(value));
    }

    public static String firstNonBlank(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value.trim();
            }
        }
        return "";
    }

    public static String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }
}
