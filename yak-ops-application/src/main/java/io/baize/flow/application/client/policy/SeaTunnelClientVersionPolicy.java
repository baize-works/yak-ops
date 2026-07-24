package io.baize.flow.application.client.policy;

import org.apache.commons.lang3.StringUtils;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Policy used to validate whether a SeaTunnel client version is supported.
 *
 * <p>This policy is executed after the SeaTunnel client is successfully connected
 * and the engine version is resolved from the remote runtime.</p>
 */
@Component
public class SeaTunnelClientVersionPolicy {

    /**
     * Supported SeaTunnel client versions.
     *
     * <p>Currently only SeaTunnel 2.3.13 is supported. More versions can be added
     * here after compatibility verification.</p>
     */
    private final Set<String> supportedVersions =
            new HashSet<>(Arrays.asList(
//                    "2.3.12",
                    "2.3.13"
            ));

    /**
     * Checks whether the given SeaTunnel client version is supported.
     *
     * @param version SeaTunnel client version resolved from the engine
     */
    public void check(String version) {
        if (StringUtils.isBlank(version)) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "SeaTunnel 客户端连接成功，但未获取到版本信息"
            );
        }

        if (supportedVersions.contains(version.trim())) {
            return;
        }

        throw new ServiceException(
                Status.INTERNAL_SERVER_ERROR_ARGS,
                "当前 SeaTunnel 客户端版本为 " + version
                        + "，暂不支持。当前仅支持 "
                        + String.join("、", supportedVersions)
        );
    }
}