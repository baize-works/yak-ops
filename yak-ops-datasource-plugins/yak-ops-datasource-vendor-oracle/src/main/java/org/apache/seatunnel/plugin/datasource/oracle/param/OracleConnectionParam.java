package org.apache.seatunnel.plugin.datasource.oracle.param;


import lombok.Data;
import lombok.EqualsAndHashCode;
import io.yak.ops.plugin.spi.datasource.BaseConnectionParam;
import io.yak.ops.plugin.spi.enums.DbConnectType;
import io.yak.ops.plugin.spi.form.FieldType;
import io.yak.ops.plugin.spi.form.FormField;

@Data
@EqualsAndHashCode(callSuper = true)
public class OracleConnectionParam extends BaseConnectionParam {

    @FormField(
            label = "连接方式",
            required = true,
            type = FieldType.SELECT,
            order = 3,
            defaultValue = "ORACLE_SERVICE_NAME"
    )
    protected DbConnectType connectType;

    @FormField(label = "端口号", required = true, order = 2, defaultValue = "1521", type = FieldType.NUMBER)
    protected String port;

    @FormField(
            label = "驱动Jar包",
            order = 6,
            defaultValue = "ojdbc8-19.3.0.0.jar"
    )
    protected String driverLocation;


    @Override
    public String toString() {
        return "OracleConnectionParam{" +
                "user='" + user + '\'' +
                ", password='" + password + '\'' +
                ", database='" + database + '\'' +
                ", schemaName='" + schemaName + '\'' +
                ", url='" + url + '\'' +
                ", driverLocation='" + driverLocation + '\'' +
                ", driver='" + driver + '\'' +
                ", connectType='" + connectType + '\'' +
                ", dbType=" + dbType +
                '}';
    }
}
