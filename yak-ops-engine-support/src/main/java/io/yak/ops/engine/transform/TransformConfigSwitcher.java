package io.yak.ops.engine.transform;

import com.typesafe.config.Config;
import io.yak.ops.engine.transform.domain.Transform;
import io.yak.ops.engine.transform.domain.TransformOptions;

/**
 * Strategy interface for converting {@link TransformOptions}
 * into a LinkUp {@link Config}.
 *
 * <p>
 * Each implementation is responsible for:
 * <ul>
 *   <li>Declaring which {@link Transform} it supports</li>
 *   <li>Transforming the corresponding options object into
 *       a LinkUp-compatible configuration</li>
 * </ul>
 *
 * <p>
 * Implementations are usually discovered via SPI (e.g. {@code @AutoService})
 * and selected at runtime based on the transform type.
 * </p>
 */
public interface TransformConfigSwitcher {

    /**
     * Returns the transform type that this switcher supports.
     *
     * @return supported {@link Transform}
     */
    Transform getTransform();

    /**
     * Convert the given {@link TransformOptions} into a LinkUp
     * {@link Config} object.
     *
     * <p>
     * The returned Config will be merged into the final LinkUp
     * pipeline configuration.
     * </p>
     *
     * @param transformOptions transform-specific options
     * @return LinkUp configuration for the transform
     */
    Config transform(TransformOptions transformOptions);

}
