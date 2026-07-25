package org.apache.seatunnel.plugin.datasource.dameng.param;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.commons.collections4.MapUtils;
import io.baize.flow.common.KeyValuePair;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.form.FieldType;
import io.baize.flow.plugin.spi.form.FormField;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Dameng connection parameters.
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class DamengConnectionParam extends BaseConnectionParam {
    /**
     * Database Port
     */
    @FormField(label = "端口号", defaultValue = "5236", required = true, order = 2, type = FieldType.NUMBER, placeholder = "Please enter the port")
    protected String port;

    /**
     * Schema Name
     */
    @FormField(label = "模式", order = 4, required = true, defaultValue = "SYSDBA", placeholder = "Please enter the schema name")
    protected String schemaName;

    @FormField(
            label = "驱动Jar包",
            order = 6,
            defaultValue = "DmJdbcDriver18.jar"
    )
    protected String driverLocation;

    /**
     * Connection parameters
     */
    @FormField(label = "连接参数", order = 7, type = FieldType.CUSTOM_SELECT,
            defaultValue = "[{\"key\":\"ssl\",\"value\":\"false\"}]")
    protected List<KeyValuePair> other;

    /**
     * Convert other parameters to Map
     */
    public Map<String, String> getOtherAsMap() {
        Map<String, String> result = new HashMap<>();
        if (other != null && !other.isEmpty()) {
            for (KeyValuePair kv : other) {
                if (kv != null && kv.getKey() != null && kv.getValue() != null) {
                    result.put(kv.getKey(), kv.getValue());
                }
            }
        }
        return result;
    }

    /**
     * Set other parameters from Map
     */
    public void setOtherFromMap(Map<String, String> map) {
        List<KeyValuePair> list = new ArrayList<>();
        if (MapUtils.isNotEmpty(map)) {
            map.forEach((k, v) -> list.add(new KeyValuePair(k, v)));
        }
        this.other = list;
    }

    @Override
    public String toString() {
        return "DamengConnectionParam{" +
                "user='" + user + '\'' +
                ", password='" + password + '\'' +
                ", database='" + database + '\'' +
                ", schemaName='" + schemaName + '\'' +
                ", url='" + url + '\'' +
                ", driverLocation='" + driverLocation + '\'' +
                ", driver='" + driver + '\'' +
                ", dbType=" + dbType +
                '}';
    }
}
