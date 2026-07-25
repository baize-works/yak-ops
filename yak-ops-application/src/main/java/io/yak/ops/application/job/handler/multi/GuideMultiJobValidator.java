package io.yak.ops.application.job.handler.multi;

import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.application.model.dto.config.GuideMultiJobContent;
import org.springframework.stereotype.Component;

@Component
public class GuideMultiJobValidator {

    public void validate(GuideMultiJobContent content) {
        if (content == null) {
            throw new IllegalArgumentException("content can not be null");
        }

        validateSource(content.getSource());
        validateTarget(content.getTarget());
        validateTableMatch(content.getTableMatch());
    }

    private void validateSource(GuideMultiJobContent.WorkflowSourceConfig source) {
        if (source == null) {
            throw new IllegalArgumentException("source can not be null");
        }

        if (StringUtils.isBlank(source.getDatasourceId())) {
            throw new IllegalArgumentException("source.datasourceId can not be blank");
        }

        if (StringUtils.isBlank(source.getDbType())) {
            throw new IllegalArgumentException("source.dbType can not be blank");
        }

        if (StringUtils.isBlank(source.getPluginName())) {
            throw new IllegalArgumentException("source.pluginName can not be blank");
        }
    }

    private void validateTarget(GuideMultiJobContent.WorkflowTargetConfig target) {
        if (target == null) {
            throw new IllegalArgumentException("target can not be null");
        }

        if (StringUtils.isBlank(target.getDatasourceId())) {
            throw new IllegalArgumentException("target.datasourceId can not be blank");
        }

        if (StringUtils.isBlank(target.getDbType())) {
            throw new IllegalArgumentException("target.dbType can not be blank");
        }

        if (StringUtils.isBlank(target.getPluginName())) {
            throw new IllegalArgumentException("target.pluginName can not be blank");
        }
    }

    private void validateTableMatch(GuideMultiJobContent.TableMatchConfig tableMatch) {
        if (tableMatch == null) {
            throw new IllegalArgumentException("tableMatch can not be null");
        }

        if (StringUtils.isBlank(tableMatch.getMode())) {
            throw new IllegalArgumentException("tableMatch.mode can not be blank");
        }

        String mode = tableMatch.getMode();

        if (!"1".equals(mode) && !"2".equals(mode) && !"3".equals(mode) && !"4".equals(mode)) {
            throw new IllegalArgumentException("Unsupported tableMatch.mode: " + mode);
        }

        if ("1".equals(mode) || "4".equals(mode)) {
            if (CollectionUtils.isEmpty(tableMatch.getTables())) {
                throw new IllegalArgumentException("tableMatch.tables can not be empty");
            }
        }

        if ("2".equals(mode) || "3".equals(mode)) {
            if (StringUtils.isBlank(tableMatch.getKeyword())) {
                throw new IllegalArgumentException("tableMatch.keyword can not be blank");
            }
        }
    }
}
