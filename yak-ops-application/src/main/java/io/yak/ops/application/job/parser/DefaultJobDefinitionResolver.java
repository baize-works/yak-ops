package io.yak.ops.application.job.parser;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.application.job.model.NodeTypes;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class DefaultJobDefinitionResolver implements JobDefinitionResolver {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public NodeTypes resolveDag(String jobInfo) {

        if (StringUtils.isBlank(jobInfo)) {
            throw new IllegalArgumentException("jobDefinitionInfo cannot be empty");
        }

        try {
            JsonNode rootNode = OBJECT_MAPPER.readTree(jobInfo);
            JsonNode nodes = rootNode.path("nodes");

            if (!nodes.isArray() || nodes.isEmpty()) {
                throw new IllegalArgumentException("nodes must be a non-empty array");
            }

            List<String> sourceTypes = new ArrayList<>();
            List<String> sinkTypes = new ArrayList<>();

            // 关键优化点：一对多结构
            Map<String, List<String>> sourceTableMap = new LinkedHashMap<>();
            Map<String, List<String>> sinkTableMap = new LinkedHashMap<>();

            nodes.forEach(node -> {

                JsonNode data = node.path("data");

                String nodeType = data.path("nodeType").asText(null);
                String type = data.path("type").asText(null);

                if (StringUtils.isBlank(nodeType) || StringUtils.isBlank(type)) {
                    return;
                }

                if ("source".equalsIgnoreCase(nodeType)) {

                    sourceTypes.add(type);

                    String sourceId = data.path("sourceId").asText(null);
                    String tablePath = data.path("table_path").asText(null);
                    String query = data.path("query").asText(null);
                    String taskExecuteType = data.path("taskExecuteType").asText(null);
                    if (StringUtils.isNotBlank(sourceId)) {
                        sourceTableMap
                                .computeIfAbsent(sourceId, k -> new ArrayList<>());

                        if (StringUtils.isNotBlank(query) && "TABLE_CUSTOM".equals(taskExecuteType)) {
                            sourceTableMap.get(sourceId).add(query);
                        } else {
                            if (StringUtils.isNotBlank(tablePath) && "SINGLE_TABLE".equals(taskExecuteType) ){
                                sourceTableMap.get(sourceId).add(tablePath);
                            }
                        }
                    }

                } else if ("sink".equalsIgnoreCase(nodeType)) {
                    sinkTypes.add(type);
                    String sinkId = data.path("sinkId").asText(null);
                    String table = data.path("table").asText(null);
                    if (StringUtils.isNotBlank(sinkId)) {
                        sinkTableMap
                                .computeIfAbsent(sinkId, k -> new ArrayList<>());

                        if (StringUtils.isNotBlank(table)) {
                            sinkTableMap.get(sinkId).add(table);
                        }
                    }
                }
            });

            if (sourceTypes.isEmpty() && sinkTypes.isEmpty()) {
                throw new IllegalArgumentException("No valid source or sink nodes found");
            }

            NodeTypes nodeTypes = new NodeTypes(
                    String.join(",", sourceTypes),
                    String.join(",", sinkTypes)
            );

            nodeTypes.setSourceTableMap(sourceTableMap);
            nodeTypes.setSinkTableMap(sinkTableMap);


            return nodeTypes;

        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse jobDefinitionInfo", e);
        }
    }

    @Override
    public NodeTypes resolveWholeSync(String jobInfo) {

        if (StringUtils.isBlank(jobInfo)) {
            throw new IllegalArgumentException("jobInfo cannot be empty");
        }

        try {
            JsonNode rootNode = OBJECT_MAPPER.readTree(jobInfo);

            JsonNode sourceNode = rootNode.path("source");
            JsonNode targetNode = rootNode.path("target");
            JsonNode tableMatchNode = rootNode.path("tableMatch");

            if (sourceNode.isMissingNode()
                    || targetNode.isMissingNode()
                    || tableMatchNode.isMissingNode()) {
                throw new IllegalArgumentException("Missing required fields");
            }

            String sourceType = sourceNode.path("dbType").asText(null);
            String sinkType = targetNode.path("dbType").asText(null);

            if (StringUtils.isBlank(sourceType) || StringUtils.isBlank(sinkType)) {
                throw new IllegalArgumentException("dbType cannot be empty");
            }

            JsonNode tablesNode = tableMatchNode.path("tables");
            if (!tablesNode.isArray() || tablesNode.isEmpty()) {
                throw new IllegalArgumentException("tables must be a non-empty array");
            }

            List<String> tables = new ArrayList<>();

            tablesNode.forEach(node -> {
                String table = node.asText(null);
                if (StringUtils.isNotBlank(table)) {
                    tables.add(table);
                }
            });

            if (tables.isEmpty()) {
                throw new IllegalArgumentException("No valid tables found");
            }

            // 构造 Map 结构（一对多）
            Map<String, List<String>> sourceTableMap = new LinkedHashMap<>();
            Map<String, List<String>> sinkTableMap = new LinkedHashMap<>();

            // WholeSync 默认一个 source / 一个 sink
            sourceTableMap.put(sourceType, tables);
            sinkTableMap.put(sinkType, tables);

            NodeTypes nodeTypes = new NodeTypes(sourceType, sinkType);
            nodeTypes.setSourceTableMap(sourceTableMap);
            nodeTypes.setSinkTableMap(sinkTableMap);

            return nodeTypes;

        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid wholeSync job definition", e);
        }
    }

}
