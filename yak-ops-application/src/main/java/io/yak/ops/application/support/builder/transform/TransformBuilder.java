package io.yak.ops.application.support.builder.transform;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigRenderOptions;
import io.yak.ops.application.support.utils.TaskOptionUtils;
import io.yak.ops.engine.transform.TransformConfigSwitcherUtils;
import io.yak.ops.engine.transform.domain.Transform;
import io.yak.ops.engine.transform.domain.TransformOptions;
import org.springframework.stereotype.Component;

import java.io.IOException;


/**
 * Transform node builder.
 *
 * <p>
 * This builder generates the HOCON configuration for a Transform node in a SeaTunnel job.
 * It leverages TransformConfigSwitcherUtils to convert user-provided transform options
 * into the corresponding configuration.
 * </p>
 */
@Component
public class TransformBuilder implements TransformNodeConfigBuilder {

    /**
     * Node type identifier.
     *
     * @return the node type string "transform"
     */
    @Override
    public String nodeType() {
        return "transform";
    }

    /**
     * Build the HOCON configuration for the transform node.
     *
     * <p>
     * Steps:
     * </p>
     * <ol>
     *     <li>Read the "transformType" from input configuration</li>
     *     <li>Render the full config as JSON string</li>
     *     <li>Convert the JSON string into {@link TransformOptions}</li>
     *     <li>Use {@link TransformConfigSwitcherUtils} to generate the final Config</li>
     * </ol>
     *
     * @param data input configuration containing transformType and options
     * @return validated HOCON configuration for the transform node
     * @throws RuntimeException if an IOException occurs during transformation
     */
    @Override
    public Config build(Config data) {

        // Parse the transform type from input config
        Transform transform = Transform.valueOf(data.getString("componentType").toUpperCase());

        try {
            // Convert the full config to a JSON string for TransformOptions parsing
            String transformOptions = data.root().render(
                    ConfigRenderOptions.defaults()
                            .setJson(true)
                            .setComments(false)
                            .setOriginComments(false)
            );

            // Parse the transform options
            TransformOptions transformOption =
                    TaskOptionUtils.getTransformOption(transform, transformOptions);

            if (transformOption == null) {
                throw new IllegalArgumentException(
                        "Unsupported transform type: " + transform
                );
            }

            // Generate the final HOCON configuration for the transform node
            return TransformConfigSwitcherUtils.transform(transform, transformOption);
        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("Illegal state: " + e.getMessage());
        }
    }
}
