package io.yak.ops.business.quality.api;

import com.fasterxml.jackson.annotation.JacksonAnnotationsInside;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Formats data-quality response timestamps to second precision.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({
    ElementType.FIELD,
    ElementType.METHOD,
    ElementType.PARAMETER,
    ElementType.RECORD_COMPONENT
})
@JacksonAnnotationsInside
@JsonFormat(shape = JsonFormat.Shape.STRING, pattern = QualityDateTimeFormat.PATTERN)
public @interface QualityDateTimeFormat {

  String PATTERN = "yyyy-MM-dd HH:mm:ss";
}
