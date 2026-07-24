package org.apache.seatunnel.plugin.datasource.api.analysis;


import io.baize.flow.common.modal.JobDefinitionAnalysisResult;

/**
 * Analyze SeaTunnel job definition and extract datasource-related metadata.
 *
 * The analyzer is used to parse source/sink datasource id, datasource type,
 * and table information from job definition content.
 */
public interface JobDefinitionAnalyzer {

    /**
     * Whether this analyzer supports current analysis context.
     */
    boolean supports(DatasourceAnalysisContext context);

    /**
     * Analyze job definition context and return final job definition analysis result.
     */
    JobDefinitionAnalysisResult analyze(DatasourceAnalysisContext context);
}