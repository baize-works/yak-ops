package org.apache.seatunnel.plugin.datasource.mysql.cdc.support;

public final class MysqlCdcExpectedValues {

    public static final String LOG_BIN_ON = "ON";

    public static final String BINLOG_FORMAT_ROW = "ROW";

    public static final String BINLOG_ROW_IMAGE_FULL = "FULL";

    public static final String SERVER_ID_POSITIVE = "> 0";

    public static final String REQUIRED_PRIVILEGES =
            "SELECT、RELOAD、SHOW DATABASES、REPLICATION SLAVE、REPLICATION CLIENT";

    private MysqlCdcExpectedValues() {
    }
}