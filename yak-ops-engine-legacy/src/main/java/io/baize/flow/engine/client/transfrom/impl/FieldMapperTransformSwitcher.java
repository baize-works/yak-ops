package io.baize.flow.engine.client.transfrom.impl;

import com.google.auto.service.AutoService;
import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.engine.client.transfrom.TransformConfigSwitcher;
import io.baize.flow.engine.client.transfrom.domain.FieldMapperField;
import io.baize.flow.engine.client.transfrom.domain.FieldMapperMapping;
import io.baize.flow.engine.client.transfrom.domain.FieldMapperTransformOptions;
import io.baize.flow.engine.client.transfrom.domain.Transform;
import io.baize.flow.engine.client.transfrom.domain.TransformOptions;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@AutoService(TransformConfigSwitcher.class)
public class FieldMapperTransformSwitcher implements TransformConfigSwitcher {

    @Override
    public Transform getTransform() {
        return Transform.FIELDMAPPER;
    }

    @Override
    public Config transform(TransformOptions options) {
        if (!(options instanceof FieldMapperTransformOptions)) {
            throw new IllegalArgumentException(
                    "Invalid TransformOptions type for FieldMapper: "
                            + (options == null ? "null" : options.getClass().getName())
            );
        }

        FieldMapperTransformOptions transformOptions =
                (FieldMapperTransformOptions) options;

        validate(transformOptions);

        String pluginInput = transformOptions.getEffectivePluginInput();
        String pluginOutput = transformOptions.getEffectivePluginOutput();

        Map<String, Object> fieldMapper = buildFieldMapper(transformOptions);

        log.info(
                "Generating FieldMapper config, plugin_input={}, plugin_output={}, field_count={}",
                pluginInput,
                pluginOutput,
                fieldMapper.size()
        );

        Map<String, Object> fieldMapperConfig = new HashMap<>();
        fieldMapperConfig.put("plugin_input", pluginInput);
        fieldMapperConfig.put("plugin_output", pluginOutput);
        fieldMapperConfig.put("field_mapper", fieldMapper);

        Map<String, Object> root = new HashMap<>();
        root.put("FieldMapper", fieldMapperConfig);

        Config config = ConfigFactory.parseMap(root);

        log.debug("Generated FieldMapper config: {}", config.root().render());

        return config;
    }

    private Map<String, Object> buildFieldMapper(FieldMapperTransformOptions options) {
        Map<String, Object> fieldMapper = new HashMap<>();

        /**
         * New structure:
         * config.mappings: [
         *   {
         *     sourceField,
         *     targetField,
         *     enabled
         *   }
         * ]
         */
        List<FieldMapperMapping> mappings = options.getEffectiveMappings();
        if (CollectionUtils.isNotEmpty(mappings)) {
            for (FieldMapperMapping mapping : mappings) {
                if (Boolean.FALSE.equals(mapping.getEnabled())) {
                    continue;
                }

                fieldMapper.put(
                        mapping.getSourceField(),
                        mapping.getTargetField()
                );
            }

            return fieldMapper;
        }

        /**
         * Old structure:
         * transformColumns: [
         *   {
         *     fieldName,
         *     targetFieldName
         *   }
         * ]
         */
        if (CollectionUtils.isNotEmpty(options.getTransformColumns())) {
            for (FieldMapperField field : options.getTransformColumns()) {
                fieldMapper.put(
                        field.getFieldName(),
                        field.getTargetFieldName()
                );
            }
        }

        return fieldMapper;
    }

    private void validate(FieldMapperTransformOptions options) {
        String pluginInput = options.getEffectivePluginInput();
        String pluginOutput = options.getEffectivePluginOutput();

        if (StringUtils.isBlank(pluginInput)) {
            throw new IllegalArgumentException("plugin_input must not be empty");
        }

        if (StringUtils.isBlank(pluginOutput)) {
            throw new IllegalArgumentException("plugin_output must not be empty");
        }

        List<FieldMapperMapping> mappings = options.getEffectiveMappings();

        /**
         * Validate new structure first.
         */
        if (CollectionUtils.isNotEmpty(mappings)) {
            for (FieldMapperMapping mapping : mappings) {
                if (Boolean.FALSE.equals(mapping.getEnabled())) {
                    continue;
                }

                if (StringUtils.isBlank(mapping.getSourceField())) {
                    throw new IllegalArgumentException("sourceField must not be empty");
                }

                if (StringUtils.isBlank(mapping.getTargetField())) {
                    throw new IllegalArgumentException(
                            "targetField must not be empty for sourceField: "
                                    + mapping.getSourceField()
                    );
                }
            }

            return;
        }

        /**
         * Validate old structure.
         */
        if (CollectionUtils.isEmpty(options.getTransformColumns())) {
            throw new IllegalArgumentException("mappings must not be empty");
        }

        for (FieldMapperField field : options.getTransformColumns()) {
            if (StringUtils.isBlank(field.getFieldName())) {
                throw new IllegalArgumentException("source field name must not be empty");
            }

            if (StringUtils.isBlank(field.getTargetFieldName())) {
                throw new IllegalArgumentException(
                        "target field name must not be empty for source field: "
                                + field.getFieldName()
                );
            }
        }
    }
}