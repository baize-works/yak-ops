package io.yak.ops.engine.transform.domain;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
public class Split extends TransformOption {

    private String separator;

    private List<String> outputFields;
}
