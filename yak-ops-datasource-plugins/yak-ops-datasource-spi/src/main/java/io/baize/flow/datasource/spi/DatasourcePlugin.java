package io.baize.flow.datasource.spi;

/**
 * Dependency-light descriptor implemented by datasource extensions.
 * Runtime discovery and JDBC orchestration deliberately live in datasource-support.
 */
public interface DatasourcePlugin {
    String type();
}
