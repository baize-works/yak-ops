package org.apache.seatunnel.plugin.datasource.api.analysis;


import io.baize.flow.common.modal.JobDefinitionAnalysisResult;

public interface DatasourceJobDefinitionAnalyzer {

    String type();

    boolean supports(DatasourceAnalysisContext context);

    JobDefinitionAnalysisResult analyze(DatasourceAnalysisContext context);
}