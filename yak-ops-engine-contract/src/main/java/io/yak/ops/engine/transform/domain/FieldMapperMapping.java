package io.yak.ops.engine.transform.domain;

import lombok.Data;

@Data
public class FieldMapperMapping {

    private String id;

    /**
     * Source field name.
     */
    private String sourceField;

    /**
     * Target field name.
     */
    private String targetField;

    /**
     * Target field type.
     */
    private String targetType;

    /**
     * Optional expression.
     */
    private String expression;

    /**
     * Whether this mapping is enabled.
     */
    private Boolean enabled;
}
