package io.yak.ops.plugin.spi.form;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface FormField {

    String label();

    boolean required() default false;

    String placeholder() default "";

    String defaultValue() default "";

    FieldType type() default FieldType.INPUT;

    int order() default 0;
}
