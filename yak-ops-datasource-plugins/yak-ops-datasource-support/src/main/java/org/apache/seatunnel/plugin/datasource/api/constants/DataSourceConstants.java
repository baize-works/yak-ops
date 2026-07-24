
package org.apache.seatunnel.plugin.datasource.api.constants;

import com.google.common.collect.Sets;
import lombok.experimental.UtilityClass;
import io.baize.flow.common.constants.DateConstants;

import java.time.Duration;
import java.util.Set;
import java.util.regex.Pattern;

@UtilityClass
public class DataSourceConstants {

    public static final String ORG_POSTGRESQL_DRIVER = "org.postgresql.Driver";
    public static final String ORG_OPEN_GAUSS_DRIVER = "org.opengauss.Driver";
    public static final String COM_MYSQL_CJ_JDBC_DRIVER = "com.mysql.cj.jdbc.Driver";
    public static final String COM_MYSQL_JDBC_DRIVER = "com.mysql.jdbc.Driver";
    public static final String ORG_APACHE_HIVE_JDBC_HIVE_DRIVER = "org.apache.hive.jdbc.HiveDriver";
    public static final String COM_CLICKHOUSE_JDBC_DRIVER = "com.clickhouse.jdbc.ClickHouseDriver";
    public static final String COM_DATABEND_JDBC_DRIVER = "com.databend.jdbc.DatabendDriver";
    public static final String COM_ORACLE_JDBC_DRIVER = "oracle.jdbc.OracleDriver";
    public static final String COM_CACHE_JDBC_DRIVER = "com.intersys.jdbc.CacheDriver";
    public static final String COM_SQLSERVER_JDBC_DRIVER = "com.microsoft.sqlserver.jdbc.SQLServerDriver";
    public static final String COM_DB2_JDBC_DRIVER = "com.ibm.db2.jcc.DB2Driver";
    public static final String COM_PRESTO_JDBC_DRIVER = "com.facebook.presto.jdbc.PrestoDriver";
    public static final String COM_REDSHIFT_JDBC_DRIVER = "com.amazon.redshift.jdbc42.Driver";
    public static final String COM_ATHENA_JDBC_DRIVER = "com.simba.athena.jdbc.Driver";
    public static final String COM_TRINO_JDBC_DRIVER = "io.trino.jdbc.TrinoDriver";
    public static final String COM_DAMENG_JDBC_DRIVER = "dm.jdbc.driver.DmDriver";
    public static final String COM_KINGBASE_JDBC_DRIVER = "com.kingbase8.Driver";
    public static final String COM_KINGBASE_JDCB_DRIVER = COM_KINGBASE_JDBC_DRIVER;
    public static final String ORG_APACHE_KYUUBI_JDBC_DRIVER = "org.apache.kyuubi.jdbc.KyuubiHiveDriver";
    public static final String COM_OCEANBASE_JDBC_DRIVER = "com.oceanbase.jdbc.Driver";
    public static final String NET_SNOWFLAKE_JDBC_DRIVER = "net.snowflake.client.jdbc.SnowflakeDriver";
    public static final String COM_VERTICA_JDBC_DRIVER = "com.vertica.jdbc.Driver";
    public static final String COM_HANA_DB_JDBC_DRIVER = "com.sap.db.jdbc.Driver";
    public static final String ORG_SQLITE_JDBC_DRIVER = "org.sqlite.JDBC";
    // DataSourceConstants.java 中添加
    public static final String MONGODB_VALIDATION_QUERY = "{\"ping\": 1}";
    public static final String MONGODB_DEFAULT_DRIVER = "com.mongodb.client.MongoClient";

    // Doris
    public static final String JDBC_DORIS = "jdbc:mysql://";
    public static final String JDBC_DORIS_LOADBALANCE = "jdbc:mysql:loadbalance://";
    public static final String DORIS_VALIDATION_QUERY = "select 1";
    public static final int DORIS_DEFAULT_QUERY_PORT = 9030;
    public static final int DORIS_DEFAULT_HTTP_PORT = 8030;

    public static final String JDBC_SQLITE = "jdbc:sqlite:";
    public static final String JDBC_MYSQL = "jdbc:mysql://";
    public static final String JDBC_MYSQL_LOADBALANCE = "jdbc:mysql:loadbalance://";
    public static final String JDBC_TIDB = "jdbc:mysql://";
    public static final String JDBC_POSTGRESQL = "jdbc:postgresql://";
    public static final String JDBC_OPEN_GAUSS = "jdbc:opengauss://";
    public static final String JDBC_HIVE_2 = "jdbc:hive2://";
    public static final String JDBC_KYUUBI = "jdbc:kyuubi://";
    public static final String JDBC_CLICKHOUSE = "jdbc:clickhouse://";
    public static final String JDBC_DATABEND = "jdbc:databend://";
    public static final String JDBC_ORACLE_SID = "jdbc:oracle:thin:@";
    public static final String JDBC_ORACLE_SERVICE_NAME = "jdbc:oracle:thin:@//";
    public static final String JDBC_SQLSERVER = "jdbc:sqlserver://";
    public static final String JDBC_DB2 = "jdbc:db2://";
    public static final String JDBC_PRESTO = "jdbc:presto://";
    public static final String JDBC_REDSHIFT = "jdbc:redshift://";
    public static final String JDBC_REDSHIFT_IAM = "jdbc:redshift:iam://";
    public static final String JDBC_ATHENA = "jdbc:awsathena://";
    public static final String JDBC_TRINO = "jdbc:trino://";
    public static final String JDBC_DAMENG = "jdbc:dm://";
    public static final String JDBC_KINGBASE = "jdbc:kingbase8://";
    public static final String JDBC_OCEANBASE = "jdbc:oceanbase://";
    public static final String JDBC_SNOWFLAKE = "jdbc:snowflake://";
    public static final String JDBC_VERTICA = "jdbc:vertica://";
    public static final String JDBC_HANA = "jdbc:sap://";
    public static final String JDBC_CACHE = "jdbc:Cache://";

    public static final String POSTGRESQL_VALIDATION_QUERY = "select version()";
    public static final String OPENGAUSS_VALIDATION_QUERY = "select version()";
    public static final String KINGBASE_VALIDATION_QUERY = "select 1";
    public static final String MYSQL_VALIDATION_QUERY = "select 1";
    public static final String TIDB_VALIDATION_QUERY = "select 1";
    public static final String HIVE_VALIDATION_QUERY = "select 1";
    public static final String CLICKHOUSE_VALIDATION_QUERY = "select 1";
    public static final String DATABEND_VALIDATION_QUERY = "select 1";
    public static final String ORACLE_VALIDATION_QUERY = "select 1 from dual";
    public static final String SQLSERVER_VALIDATION_QUERY = "select 1";
    public static final String DB2_VALIDATION_QUERY = "select 1 from sysibm.sysdummy1";
    public static final String PRESTO_VALIDATION_QUERY = "select 1";
    public static final String REDHIFT_VALIDATION_QUERY = "select 1";
    public static final String ATHENA_VALIDATION_QUERY = "select 1";
    public static final String TRINO_VALIDATION_QUERY = "select 1";
    public static final String DAMENG_VALIDATION_QUERY = "select 1";
    public static final String SNOWFLAKE_VALIDATION_QUERY = "select 1";
    public static final String CACHE_VALIDATION_QUERY = "select 1";
    public static final String SQLITE_VALIDATION_QUERY = "SELECT 1";


}
