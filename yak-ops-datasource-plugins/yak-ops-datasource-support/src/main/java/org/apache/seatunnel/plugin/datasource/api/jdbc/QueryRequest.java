package org.apache.seatunnel.plugin.datasource.api.jdbc;

import lombok.Data;
import org.apache.seatunnel.plugin.datasource.api.enums.TaskExecutionTypeEnum;
import io.baize.flow.plugin.spi.datasource.BaseConnectionParam;

import java.util.Map;

@Data
public class QueryRequest {

    private TaskExecutionTypeEnum taskExecuteType;
    private TablePath tablePath;
    private String query;
    private int limit = 20;

    public static QueryRequest from(Map<String, Object> body, BaseConnectionParam param) {
        QueryRequest req = new QueryRequest();
        req.taskExecuteType = TaskExecutionTypeEnum.valueOf(body.get("read_mode").toString().toUpperCase());
        switch (req.taskExecuteType) {
            case SQL:
                if (body.containsKey("query")) {
                    req.query = body.get("query").toString();
                } else {
                    throw new RuntimeException("query not exist");
                }
                break;
            case TABLE:
                if (body.containsKey("table_path")) {
                    req.tablePath = TablePath.of(
                            param.getDatabase(),
                            param.getSchemaName(),
                            body.get("table_path").toString()
                    );
                } else {
                    throw new RuntimeException("table_path not exist");
                }
                break;
            default:
                break;
        }
        return req;
    }
}

