package io.yak.ops.engine.legacy.internal.vendor.rest;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Reads the deprecated vendor-prefixed transport settings for compatibility only. */
@Data
@Deprecated
@ConfigurationProperties(prefix = "linkup.client")
public class LinkUpClientProperties {
    private Integer connectTimeoutMs;
    private Integer readTimeoutMs;
}
