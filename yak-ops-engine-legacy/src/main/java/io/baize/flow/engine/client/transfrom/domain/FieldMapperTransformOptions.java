package io.baize.flow.engine.client.transfrom.domain;

import lombok.Data;

import java.util.List;

@Data
public class FieldMapperTransformOptions implements TransformOptions {

    private String nodeType;

    private String type;

    private String title;

    private String transformType;

    private String componentType;

    /**
     * 注意：这里原来是 filedsChanged，拼写有误。
     * 如果前端已经用了这个字段，可以先保留。
     */
    private boolean filedsChanged;

    /**
     * New frontend config structure.
     *
     * {
     *   config: {
     *     pluginInput,
     *     pluginOutput,
     *     mappings
     *   }
     * }
     */
    private FieldMapperConfig config;

    /**
     * Old flat structure, keep for compatibility.
     */
    private String pluginInput;

    private String pluginOutput;

    private List<FieldMapperField> transformColumns;

    public String getEffectivePluginInput() {
        if (config != null && config.getPluginInput() != null) {
            return config.getPluginInput();
        }
        return pluginInput;
    }

    public String getEffectivePluginOutput() {
        if (config != null && config.getPluginOutput() != null) {
            return config.getPluginOutput();
        }
        return pluginOutput;
    }

    public List<FieldMapperMapping> getEffectiveMappings() {
        if (config != null) {
            return config.getMappings();
        }
        return null;
    }
}