package io.yak.ops.business.sync.offline.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

/** 仅在离线同步能力开启时注册相关 Bean。 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@ConditionalOnProperty(
    prefix = "yak.sync.offline",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
public @interface ConditionalOnOfflineSyncEnabled {
}
