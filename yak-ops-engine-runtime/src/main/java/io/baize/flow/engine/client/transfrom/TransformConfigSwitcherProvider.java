package io.baize.flow.engine.client.transfrom;


import io.baize.flow.engine.client.transfrom.domain.Transform;

import java.util.Map;
import java.util.ServiceLoader;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Provider for {@link TransformConfigSwitcher} implementations.
 *
 * <p>
 * This provider uses Java SPI ({@link ServiceLoader}) to discover
 * all available {@link TransformConfigSwitcher} implementations
 * at startup and caches them by transform type.
 * </p>
 *
 * <p>
 * Implemented as an enum singleton to ensure thread-safe
 * lazy initialization.
 * </p>
 */
public enum TransformConfigSwitcherProvider {
    INSTANCE;

    /**
     * Cache of transform config switchers.
     *
     * <p>
     * Key: {@link Transform}
     * Value: corresponding {@link TransformConfigSwitcher}
     * </p>
     */
    private final Map<Transform, TransformConfigSwitcher> configSwitcherCache;

    /**
     * Load all {@link TransformConfigSwitcher} implementations
     * via Java SPI and register them in the cache.
     */
    TransformConfigSwitcherProvider() {
        ServiceLoader<TransformConfigSwitcher> loader =
                ServiceLoader.load(TransformConfigSwitcher.class);

        configSwitcherCache = new ConcurrentHashMap<>();

        for (TransformConfigSwitcher switcher : loader) {
            configSwitcherCache.put(switcher.getTransform(), switcher);
        }
    }

    /**
     * Get the config switcher for the specified transform type.
     *
     * @param name transform type
     * @return matching {@link TransformConfigSwitcher}, or null if not found
     */
    public TransformConfigSwitcher getTransformConfigSwitcher(Transform name) {
        return configSwitcherCache.get(name);
    }
}
