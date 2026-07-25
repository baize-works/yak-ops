package io.yak.ops.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class FrontedTableColumn {
    private String title;
    private String dataIndex;
    private String key;
    private boolean ellipsis;
}
