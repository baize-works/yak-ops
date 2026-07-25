package io.yak.ops.dao.plugin.mysql;

import com.baomidou.mybatisplus.annotation.DbType;
import io.yak.ops.dao.plugin.api.DaoPluginConfiguration;
import io.yak.ops.dao.plugin.api.dialect.DatabaseDialect;
import io.yak.ops.dao.plugin.api.monitor.DatabaseMonitor;
import io.yak.ops.dao.plugin.mysql.dialect.MysqlDialect;
import io.yak.ops.dao.plugin.mysql.monitor.MysqlMonitor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "yak.ops.database", name = "type", havingValue = "mysql")
public class MysqlDaoPluginAutoConfiguration implements DaoPluginConfiguration {

    private final DatabaseMonitor databaseMonitor;
    private final DatabaseDialect databaseDialect;

    public MysqlDaoPluginAutoConfiguration(DataSource dataSource) {
        this.databaseMonitor = new MysqlMonitor(dataSource);
        this.databaseDialect = new MysqlDialect(dataSource);
    }

    @Override
    public DbType dbType() {
        return DbType.MYSQL;
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
