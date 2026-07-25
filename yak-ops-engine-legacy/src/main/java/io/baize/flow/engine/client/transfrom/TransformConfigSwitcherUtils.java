package io.baize.flow.engine.client.transfrom;

import com.typesafe.config.Config;
import io.baize.flow.engine.client.transfrom.domain.Transform;
import io.baize.flow.engine.client.transfrom.domain.TransformOptions;

/**
 * Utility class for converting transform definitions
 * into engine-specific configuration objects.
 *
 * <p>
 * This class acts as a simple facade over
 * {@link TransformConfigSwitcherProvider},
 * delegating transform-specific configuration building logic
 * to the appropriate switcher implementation.
 * </p>
 */
public class TransformConfigSwitcherUtils {

    /**
     * Convert a transform definition and its options
     * into a Typesafe {@link Config} object.
     *
     * @param transform        transform type definition
     * @param transformOptions transform configuration options
     * @return generated engine configuration
     */
    public static Config transform(
            Transform transform,
            TransformOptions transformOptions
    ) {
        return TransformConfigSwitcherProvider.INSTANCE
                .getTransformConfigSwitcher(transform)
                .transform(transformOptions);
    }
}
