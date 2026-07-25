package io.yak.ops.application.job.handler.script;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import com.typesafe.config.ConfigRenderOptions;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

@Service
public class ScriptHoconRenderService {

    public String renderPluginBlock(String pluginName, Config config) {
        if (isEmptyConfig(config)) {
            return pluginName + " {\n}";
        }

        /*
         * If config already has plugin wrapper:
         *
         * Jdbc {
         *     ...
         * }
         *
         * unwrap it first, then render again in standard block style.
         */
        Config optionConfig = unwrapSinglePluginIfNecessary(config, pluginName);

        String body = renderConfigBody(optionConfig);

        if (StringUtils.isBlank(body)) {
            return pluginName + " {\n}";
        }

        return pluginName + " {\n"
                + indent(body, 4)
                + "\n}";
    }

    public Config unwrapSingleSectionIfNecessary(Config config, String section) {
        if (isEmptyConfig(config)) {
            return ConfigFactory.empty();
        }

        try {
            if (hasSingleRootKey(config, section)) {
                return config.getConfig(section);
            }
        } catch (Exception ignored) {
            return config;
        }

        return config;
    }

    public Config unwrapSinglePluginIfNecessary(Config config, String pluginName) {
        if (isEmptyConfig(config)) {
            return ConfigFactory.empty();
        }

        try {
            if (hasSingleRootKey(config, pluginName)) {
                return config.getConfig(pluginName);
            }
        } catch (Exception ignored) {
            return config;
        }

        return config;
    }

    public String renderConfigBody(Config config) {
        if (isEmptyConfig(config)) {
            return "";
        }

        return unwrapObject(renderConfigObject(config));
    }

    private String renderConfigObject(Config config) {
        if (isEmptyConfig(config)) {
            return "{}";
        }

        ConfigRenderOptions options = ConfigRenderOptions.defaults()
                .setComments(false)
                .setOriginComments(false)
                .setJson(false)
                .setFormatted(true);

        return config.root().render(options).trim();
    }

    private String unwrapObject(String rendered) {
        if (StringUtils.isBlank(rendered)) {
            return "";
        }

        String text = rendered.trim();

        if (text.startsWith("{") && text.endsWith("}")) {
            return text.substring(1, text.length() - 1).trim();
        }

        return text;
    }

    private boolean hasSingleRootKey(Config config, String key) {
        return config != null
                && config.root().keySet().size() == 1
                && config.root().keySet().contains(key);
    }

    private boolean isEmptyConfig(Config config) {
        return config == null || config.root().isEmpty();
    }

    private String indent(String text, int spaces) {
        if (StringUtils.isBlank(text)) {
            return "";
        }

        String prefix = repeat(" ", spaces);
        String[] lines = text.split("\\R");

        StringBuilder builder = new StringBuilder();
        for (String line : lines) {
            if (builder.length() > 0) {
                builder.append("\n");
            }
            builder.append(prefix).append(line);
        }

        return builder.toString();
    }

    private String repeat(String value, int times) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < times; i++) {
            builder.append(value);
        }
        return builder.toString();
    }
}
