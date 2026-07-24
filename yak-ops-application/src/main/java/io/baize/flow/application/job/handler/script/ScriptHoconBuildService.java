package io.baize.flow.application.job.handler.script;

import com.typesafe.config.Config;
import io.baize.flow.application.support.utils.SeaTunnelConfigUtil;
import io.baize.flow.web.contract.dto.command.JobDefinitionSaveCommand;
import io.baize.flow.web.contract.dto.config.ScriptJobContent;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ScriptHoconBuildService {

    private static final String SOURCE = "source";
    private static final String SINK = "sink";
    private static final String TRANSFORM = "transform";
    private static final String ENV = "env";

    private final ScriptJobDefinitionParser scriptJobDefinitionParser;
    private final ScriptDatasourceHoconBuildService datasourceHoconBuildService;
    private final ScriptHoconValidateService hoconValidateService;
    private final ScriptHoconRenderService hoconRenderService;

    public ScriptHoconBuildService(ScriptJobDefinitionParser scriptJobDefinitionParser,
                                   ScriptDatasourceHoconBuildService datasourceHoconBuildService,
                                   ScriptHoconValidateService hoconValidateService,
                                   ScriptHoconRenderService hoconRenderService) {
        this.scriptJobDefinitionParser = scriptJobDefinitionParser;
        this.datasourceHoconBuildService = datasourceHoconBuildService;
        this.hoconValidateService = hoconValidateService;
        this.hoconRenderService = hoconRenderService;
    }

    public String build(ScriptJobContent content, JobDefinitionSaveCommand command) {
        hoconValidateService.validateContent(content);

        Config rootConfig = scriptJobDefinitionParser.parseAndValidate(content.getHoconContent());

        hoconValidateService.validateRequiredBlocks(rootConfig);

        /*
         * SeaTunnelConfigUtil.generateConfig(...) already wraps:
         *
         * env { ... }
         * source { ... }
         * transform { ... }
         * sink { ... }
         *
         * So here we only provide the body of each section.
         */
        String envHocon = rootConfig.hasPath(ENV)
                ? hoconRenderService.renderConfigBody(rootConfig.getConfig(ENV))
                : "";

        String sourceHocon = buildPluginSectionBody(rootConfig, SOURCE);

        String transformHocon = rootConfig.hasPath(TRANSFORM)
                ? hoconRenderService.renderConfigBody(rootConfig.getConfig(TRANSFORM))
                : "";

        String sinkHocon = buildPluginSectionBody(rootConfig, SINK);

        return SeaTunnelConfigUtil.generateConfig(
                envHocon,
                sourceHocon,
                transformHocon,
                sinkHocon
        );
    }

    private String buildPluginSectionBody(Config rootConfig, String section) {
        List<PluginConfig> plugins = scriptJobDefinitionParser.getPluginConfigs(rootConfig, section);

        hoconValidateService.validatePluginSection(section, plugins);

        StringBuilder builder = new StringBuilder();

        for (PluginConfig plugin : plugins) {
            Config builtPluginConfig = datasourceHoconBuildService.buildPluginHocon(plugin, section);

            /*
             * If builder returns:
             *
             * source {
             *     Jdbc {
             *         ...
             *     }
             * }
             *
             * unwrap source/sink first.
             */
            Config normalizedConfig = hoconRenderService.unwrapSingleSectionIfNecessary(
                    builtPluginConfig,
                    section
            );

            /*
             * Always render plugin as:
             *
             * Jdbc {
             *     ...
             * }
             */
            builder.append(hoconRenderService.renderPluginBlock(
                    plugin.getPluginName(),
                    normalizedConfig
            ))
                    .append("\n");
        }

        return builder.toString().trim();
    }
}