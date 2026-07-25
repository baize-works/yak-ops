package io.yak.ops.dao.plugin.h2;

import com.baomidou.mybatisplus.annotation.DbType;
import io.yak.ops.dao.plugin.api.DaoPluginConfiguration;
import io.yak.ops.dao.plugin.api.dialect.DatabaseDialect;
import io.yak.ops.dao.plugin.api.monitor.DatabaseMonitor;
import io.yak.ops.dao.plugin.h2.dialect.H2Dialect;
import io.yak.ops.dao.plugin.h2.monitor.H2Monitor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "yak.ops.database", name = "type", havingValue = "h2")
public class H2DaoPluginAutoConfiguration implements DaoPluginConfiguration {

    private final DatabaseMonitor databaseMonitor;
    private final DatabaseDialect databaseDialect;

    public H2DaoPluginAutoConfiguration(DataSource dataSource) {
        this.databaseMonitor = new H2Monitor(dataSource);
        this.databaseDialect = new H2Dialect();
    }

    @Override
    public DbType dbType() {
        return DbType.H2;
    }

    @Override
    public DatabaseMonitor databaseMonitor() {
        return databaseMonitor;
    }

    @Override
    public DatabaseDialect databaseDialect() {
        return databaseDialect;
    }
}
