package io.yak.ops.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class KeyValuePair {
    private String key;
    private String value;
}
