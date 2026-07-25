package io.yak.ops.engine.client.transfrom.domain;

import lombok.Data;

import java.util.List;

@Data
public class CopyTransformOptions implements TransformOptions {

    private List<Copy> copyList;
}
