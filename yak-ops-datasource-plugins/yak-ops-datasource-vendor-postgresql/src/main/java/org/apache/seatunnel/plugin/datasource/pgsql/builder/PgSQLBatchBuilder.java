package org.apache.seatunnel.plugin.datasource.pgsql.builder;

import com.google.auto.service.AutoService;
import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.constants.DataSourceConstants;
import org.apache.seatunnel.plugin.datasource.api.hocon.AbstractJdbcBatchBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.DataSourceHoconBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.JdbcBatchConstants;
import org.apache.seatunnel.plugin.datasource.api.hocon.table.JdbcMultiSinkTargetBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.table.JdbcMultiSourceTargetBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.table.JdbcSingleSinkTargetBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.table.JdbcSingleSourceTargetBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.table.JdbcSinkTargetBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.table.JdbcSourceTargetBuilder;
import org.apache.seatunnel.plugin.datasource.api.hocon.table.JdbcTableNameResolver;
import org.apache.seatunnel.plugin.datasource.api.jdbc.JdbcConnectionProvider;
import io.baize.flow.common.enums.HoconBuildStage;

import java.util.HashMap;
import java.util.Map;

@AutoService(DataSourceHoconBuilder.class)
public class PgSQLBatchBuilder extends AbstractJdbcBatchBuilder {
    
    private final JdbcSourceTargetBuilder pgSingleSourceBuilder;
    private final JdbcSourceTargetBuilder pgMultiSourceBuilder;
//    private final JdbcSinkTargetBuilder pgSingleSinkBuilder;
    
    public PgSQLBatchBuilder() {
        super();
        
        JdbcTableNameResolver tableNameResolver = new JdbcTableNameResolver();
        
        // PostgreSQL-specific source builders (already handled by parent)
        this.pgSingleSourceBuilder = null; // Use parent's
        this.pgMultiSourceBuilder = null;  // Use parent's
        
        // PostgreSQL-specific sink builder with schema.table format
//        this.pgSingleSinkBuilder = new PgSQLSingleSinkTargetBuilder(tableNameResolver);
    }
    
    @Override
    protected String defaultDriver() {
        return DataSourceConstants.ORG_POSTGRESQL_DRIVER;
    }
    
    @Override
    protected String buildTablePath(String database, String schemaName, String table) {
        // PostgreSQL requires schema in table path: database.schema.table
        // If schema is not provided, use default 'public' schema
        String schema = StringUtils.isNotBlank(schemaName) ? schemaName : "public";
        return String.format("%s.%s.%s", database, schema, table);
    }
    
//    @Override
//    public Config buildSinkHocon(String connectionParam, Config config) {
//        Config conn = ConfigFactory.parseString(connectionParam);
//        Map<String, Object> map = new HashMap<>(32);
//
//        putConnCommon(conn, map);
//
//        // Use PostgreSQL-specific sink builder
////        pgSingleSinkBuilder.build(config, conn, map);
//
//        // Append common options
//        appendSinkOptions(config, map);
//
//        return ConfigFactory.parseMap(map);
//    }
    
    private void appendSinkOptions(Config config, Map<String, Object> map) {
        // Add common sink options
        if (!map.containsKey(JdbcBatchConstants.GENERATE_SINK_SQL)) {
            map.put(JdbcBatchConstants.GENERATE_SINK_SQL, true);
        }
        if (!map.containsKey(JdbcBatchConstants.BATCH_SIZE)) {
            map.put(JdbcBatchConstants.BATCH_SIZE, 1000);
        }
    }
    
    @Override
    public String pluginName() {
        return "JDBC-POSTGRESQL";
    }
}
