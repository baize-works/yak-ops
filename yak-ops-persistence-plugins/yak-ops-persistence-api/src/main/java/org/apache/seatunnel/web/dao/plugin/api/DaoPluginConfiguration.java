package io.baize.flow.dao.plugin.api;

import com.baomidou.mybatisplus.annotation.DbType;
import io.baize.flow.dao.plugin.api.dialect.DatabaseDialect;
import io.baize.flow.dao.plugin.api.monitor.DatabaseMonitor;

/**
 * DaoPluginConfiguration used to configure the dao plugin.
 */
public interface DaoPluginConfiguration {

    DbType dbType();

    DatabaseMonitor databaseMonitor();

    DatabaseDialect databaseDialect();

}
