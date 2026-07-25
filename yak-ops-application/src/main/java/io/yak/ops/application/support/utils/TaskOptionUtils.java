package io.yak.ops.application.support.utils;

import org.apache.commons.lang3.StringUtils;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.engine.transform.domain.*;

import java.io.IOException;

/**
 * Utility class for converting serialized transform option strings
 * into strongly-typed {@link TransformOptions} objects.
 *
 * <p>
 * This class acts as a central dispatcher that determines which
 * TransformOptions implementation should be used based on the
 * {@link Transform} type.
 * </p>
 */
public class TaskOptionUtils {

    /**
     * Parse transform options JSON string into a concrete TransformOptions object
     * according to the specified transform type.
     *
     * @param transform           the transform type (e.g. FIELDMAPPER, SQL, COPY)
     * @param transformOptionsStr JSON string representing transform options
     * @param <T>                 concrete TransformOptions type
     * @return parsed TransformOptions instance
     * @throws IOException if parsing fails
     */
    public static <T extends TransformOptions> T getTransformOption(
            Transform transform, String transformOptionsStr) throws IOException {

        switch (transform) {
            case FIELDMAPPER:
                return convertTransformStrToOptions(
                        transformOptionsStr, FieldMapperTransformOptions.class);

            case MULTIFIELDSPLIT:
                return convertTransformStrToOptions(
                        transformOptionsStr, SplitTransformOptions.class);

            case COPY:
                return convertTransformStrToOptions(
                        transformOptionsStr, CopyTransformOptions.class);

            case SQL:
                return convertTransformStrToOptions(
                        transformOptionsStr, SQLTransformOptions.class);

            case FILTERROWKIND:
            case REPLACE:
            default:
                // Unsupported or unimplemented transform types
                return null;
        }
    }

    /**
     * Convert a JSON string into a specific TransformOptions implementation.
     *
     * <p>
     * This method performs basic validation and delegates the actual
     * </p>
     *
     * @param transformOptionsStr JSON string containing transform configuration
     * @param optionClass         concrete TransformOptions class
     * @param <T>                 TransformOptions type
     * @return deserialized TransformOptions object
     * @throws RuntimeException if the input string is empty
     */
    @SuppressWarnings("unchecked")
    public static <T extends TransformOptions> T convertTransformStrToOptions(
            String transformOptionsStr, Class<? extends TransformOptions> optionClass) {

        if (StringUtils.isEmpty(transformOptionsStr)) {
            throw new RuntimeException("transformOptions can not be empty");
        }

        return (T) JSONUtils.parseObject(transformOptionsStr, optionClass);
    }
}
