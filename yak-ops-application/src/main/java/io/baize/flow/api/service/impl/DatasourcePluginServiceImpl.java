package io.baize.flow.api.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import io.baize.flow.api.service.DatasourcePluginService;
import io.baize.flow.common.utils.JSONUtils;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.dao.entity.DataSourcePluginConfig;
import io.baize.flow.dao.repository.DataSourcePluginConfigDao;
import io.baize.flow.plugin.spi.enums.DbType;
import io.baize.flow.plugin.spi.enums.Status;
import io.baize.flow.plugin.spi.form.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class DatasourcePluginServiceImpl implements DatasourcePluginService {

    @Resource
    private DataSourcePluginConfigDao dataSourcePluginConfigDao;

    @Override
    public PluginConfigResponse getPluginConfig(String pluginType) {
        validatePluginType(pluginType);

        DbType dbType = parseDbType(pluginType);
        DataSourcePluginConfig config = dataSourcePluginConfigDao.queryByPluginType(dbType);

        // If config not found, return empty response with install hint
        if (config == null) {
            log.warn("Datasource plugin config not found, pluginType={}", dbType);
            PluginConfigResponse response = new PluginConfigResponse();
            response.setPluginType(dbType);
            response.setFormFields(new ArrayList<>());
            response.setInstallRequired(true);
            response.setInstallHint("请先安装 " + dbType.name() + " 数据源插件");
            return response;
        }

        ObjectNode schema = parseSchema(config.getConfigSchema());

        PluginConfigResponse response = new PluginConfigResponse();
        response.setPluginType(config.getPluginType());
        response.setFormFields(parseConfigSchema(schema));
        return response;
    }

    @Override
    public void installPlugin(String pluginType) {
        validatePluginType(pluginType);

        DbType dbType = parseDbType(pluginType);

        if (dataSourcePluginConfigDao.existsByPluginType(dbType)) {
            return;
        }

        try {
            DataSourceProcessor processor = DataSourceUtils.getDatasourceProcessor(dbType);
            if (processor == null) {
                throw new ServiceException(Status.QUERY_DATASOURCE_ERROR, "Datasource processor not found: " + dbType);
            }

            List<FormFieldConfig> fields = processor.generateFormFields();

            ObjectNode schema = JSONUtils.createObjectNode();
            schema.set("fields", JSONUtils.toJsonNode(fields));

            DataSourcePluginConfig existing =
                    dataSourcePluginConfigDao.queryByPluginType(dbType);

            if (existing != null) {
                existing.setConfigSchema(JSONUtils.toJsonString(schema));
                existing.initUpdate();

                dataSourcePluginConfigDao.updatePluginConfig(existing);
                return;
            }

            DataSourcePluginConfig entity = new DataSourcePluginConfig();
            entity.setPluginType(dbType);
            entity.setConfigSchema(JSONUtils.toJsonString(schema));
            entity.initInsert();

            int rows = dataSourcePluginConfigDao.insertPluginConfig(entity);
            if (rows <= 0) {
                throw new ServiceException(Status.UPDATE_DATASOURCE_ERROR, "Install datasource plugin failed: " + dbType);
            }
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to install datasource plugin, pluginType={}", pluginType, e);
            throw new ServiceException(Status.UPDATE_DATASOURCE_ERROR, e.getMessage());
        }
    }

    private DataSourcePluginConfig getPluginConfigOrThrow(DbType dbType) {
        try {
            DataSourcePluginConfig config = dataSourcePluginConfigDao.queryByPluginType(dbType);
            if (config == null) {
                log.warn("Datasource plugin config not found, pluginType={}", dbType);
                throw new ServiceException(Status.QUERY_DATASOURCE_ERROR, "Plugin configuration not found: " + dbType);
            }
            return config;
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to query datasource plugin config, pluginType={}", dbType, e);
            throw new ServiceException(Status.QUERY_DATASOURCE_ERROR, e.getMessage());
        }
    }

    private void validatePluginType(String pluginType) {
        if (StringUtils.isBlank(pluginType)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "pluginType");
        }
    }

    private DbType parseDbType(String pluginType) {
        try {
            return DbType.valueOf(pluginType.trim().toUpperCase());
        } catch (Exception e) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "pluginType");
        }
    }

    private ObjectNode parseSchema(String schemaText) {
        if (StringUtils.isBlank(schemaText)) {
            throw new ServiceException(Status.QUERY_DATASOURCE_ERROR, "Config schema is empty");
        }

        try {
            JsonNode jsonNode = JSONUtils.parseObject(schemaText);
            if (!(jsonNode instanceof ObjectNode)) {
                throw new ServiceException(Status.QUERY_DATASOURCE_ERROR, "Config schema must be a JSON object");
            }
            return (ObjectNode) jsonNode;
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse datasource plugin schema, schema={}", schemaText, e);
            throw new ServiceException(Status.QUERY_DATASOURCE_ERROR, "Invalid config schema");
        }
    }

    private List<FormFieldConfig> parseConfigSchema(ObjectNode schema) {
        JsonNode fieldsNode = schema.get("fields");
        if (fieldsNode == null || !fieldsNode.isArray() || fieldsNode.isEmpty()) {
            return new ArrayList<>();
        }

        ArrayNode fields = (ArrayNode) fieldsNode;
        List<FormFieldConfig> formFields = new ArrayList<>(fields.size());
        for (JsonNode fieldNode : fields) {

            if (fieldNode instanceof ObjectNode) {
                ObjectNode objectNode = (ObjectNode) fieldNode;
                formFields.add(parseField(objectNode));
            }
        }
        return formFields;
    }

    private FormFieldConfig parseField(ObjectNode fieldNode) {
        FormFieldConfig field = new FormFieldConfig();
        field.setKey(getText(fieldNode, "key"));
        field.setLabel(getText(fieldNode, "label"));
        field.setType(parseFieldType(fieldNode));
        field.setPlaceholder(getText(fieldNode, "placeholder"));
        field.setDefaultValue(getValue(fieldNode.get("defaultValue")));

        if (FieldType.SELECT.equals(field.getType())) {
            field.setOptions(parseOptions(fieldNode.get("options")));
        }

        field.setRules(parseRules(fieldNode.get("rules")));
        return field;
    }

    private FieldType parseFieldType(ObjectNode fieldNode) {
        String type = getText(fieldNode, "type");
        if (StringUtils.isBlank(type)) {
            throw new ServiceException(Status.QUERY_DATASOURCE_ERROR, "Field type must not be empty");
        }

        try {
            return FieldType.valueOf(type.trim().toUpperCase());
        } catch (Exception e) {
            throw new ServiceException(Status.QUERY_DATASOURCE_ERROR, "Unsupported field type: " + type);
        }
    }

    private List<Option> parseOptions(JsonNode optionsNode) {
        if (optionsNode == null || !optionsNode.isArray() || optionsNode.isEmpty()) {
            return new ArrayList<>();
        }

        List<Option> options = new ArrayList<>(optionsNode.size());
        for (JsonNode optionNode : optionsNode) {
            if (!(optionNode instanceof ObjectNode)) {
                continue;
            }
            ObjectNode objectNode = (ObjectNode) optionNode;

            Option option = new Option();
            option.setLabel(getText(objectNode, "label"));
            option.setValue(getValue(objectNode.get("value")));
            options.add(option);
        }
        return options;
    }

    private List<Rule> parseRules(JsonNode rulesNode) {
        if (rulesNode == null || !rulesNode.isArray() || rulesNode.isEmpty()) {
            return new ArrayList<>();
        }

        List<Rule> rules = new ArrayList<>(rulesNode.size());
        for (JsonNode ruleNode : rulesNode) {
            if (!(ruleNode instanceof ObjectNode)) {
                continue;
            }
            ObjectNode objectNode = (ObjectNode) ruleNode;

            Rule rule = new Rule();
            rule.setPattern(getText(objectNode, "pattern"));
            rule.setMessage(getText(objectNode, "message"));
            rule.setMin(getInteger(objectNode, "min"));
            rule.setMax(getInteger(objectNode, "max"));
            rule.setRequired(getBoolean(objectNode, "required"));
            rules.add(rule);
        }
        return rules;
    }

    private String getText(ObjectNode node, String key) {
        JsonNode value = node.get(key);
        if (value == null || value.isNull()) {
            return null;
        }
        return value.isTextual() ? value.asText() : value.toString();
    }

    private Integer getInteger(ObjectNode node, String key) {
        JsonNode value = node.get(key);
        return value == null || value.isNull() ? null : value.asInt();
    }

    private Boolean getBoolean(ObjectNode node, String key) {
        JsonNode value = node.get(key);
        return value == null || value.isNull() ? null : value.asBoolean();
    }

    private Object getValue(JsonNode value) {
        if (value == null || value.isNull()) {
            return null;
        }
        if (value.isTextual()) {
            return value.asText();
        }
        if (value.isInt()) {
            return value.asInt();
        }
        if (value.isLong()) {
            return value.asLong();
        }
        if (value.isBoolean()) {
            return value.asBoolean();
        }
        if (value.isFloat() || value.isDouble() || value.isBigDecimal()) {
            return value.asDouble();
        }
        return value.toString();
    }
}