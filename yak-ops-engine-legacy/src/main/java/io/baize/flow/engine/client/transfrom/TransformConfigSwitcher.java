package io.baize.flow.engine.client.transfrom;

import com.typesafe.config.Config;
import io.baize.flow.engine.client.transfrom.domain.Transform;
import io.baize.flow.engine.client.transfrom.domain.TransformOptions;

/**
 * Strategy interface for converting {@link TransformOptions}
 * into a SeaTunnel {@link Config}.
 *
 * <p>
 * Each implementation is responsible for:
 * <ul>
 *   <li>Declaring which {@link Transform} it supports</li>
 *   <li>Transforming the corresponding options object into
 *       a SeaTunnel-compatible configuration</li>
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
     * Convert the given {@link TransformOptions} into a SeaTunnel
     * {@link Config} object.
     *
     * <p>
     * The returned Config will be merged into the final SeaTunnel
     * pipeline configuration.
     * </p>
     *
     * @param transformOptions transform-specific options
     * @return SeaTunnel configuration for the transform
     */
    Config transform(TransformOptions transformOptions);

}
