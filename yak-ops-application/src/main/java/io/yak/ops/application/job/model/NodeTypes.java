package io.yak.ops.application.job.model;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class NodeTypes {
    private String sourceTypes;
    private String sinkTypes;
    private Map<String, List<String>> sourceTableMap;
    private Map<String, List<String>> sinkTableMap;

    public NodeTypes(String sourceTypes, String sinkTypes) {
        this.sourceTypes = sourceTypes;
        this.sinkTypes = sinkTypes;
    }
}
