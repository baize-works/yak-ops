package io.yak.ops.engine.transform.domain;

import lombok.Data;

import java.util.List;

@Data
public class CopyTransformOptions implements TransformOptions {

    private List<Copy> copyList;
}
