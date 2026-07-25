package io.yak.ops.plugin.spi.datasource;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import lombok.Data;
import io.yak.ops.plugin.spi.enums.DbType;
import io.yak.ops.plugin.spi.form.FieldType;
import io.yak.ops.plugin.spi.form.FormField;

@Data
@JsonInclude(Include.NON_NULL)
public abstract class BaseConnectionParam implements ConnectionParam {

    protected String url;

    @FormField(label = "主机地址IP", required = true, placeholder = "主机地址IP", order = 1, defaultValue = "127.0.0.1")
    private String host;

    @FormField(label = "端口号", required = true, placeholder = "3306", type = FieldType.NUMBER, order = 2)
    private String port;

    @FormField(label = "数据库", required = true, order = 3, defaultValue = "")
    protected String database;

    @FormField(label = "用户名", required = true, order = 4)
    protected String user;

    @FormField(label = "密码", required = true, type = FieldType.PASSWORD, order = 5)
    protected String password;

    @FormField(label = "驱动Jar包", order = 6)
    protected String driverLocation;

    protected String driver;

    protected DbType dbType;

    protected String schemaName;

}
