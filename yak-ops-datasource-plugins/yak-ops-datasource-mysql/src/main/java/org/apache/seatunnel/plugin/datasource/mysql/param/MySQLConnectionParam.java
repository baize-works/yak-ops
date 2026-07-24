package org.apache.seatunnel.plugin.datasource.mysql.param;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;
import lombok.EqualsAndHashCode;
import io.baize.flow.common.KeyValuePair;
import io.baize.flow.common.deserializer.KeyValuePairListDeserializer;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.form.FieldType;
import io.baize.flow.plugin.spi.form.FormField;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Data
@EqualsAndHashCode(callSuper = true)
public class MySQLConnectionParam extends BaseConnectionParam {

    @FormField(
            label = "连接参数",
            type = FieldType.CUSTOM_SELECT,
            order = 7,
            defaultValue = "[{\"key\":\"useSSL\",\"value\":\"false\"},{\"key\":\"allowPublicKeyRetrieval\",\"value\":\"true\"}]"
    )
    @JsonDeserialize(using = KeyValuePairListDeserializer.class)
    protected List<KeyValuePair> other;

    @FormField(
            label = "驱动Jar包",
            order = 6,
            defaultValue = "mysql-connector-java-8.0.29.jar"
    )
    protected String driverLocation;

    @FormField(label = "Port", required = true, order = 2, defaultValue = "3306", type = FieldType.NUMBER)
    protected String port;

    public Map<String, String> getOtherAsMap() {
        if (other == null) {
            return new HashMap<>();
        }
        return other.stream()
                .filter(item -> item != null && item.getKey() != null && item.getValue() != null)
                .collect(Collectors.toMap(KeyValuePair::getKey, KeyValuePair::getValue));
    }

    @Override
    public String toString() {
        return "MySQLConnectionParam{" +
                "user='" + user + '\'' +
                ", password='" + password + '\'' +
                ", database='" + database + '\'' +
                ", url='" + url + '\'' +
                ", driverLocation='" + driverLocation + '\'' +
                ", driver='" + driver + '\'' +
                ", dbType=" + dbType +
                ", other=" + other +
                '}';
    }
}
