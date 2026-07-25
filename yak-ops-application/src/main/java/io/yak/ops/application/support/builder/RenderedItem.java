package io.yak.ops.application.support.builder;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import com.typesafe.config.ConfigRenderOptions;

/**
 * Represents a configuration item that can be rendered as HOCON text.
 *
 * <p>
 * This class wraps a {@link Config} object and optionally a root key.
 * When rendered, it produces a HOCON-formatted string without JSON formatting or comments.
 * </p>
 */
public class RenderedItem {

    /**
     * Rendering options for HOCON output.
     *
     * <p>
     * JSON formatting and comments are disabled to produce clean configuration text.
     * </p>
     */
    private static final ConfigRenderOptions RENDER_OPT =
            ConfigRenderOptions.defaults()
                    .setJson(false)            // Do not render as JSON
                    .setComments(false)        // Remove inline comments
                    .setOriginComments(false); // Remove origin comments

    /**
     * Optional root key to wrap the configuration.
     */
    private final String rootKey;

    /**
     * The underlying Typesafe Config object.
     */
    private final Config cfg;

    /**
     * Constructor.
     *
     * @param rootKey optional root key; if null, configuration is rendered as-is
     * @param cfg     the Typesafe Config object
     */
    RenderedItem(String rootKey, Config cfg) {
        this.rootKey = rootKey;
        this.cfg = cfg;
    }

    /**
     * Render the configuration as a HOCON-formatted string.
     *
     * <p>
     * If a root key is provided, the configuration will be wrapped under that key.
     * Otherwise, it is rendered directly.
     * </p>
     *
     * @return HOCON string representation of the configuration
     */
    String toHocon() {
        if (rootKey == null) {
            return cfg.root().render(RENDER_OPT);
        }
        return ConfigFactory.empty()
                .withValue(rootKey, cfg.root())
                .root().render(RENDER_OPT);
    }
}
