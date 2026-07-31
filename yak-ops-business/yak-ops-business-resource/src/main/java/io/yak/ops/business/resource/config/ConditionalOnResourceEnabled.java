package io.yak.ops.business.resource.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

/** 仅在资源管理模块启用时装配相关 Bean。 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@ConditionalOnProperty(
    prefix = "yak.resource",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
public @interface ConditionalOnResourceEnabled {
}
