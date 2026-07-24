package io.baize.flow.engine.client.transfrom.domain;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ChangeOrder extends TransformOption {

    private int index;
}
