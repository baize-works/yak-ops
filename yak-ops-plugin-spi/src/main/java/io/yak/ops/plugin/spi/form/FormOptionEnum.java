package io.yak.ops.plugin.spi.form;

/**
 * 枚举类型动态表单选项。
 */
public interface FormOptionEnum {

    /**
     * 前端展示名称。
     */
    String getLabel();

    /**
     * 前端提交值。
     *
     * 使用枚举名称，Jackson 可以直接反序列化为对应枚举。
     */
    default String getValue() {
        return ((Enum<?>) this).name();
    }
}
