package io.baize.flow.api.exceptions;


import io.baize.flow.plugin.spi.enums.Status;

import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * controller exception annotation
 */
@Retention(RUNTIME)
@Target(METHOD)
public @interface ApiException {

    Status value();
}
