package io.yak.ops.api.aspect;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface AccessLogAnnotation {
    // ignore request args
    String[] ignoreRequestArgs() default {"loginUser"};

    boolean ignoreRequest() default false;

    boolean ignoreResponse() default true;
}
