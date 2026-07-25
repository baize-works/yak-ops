package io.yak.ops.common.config;

import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME)
@Documented
@Target(ElementType.FIELD)
public @interface OptionMark {

    /**
     * The key of the option, if not configured, we will default convert `lowerCamelCase` to
     * `under_score_case` and provide it to users
     */
    String name() default "";

    /** The description of the option */
    String description() default "";
}
