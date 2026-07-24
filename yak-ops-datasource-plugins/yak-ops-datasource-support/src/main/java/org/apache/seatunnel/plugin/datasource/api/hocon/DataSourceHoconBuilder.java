package org.apache.seatunnel.plugin.datasource.api.hocon;

import com.typesafe.config.Config;

public interface DataSourceHoconBuilder {

    /**
     * Unique plugin name, for example:
     * Jdbc, MySQL-CDC, Kafka, Hive, LocalFile
     */
    String pluginName();

    /**
     * Source HOCON builder.
     */
    Config buildSourceHocon(HoconBuildContext context);

    /**
     * Sink HOCON builder.
     */
    Config buildSinkHocon(HoconBuildContext context);

    /**
     * Whether this builder supports source side.
     */
    default boolean supportsSource() {
        return true;
    }

    /**
     * Whether this builder supports sink side.
     */
    default boolean supportsSink() {
        return true;
    }

    /**
     * Database-specific time literal rendering.
     * JDBC-like builders can override this.
     */
    default String renderTimeLiteral(String value, String timeFormat) {
        if (value == null) {
            return "NULL";
        }
        return "'" + value.replace("'", "''") + "'";
    }

    default String sourceTemplate() {
        return "";
    }

    default String sinkTemplate() {
        return "";
    }
}