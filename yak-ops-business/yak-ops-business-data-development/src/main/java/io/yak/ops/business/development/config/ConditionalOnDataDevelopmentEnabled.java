package io.yak.ops.business.development.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

/** Enables data-development control-plane beans. */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@ConditionalOnProperty(
    prefix = "yak.data-development",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = false)
public @interface ConditionalOnDataDevelopmentEnabled {
}
