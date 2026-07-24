package io.baize.flow.application.job.parser;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.dao.entity.BatchJobDefinition;

import java.util.Set;

@RequiredArgsConstructor
public class JobDefinitionParser {

    private final WholeSyncResolver wholeSyncResolver;
    private final NodeExtractor nodeExtractor;
    private final JobDefinitionValidator validator;

    public ObjectNode parse(String jobInfo) {

        JsonNode node = JSONUtils.parseObject(jobInfo);

        if (!(node instanceof ObjectNode)) {
            throw new IllegalArgumentException("Invalid job definition JSON");
        }

        ObjectNode jobJson = (ObjectNode) node;

        validator.validate(jobJson);

        return jobJson;
    }

    public void resolveWholeSync(BatchJobDefinition po, ObjectNode jobJson) {
        wholeSyncResolver.resolve(po, jobJson);
    }

    public Set<String> extractNodeTypes(ObjectNode jobJson) {
        return nodeExtractor.extractNodeTypes(jobJson);
    }
}