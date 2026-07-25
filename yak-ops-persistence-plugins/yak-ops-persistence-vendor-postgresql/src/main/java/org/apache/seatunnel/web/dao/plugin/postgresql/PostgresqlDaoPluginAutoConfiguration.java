package io.baize.flow.dao.plugin.postgresql;

import com.baomidou.mybatisplus.annotation.DbType;
import io.baize.flow.dao.plugin.api.DaoPluginConfiguration;
import io.baize.flow.dao.plugin.api.dialect.DatabaseDialect;
import io.baize.flow.dao.plugin.api.monitor.DatabaseMonitor;
import io.baize.flow.dao.plugin.postgresql.dialect.PostgresqlDialect;
import io.baize.flow.dao.plugin.postgresql.monitor.PostgresqlMonitor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "baize.flow.database", name = "type", havingValue = "postgresql")
public class PostgresqlDaoPluginAutoConfiguration implements DaoPluginConfiguration {

    private final DatabaseMonitor databaseMonitor;
    private final DatabaseDialect databaseDialect;

    public PostgresqlDaoPluginAutoConfiguration(DataSource dataSource) {
        this.databaseMonitor = new PostgresqlMonitor(dataSource);
        this.databaseDialect = new PostgresqlDialect(dataSource);
    }

    @Override
    public DbType dbType() {
        return DbType.POSTGRE_SQL;
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
