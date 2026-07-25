package io.yak.ops.engine.transform.domain;

import lombok.Data;

import java.util.List;

@Data
public class SplitTransformOptions implements TransformOptions {

    List<Split> splits;
}
