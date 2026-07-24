package org.apache.seatunnel.plugin.datasource.api.analysis;

import org.apache.commons.lang3.StringUtils;
import io.baize.flow.common.modal.JobDefinitionAnalysisResult;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class DatasourceJobDefinitionAnalyzerRegistry {

    private final Map<String, DatasourceJobDefinitionAnalyzer> analyzerMap;
    private final DefaultDatasourceJobDefinitionAnalyzer defaultAnalyzer;

    public DatasourceJobDefinitionAnalyzerRegistry(
            List<DatasourceJobDefinitionAnalyzer> analyzers,
            DefaultDatasourceJobDefinitionAnalyzer defaultAnalyzer) {

        this.defaultAnalyzer = defaultAnalyzer;

        this.analyzerMap = analyzers.stream()
                .filter(analyzer -> !(analyzer instanceof DefaultDatasourceJobDefinitionAnalyzer))
                .filter(analyzer -> StringUtils.isNotBlank(analyzer.type()))
                .collect(Collectors.toMap(
                        analyzer -> normalize(analyzer.type()),
                        Function.identity(),
                        (oldValue, newValue) -> newValue,
                        LinkedHashMap::new
                ));
    }

    public JobDefinitionAnalysisResult analyze(DatasourceAnalysisContext context) {
        String analyzerKey = resolveAnalyzerKey(context);

        DatasourceJobDefinitionAnalyzer analyzer = analyzerMap.get(normalize(analyzerKey));
        if (analyzer != null && analyzer.supports(context)) {
            return analyzer.analyze(context);
        }

        for (DatasourceJobDefinitionAnalyzer item : analyzerMap.values()) {
            if (item.supports(context)) {
                return item.analyze(context);
            }
        }

        return defaultAnalyzer.analyze(context);
    }

    private String resolveAnalyzerKey(DatasourceAnalysisContext context) {
        if (context == null) {
            return "";
        }

        if (StringUtils.isNotBlank(context.getPluginName())) {
            return context.getPluginName();
        }

        if (context.getDbType() != null) {
            return context.getDbType().toString();
        }

        return "";
    }

    private String normalize(String value) {
        return StringUtils.trimToEmpty(value)
                .replace("-", "_")
                .toUpperCase(Locale.ROOT);
    }
}