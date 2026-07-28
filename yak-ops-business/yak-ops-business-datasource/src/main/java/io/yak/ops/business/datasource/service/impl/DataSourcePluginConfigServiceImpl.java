package io.yak.ops.business.datasource.service.impl;

import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.exception.DataSourceException;
import io.yak.ops.business.datasource.service.DataSourcePluginConfigService;
import io.yak.ops.common.bean.vo.datasource.DataSourcePluginConfigVO;
import io.yak.ops.common.bean.vo.datasource.DataSourcePluginConfigVO.FormFieldVO;
import io.yak.ops.common.bean.vo.datasource.DataSourcePluginConfigVO.RuleVO;
import io.yak.ops.common.enums.datasource.DataSourceDbType;
import io.yak.ops.common.enums.datasource.DataSourceErrorCode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Service;

/** 内置 JDBC 数据源动态表单配置服务。 */
@Service
@ConditionalOnDataSourceEnabled
public class DataSourcePluginConfigServiceImpl implements DataSourcePluginConfigService {

  @Override
  public DataSourcePluginConfigVO getPluginConfig(String pluginType) {
    DataSourceDbType dbType = parseDbType(pluginType);
    return DataSourcePluginConfigVO.builder()
        .pluginType(dbType.name())
        .formFields(buildFields(dbType))
        .installRequired(false)
        .build();
  }

  @Override
  public boolean installPlugin(String pluginType) {
    parseDbType(pluginType);
    return true;
  }

  private DataSourceDbType parseDbType(String value) {
    try {
      return DataSourceDbType.parse(value);
    } catch (IllegalArgumentException exception) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_DB_TYPE,
          exception.getMessage(),
          exception);
    }
  }

  private List<FormFieldVO> buildFields(DataSourceDbType dbType) {
    List<FormFieldVO> fields = new ArrayList<>();
    fields.add(
        field(
            "host",
            "主机地址",
            "INPUT",
            "请输入数据库主机地址",
            "127.0.0.1",
            required("请输入主机地址")));
    fields.add(
        field(
            "port",
            "端口",
            "NUMBER",
            "请输入数据库端口",
            dbType.getDefaultPort(),
            rangeRule(1, 65535, "端口必须在 1 到 65535 之间")));
    fields.add(
        field(
            "database",
            dbType == DataSourceDbType.ORACLE ? "服务名 / 数据库" : "数据库",
            "INPUT",
            "请输入数据库名称",
            null,
            required("请输入数据库名称")));
    fields.add(
        field(
            "username",
            "用户名",
            "INPUT",
            "请输入数据库用户名",
            null,
            required("请输入数据库用户名")));
    fields.add(
        field(
            "password",
            "密码",
            "PASSWORD",
            "请输入数据库密码",
            null,
            Collections.emptyList()));
    fields.add(
        field(
            "jdbcUrl",
            "JDBC 地址",
            "INPUT",
            "可选；留空时根据主机、端口和数据库自动生成",
            null,
            Collections.emptyList()));
    fields.add(
        field(
            "driverClassName",
            "驱动类",
            "INPUT",
            "请输入 JDBC Driver Class",
            dbType.getDefaultDriverClassName(),
            required("请输入 JDBC 驱动类")));
    fields.add(
        field(
            "properties",
            "扩展属性",
            "TEXTAREA",
            "可选；请输入 JSON 对象，例如 {\"useSSL\":\"false\"}",
            null,
            Collections.emptyList()));
    return fields;
  }

  private FormFieldVO field(
      String key,
      String label,
      String type,
      String placeholder,
      Object defaultValue,
      List<RuleVO> rules) {
    return FormFieldVO.builder()
        .key(key)
        .label(label)
        .type(type)
        .placeholder(placeholder)
        .defaultValue(defaultValue)
        .rules(rules)
        .build();
  }

  private List<RuleVO> required(String message) {
    return Collections.singletonList(
        RuleVO.builder()
            .required(true)
            .message(message)
            .build());
  }

  private List<RuleVO> rangeRule(int min, int max, String message) {
    return Collections.singletonList(
        RuleVO.builder()
            .required(true)
            .min(min)
            .max(max)
            .message(message)
            .build());
  }
}
