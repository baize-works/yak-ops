package io.baize.flow.engine.client.transfrom.domain;

import lombok.Data;

import java.util.List;

@Data
public class SplitTransformOptions implements TransformOptions {

    List<Split> splits;
}
