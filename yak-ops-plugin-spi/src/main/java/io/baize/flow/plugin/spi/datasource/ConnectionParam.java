package io.baize.flow.plugin.spi.datasource;

import io.baize.flow.plugin.spi.enums.DbType;

import java.io.Serializable;

/**
 * The model of Datasource Connection param
 */
public interface ConnectionParam extends Serializable {

    default String getUser() {
        return "";
    }

    default void setUser(String s) {
    }

    default String getPassword() {
        return "";
    }

    default void setPassword(String s) {
    }

    default String getUrl() {
        return "";
    }

    default void setUrl(String s) {
    }

    default DbType getDbType() {
        return null;
    }

    default void setDbType(DbType dbType) {
    }

}
