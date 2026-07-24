package io.baize.flow.application.job.parser;

import com.fasterxml.jackson.databind.node.ObjectNode;

public class JobDefinitionValidator {

    public void validate(ObjectNode jobJson) {

        if (jobJson == null) {
            throw new IllegalArgumentException("Job definition cannot be null");
        }

        if (!jobJson.has("source")) {
            throw new IllegalArgumentException("Missing source configuration");
        }

        if (!jobJson.has("target")) {
            throw new IllegalArgumentException("Missing target configuration");
        }
    }
}