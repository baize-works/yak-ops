package io.yak.ops.application.job.handler.script;

import com.typesafe.config.Config;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import io.yak.ops.common.config.ConfigValidator;
import io.yak.ops.common.config.ReadonlyConfig;
import io.yak.ops.web.contract.dto.config.ScriptJobContent;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ScriptHoconValidateService {

    private static final String SOURCE = "source";
    private static final String SINK = "sink";

    public void validateContent(ScriptJobContent content) {
        if (content == null) {
            throw new IllegalArgumentException("content can not be null");
        }

        if (StringUtils.isBlank(content.getHoconContent())) {
            throw new IllegalArgumentException("hoconContent can not be blank");
        }
    }

    public void validateRequiredBlocks(Config config) {
        if (config == null || !config.hasPath(SOURCE)) {
            throw new IllegalArgumentException("hocon source can not be empty");
        }

        if (!config.hasPath(SINK)) {
            throw new IllegalArgumentException("hocon sink can not be empty");
        }
    }

    public void validatePluginSection(String section, List<PluginConfig> plugins) {
        if (plugins == null || plugins.isEmpty()) {
            throw new IllegalArgumentException("hocon " + section + " can not be empty");
        }
    }

    public void validateSourceConfig(DataSourceProcessor processor,
                                     String pluginName,
                                     Config sourceConfig) {
        ConfigValidator.of(ReadonlyConfig.fromConfig(sourceConfig))
                .validate(processor.sourceOptionRule(pluginName));
    }

    public void validateSinkConfig(DataSourceProcessor processor,
                                   Config sinkConfig) {
        ConfigValidator.of(ReadonlyConfig.fromConfig(sinkConfig))
                .validate(processor.sinkOptionRule());
    }
}
