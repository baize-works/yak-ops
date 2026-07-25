package org.apache.seatunnel.plugin.datasource.api.form;

import io.yak.ops.common.KeyValuePair;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.plugin.spi.form.FieldType;
import io.yak.ops.plugin.spi.form.FormField;
import io.yak.ops.plugin.spi.form.FormFieldConfig;
import io.yak.ops.plugin.spi.form.Option;
import io.yak.ops.plugin.spi.form.Rule;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Reflection-based generator that converts a parameter class annotated with
 * {@link FormField} into a list of {@link FormFieldConfig}.
 *
 * <p>
 * This utility is mainly used by datasource plugins to dynamically generate
 * frontend form configuration based on backend parameter definitions.
 * </p>
 *
 * <p>Supported features:</p>
 * <ul>
 *     <li>Supports inheritance and scans fields from child and parent classes</li>
 *     <li>Prevents duplicated fields, and child fields override parent fields</li>
 *     <li>Automatically generates validation rules for required fields</li>
 *     <li>Supports parsing JSON default values for List fields</li>
 *     <li>Automatically converts enum fields to SELECT components</li>
 *     <li>Automatically generates options for enum fields</li>
 *     <li>Supports enum getLabel() and getDesc() as option labels</li>
 *     <li>Sorts fields according to the configured order</li>
 * </ul>
 */
public final class ReflectionFormGenerator {

    private static final String ENUM_LABEL_METHOD = "getLabel";
    private static final String ENUM_DESC_METHOD = "getDesc";

    private ReflectionFormGenerator() {
        // Utility class
    }

    /**
     * Generate form configuration from a parameter class.
     *
     * @param paramClass parameter class containing {@link FormField} annotations
     * @return frontend form field configuration
     */
    public static List<FormFieldConfig> generate(Class<?> paramClass) {

        Objects.requireNonNull(paramClass, "paramClass must not be null");

        Map<String, Field> fieldMap = collectFields(paramClass);

        List<FormFieldConfig> formFields = new ArrayList<>(fieldMap.size());

        for (Field field : fieldMap.values()) {

            FormField formField = field.getAnnotation(FormField.class);

            if (formField == null) {
                continue;
            }

            FormFieldConfig config = buildFieldConfig(field, formField);
            formFields.add(config);
        }

        formFields.sort(
                Comparator.comparing(
                        FormFieldConfig::getOrder,
                        Comparator.nullsLast(Integer::compareTo)
                )
        );

        return formFields;
    }

    /**
     * Collect fields from the current class and its parent classes.
     *
     * <p>
     * The child class is scanned first. When the child class and parent class
     * contain fields with the same name, the child field takes precedence.
     * </p>
     */
    private static Map<String, Field> collectFields(Class<?> paramClass) {

        Map<String, Field> fieldMap = new LinkedHashMap<>();

        Class<?> currentClass = paramClass;

        while (currentClass != null && currentClass != Object.class) {

            Field[] declaredFields = currentClass.getDeclaredFields();

            for (Field field : declaredFields) {

                if (field.isSynthetic() || Modifier.isStatic(field.getModifiers())) {
                    continue;
                }

                /*
                 * Because the child class is scanned first, putIfAbsent ensures
                 * that parent fields do not overwrite child fields.
                 */
                fieldMap.putIfAbsent(field.getName(), field);
            }

            currentClass = currentClass.getSuperclass();
        }

        return fieldMap;
    }

    /**
     * Build a single form field configuration.
     */
    private static FormFieldConfig buildFieldConfig(
            Field field,
            FormField formField) {

        FormFieldConfig config = new FormFieldConfig();

        config.setKey(field.getName());
        config.setLabel(formField.label());
        config.setPlaceholder(formField.placeholder());
        config.setOrder(formField.order());

        /*
         * Enum fields are automatically rendered as SELECT.
         *
         * For example:
         * DbConnectType connectType
         *
         * will generate:
         * type = SELECT
         * options = [
         *   {label: "Oracle Service Name", value: "ORACLE_SERVICE_NAME"},
         *   {label: "Oracle SID", value: "ORACLE_SID"}
         * ]
         */
        if (field.getType().isEnum()) {
            config.setType(FieldType.SELECT);
            config.setOptions(buildEnumOptions(field.getType()));
        } else {
            config.setType(formField.type());
        }

        applyRequiredRule(config, formField);
        applyDefaultValue(config, field, formField);

        return config;
    }

    /**
     * Generate required validation rule.
     */
    private static void applyRequiredRule(
            FormFieldConfig config,
            FormField formField) {

        if (!formField.required()) {
            return;
        }

        Rule rule = new Rule();
        rule.setRequired(true);
        rule.setMessage(formField.label() + " cannot be empty");

        config.setRules(Collections.singletonList(rule));
    }

    /**
     * Parse and apply the field default value.
     */
    private static void applyDefaultValue(
            FormFieldConfig config,
            Field field,
            FormField formField) {

        String defaultValue = formField.defaultValue();

        if (defaultValue == null || defaultValue.isEmpty()) {
            return;
        }

        /*
         * List fields use JSON strings as default values.
         *
         * Example:
         * [
         *   {"key":"useSSL","value":"false"},
         *   {"key":"allowPublicKeyRetrieval","value":"true"}
         * ]
         */
        if (List.class.isAssignableFrom(field.getType())) {
            config.setDefaultValue(
                    JSONUtils.toList(defaultValue, KeyValuePair.class)
            );
            return;
        }

        /*
         * Enum default values remain enum names.
         *
         * Example:
         * ORACLE_SERVICE_NAME
         */
        config.setDefaultValue(defaultValue);
    }

    /**
     * Convert enum constants to frontend SELECT options.
     *
     * <p>
     * The option value always uses Enum.name(), so Jackson can deserialize
     * the submitted value directly into the enum field.
     * </p>
     */
    private static List<Option> buildEnumOptions(Class<?> enumType) {

        Object[] enumConstants = enumType.getEnumConstants();

        if (enumConstants == null || enumConstants.length == 0) {
            return java.util.Collections.emptyList();
        }

        List<Option> options = new ArrayList<>(enumConstants.length);

        for (Object enumConstant : enumConstants) {

            Enum<?> enumValue = (Enum<?>) enumConstant;

            Option option = new Option();

            /*
             * Submit enum name to backend.
             *
             * Example:
             * ORACLE_SERVICE_NAME
             */
            option.setValue(enumValue.name());

            /*
             * Prefer:
             * 1. getLabel()
             * 2. getDesc()
             * 3. Enum.name()
             */
            option.setLabel(resolveEnumLabel(enumConstant, enumValue.name()));

            options.add(option);
        }

        return options;
    }

    /**
     * Resolve the display label of an enum constant.
     *
     * <p>Resolution order:</p>
     * <ol>
     *     <li>getLabel()</li>
     *     <li>getDesc()</li>
     *     <li>Enum.name()</li>
     * </ol>
     */
    private static String resolveEnumLabel(
            Object enumConstant,
            String defaultLabel) {

        String label = invokeStringMethod(enumConstant, ENUM_LABEL_METHOD);

        if (label != null && !label.trim().isEmpty()) {
            return label;
        }

        String desc = invokeStringMethod(enumConstant, ENUM_DESC_METHOD);

        if (desc != null && !desc.trim().isEmpty()) {
            return desc;
        }

        return defaultLabel;
    }

    /**
     * Invoke a no-argument method and return its String representation.
     */
    private static String invokeStringMethod(
            Object target,
            String methodName) {

        try {
            Method method = target.getClass().getMethod(methodName);
            Object value = method.invoke(target);

            return value == null ? null : String.valueOf(value);
        } catch (NoSuchMethodException ignored) {
            /*
             * The enum does not provide this method.
             * Continue using another label resolution strategy.
             */
            return null;
        } catch (ReflectiveOperationException ignored) {
            /*
             * Invocation failure should not block form generation.
             */
            return null;
        }
    }
}
