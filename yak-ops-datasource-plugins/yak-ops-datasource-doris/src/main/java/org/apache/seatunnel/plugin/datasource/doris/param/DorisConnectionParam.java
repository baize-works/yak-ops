package org.apache.seatunnel.plugin.datasource.doris.param;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;
import lombok.EqualsAndHashCode;
import io.baize.flow.common.KeyValuePair;
import io.baize.flow.common.deserializer.KeyValuePairListDeserializer;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;
import io.baize.flow.plugin.spi.form.FieldType;
import io.baize.flow.plugin.spi.form.FormField;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Doris 连接参数。
 *
 * <p>Doris 使用双端口架构：</p>
 * <ul>
 *   <li><b>fenodes</b> (FE HTTP端口, 默认8030) — 用于 StreamLoad 方式读写数据</li>
 *   <li><b>queryPort</b> (MySQL协议端口, 默认9030) — 用于 JDBC 元数据查询</li>
 * </ul>
 *
 * <p>JDBC URL 自动构建：从 fenodes 中提取所有 host，端口替换为 queryPort。
 * 单节点用 jdbc:mysql://，多节点用 jdbc:mysql:loadbalance://。</p>
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class DorisConnectionParam extends BaseConnectionParam {

    /**
     * Doris FE HTTP 地址，用于 StreamLoad 方式读写数据。
     * 支持多节点逗号分隔，格式: "host1:http_port1,host2:http_port2,..."
     * 默认端口 8030。
     */
    @FormField(
            label = "FE节点地址",
            required = true,
            placeholder = "FE HTTP地址, 多节点逗号分隔, 如: host1:8030,host2:8030",
            order = 1,
            defaultValue = "127.0.0.1:8030"
    )
    protected String fenodes;

    /**
     * Doris query port，MySQL 协议端口，用于 JDBC 元数据查询。
     * 从 fenodes 中提取 host 列表，端口替换为此值构建 JDBC URL。
     */
    @FormField(
            label = "查询端口",
            required = true,
            placeholder = "Doris MySQL协议端口",
            type = FieldType.NUMBER,
            order = 2,
            defaultValue = "9030"
    )
    protected String queryPort;

    /**
     * 覆盖父类的 port 字段，移除 @FormField 注解。
     * Doris 不需要独立的端口表单字段，端口信息已包含在 fenodes 和 queryPort 中。
     */
    protected String port;

    /**
     * 覆盖父类的 host 字段，移除 @FormField 注解。
     * Doris 不需要独立的 host 表单字段，host 信息已包含在 fenodes 中。
     */
    protected String host;

    @FormField(
            label = "驱动Jar包",
            order = 6,
            defaultValue = "mysql-connector-java-8.0.29.jar"
    )
    protected String driverLocation;

    @FormField(
            label = "连接参数",
            type = FieldType.CUSTOM_SELECT,
            order = 7,
            defaultValue = "[{\"key\":\"useSSL\",\"value\":\"false\"}]"
    )
    @JsonDeserialize(using = KeyValuePairListDeserializer.class)
    protected List<KeyValuePair> other;

    /**
     * 解析 fenodes 中的所有节点地址。
     * 支持格式: "host1:port1,host2:port2,host3:port3"
     *
     * @return 节点地址列表，每个元素为 "host:port"
     */
    public List<String> parseFenodesList() {
        if (fenodes == null || fenodes.trim().isEmpty()) {
            return List.of();
        }
        return Arrays.stream(fenodes.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    /**
     * 从 fenodes 中提取所有 host，端口替换为 queryPort，
     * 返回用于构建 JDBC URL 的节点列表。
     *
     * <p>例如: fenodes="192.168.1.101:8030,192.168.1.102:8030", queryPort=9030
     * → ["192.168.1.101:9030", "192.168.1.102:9030"]</p>
     */
    public List<String> getQueryNodes() {
        int qp = getQueryPortAsInt();
        return parseFenodesList().stream()
                .map(node -> {
                    String[] parts = node.split(":");
                    return parts[0].trim() + ":" + qp;
                })
                .collect(Collectors.toList());
    }

    /**
     * 获取 queryPort 的整数值，默认 9030。
     */
    public int getQueryPortAsInt() {
        if (queryPort == null || queryPort.trim().isEmpty()) {
            return 9030;
        }
        try {
            return Integer.parseInt(queryPort.trim());
        } catch (NumberFormatException e) {
            return 9030;
        }
    }

    /**
     * 从 fenodes 中解析出第一个 FE host（不含端口）。
     */
    public String getFeHost() {
        List<String> nodes = parseFenodesList();
        if (nodes.isEmpty()) {
            return "127.0.0.1";
        }
        String[] parts = nodes.get(0).split(":");
        return parts[0].trim();
    }

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
        return "DorisConnectionParam{" +
                "fenodes='" + fenodes + '\'' +
                ", queryPort='" + queryPort + '\'' +
                ", user='" + user + '\'' +
                ", database='" + database + '\'' +
                ", dbType=" + dbType +
                ", other=" + other +
                '}';
    }
}
