package org.apache.seatunnel.plugin.datasource.doris.option;

import com.google.auto.service.AutoService;
import lombok.extern.slf4j.Slf4j;
import org.apache.seatunnel.plugin.datasource.api.jdbc.AbstractSourceOptionRule;
import org.apache.seatunnel.plugin.datasource.api.jdbc.SourceOptionRule;
import io.baize.flow.common.config.Option;
import io.baize.flow.common.config.OptionRule;
import io.baize.flow.common.config.Options;

@AutoService(SourceOptionRule.class)
@Slf4j
public class DorisSourceOptionRule extends AbstractSourceOptionRule {

    private static final Option<String> FENODES =
            Options.key("fenodes").stringType().noDefaultValue().withDescription("Doris FE nodes HTTP address, e.g. localhost:8030");
    private static final Option<String> USERNAME =
            Options.key("username").stringType().noDefaultValue().withDescription("username");
    private static final Option<String> PASSWORD =
            Options.key("password").stringType().noDefaultValue().withDescription("password");

    @Override
    public String pluginName() {
        return "DORIS";
    }

    @Override
    public OptionRule sourceOptionRule() {
        return OptionRule.builder()
                .required(
                        FENODES,
                        USERNAME,
                        PASSWORD,
                        Options.key("database").stringType().noDefaultValue().withDescription("database")
                )
                .optional(
                        Options.key("table").stringType().noDefaultValue().withDescription("table"),
                        Options.key("doris.read.field").stringType().noDefaultValue().withDescription("select fields to read"),
                        Options.key("doris.filter.query").stringType().noDefaultValue().withDescription("filter query"),
                        Options.key("doris.batch.size").intType().defaultValue(1024).withDescription("max rows per BE read"),
                        Options.key("doris.exec.mem.limit").longType().defaultValue(2147483648L).withDescription("max memory per BE scan"),
                        Options.key("doris.request.retries").intType().defaultValue(3).withDescription("request retry times"),
                        Options.key("doris.request.read.timeout.ms").intType().defaultValue(30000).withDescription("read timeout ms"),
                        Options.key("doris.request.connect.timeout.ms").intType().defaultValue(30000).withDescription("connect timeout ms"),
                        Options.key("query-port").stringType().defaultValue("9030").withDescription("Doris query port"),
                        Options.key("doris.request.query.timeout.s").intType().defaultValue(3600).withDescription("query timeout seconds"),
                        Options.key("table_list").listType().noDefaultValue().withDescription("table list for multi-table source")
                )
                .build();
    }
}
