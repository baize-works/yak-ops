package io.baize.flow.plugin.spi.form;

import lombok.Data;

import java.util.List;


@Data
public class FormFieldConfig {
    private String key;
    private String label;
    private FieldType type;
    private String placeholder;
    private Object defaultValue;
    private List<Option> options;
    private List<Rule> rules;
    private int order;
}
