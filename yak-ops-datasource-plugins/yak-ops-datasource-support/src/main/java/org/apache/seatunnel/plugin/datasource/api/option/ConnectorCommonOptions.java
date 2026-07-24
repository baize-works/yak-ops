package org.apache.seatunnel.plugin.datasource.api.option;


import com.fasterxml.jackson.core.type.TypeReference;
import io.baize.flow.common.config.Option;
import io.baize.flow.common.config.Options;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

public class ConnectorCommonOptions implements
        Serializable {

   public static final Option<List<String>> TABLE_NAMES =
            Options.key("table-names")
                    .listType()
                    .noDefaultValue()
                    .withDescription(
                            "List of table names of databases to capture.");

    public static final Option<String> DATABASE_PATTERN =
            Options.key("database-pattern")
                    .stringType()
                    .defaultValue(".*")
                    .withDescription("The database names RegEx of the database to capture.");

    public static final Option<String> TABLE_PATTERN =
            Options.key("table-pattern")
                    .stringType()
                    .noDefaultValue()
                    .withDescription(
                            "The table names RegEx of the database to capture."
                                    + "The table name needs to include the database name, for example: database_.*\\.table_.*");

    Option<List<Map<String, Object>>> TABLE_LIST =
            Options.key("table_list")
                    .type(new TypeReference<List<Map<String, Object>>>() {})
                    .noDefaultValue()
                    .withDescription(
                            "SeaTunnel Multi Table Schema, acts on structed data sources. "
                                    + "such as jdbc, paimon, doris, etc");

}
