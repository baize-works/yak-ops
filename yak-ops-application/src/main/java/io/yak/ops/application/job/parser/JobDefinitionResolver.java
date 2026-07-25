package io.yak.ops.application.job.parser;


import io.yak.ops.application.job.model.NodeTypes;

public interface JobDefinitionResolver {

    NodeTypes resolveDag(String jobInfo);

    NodeTypes resolveWholeSync(String jobInfo);
}

