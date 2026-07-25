package io.baize.flow.application.support.utils;

/**
 * Utility class for generating SeaTunnel job configuration text.
 *
 * <p>
 * This class assembles a complete SeaTunnel configuration
 * by injecting env, source, transform, and sink sections
 * into a predefined template.
 * </p>
 */
public class SeaTunnelConfigUtil {

    private static final String INDENT = "    ";

    /**
     * Base SeaTunnel configuration template.
     *
     * <p>
     * Placeholders are replaced with user-provided configuration blocks:
     * </p>
     * <ul>
     *   <li>{@code env_placeholder}</li>
     *   <li>{@code source_placeholder}</li>
     *   <li>{@code transform_placeholder}</li>
     *   <li>{@code sink_placeholder}</li>
     * </ul>
     */
    private static final String CONFIG_TEMPLATE =
            "env {\n"
                    + "env_placeholder"
                    + "}\n"
                    + "source {\n"
                    + "source_placeholder"
                    + "}\n"
                    + "transform {\n"
                    + "transform_placeholder"
                    + "}\n"
                    + "sink {\n"
                    + "sink_placeholder"
                    + "}\n";

    /**
     * Generate a complete SeaTunnel configuration string.
     *
     * @param env        environment configuration section
     * @param sources    source configuration section
     * @param transforms transform configuration section
     * @param sinks      sink configuration section
     * @return assembled SeaTunnel configuration text
     */
    public static String generateConfig(
            String env,
            String sources,
            String transforms,
            String sinks
    ) {
        return CONFIG_TEMPLATE
                .replace("env_placeholder", indentBlock(env))
                .replace("source_placeholder", indentBlock(sources))
                .replace("transform_placeholder", indentBlock(transforms))
                .replace("sink_placeholder", indentBlock(sinks));
    }

    /**
     * Add one indentation level to every non-empty line.
     */
    private static String indentBlock(String block) {
        if (block == null || block.trim().isEmpty()) {
            return "";
        }

        String normalized = block.replace("\r\n", "\n").replace("\r", "\n");
        String[] lines = normalized.split("\n", -1);

        StringBuilder builder = new StringBuilder();

        for (String line : lines) {
            if (line.trim().isEmpty()) {
                builder.append('\n');
            } else {
                builder.append(INDENT).append(line).append('\n');
            }
        }

        return builder.toString();
    }
}