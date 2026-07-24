package org.apache.seatunnel.plugin.datasource.api.hocon.cdc;

import com.typesafe.config.Config;

import java.util.Map;

public interface CdcTableOptionResolver {

    /**
     * 当前 resolver 是否支持该 node 配置。
     */
    boolean supports(Config node);

    /**
     * 解析 CDC 表配置，并写入 HOCON map。
     */
    void resolve(Config conn, Config node, Map<String, Object> map);
}