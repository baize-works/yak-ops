package io.yak.ops.application.client.policy;

import org.apache.commons.lang3.StringUtils;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Policy used to validate whether a LinkUp client version is supported.
 *
 * <p>This policy is executed after the LinkUp client is successfully connected
 * and the engine version is resolved from the remote runtime.</p>
 */
@Component
public class LinkUpClientVersionPolicy {

    /**
     * Supported LinkUp client versions.
     *
     * <p>Currently only LinkUp 2.3.13 is supported. More versions can be added
     * here after compatibility verification.</p>
     */
    private final Set<String> supportedVersions =
            new HashSet<>(Arrays.asList(
//                    "2.3.12",
                    "2.3.13"
            ));

    /**
     * Checks whether the given LinkUp client version is supported.
     *
     * @param version LinkUp client version resolved from the engine
     */
    public void check(String version) {
        if (StringUtils.isBlank(version)) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "LinkUp 客户端连接成功，但未获取到版本信息"
            );
        }

        if (supportedVersions.contains(version.trim())) {
            return;
        }

        throw new ServiceException(
                Status.INTERNAL_SERVER_ERROR_ARGS,
                "当前 LinkUp 客户端版本为 " + version
                        + "，暂不支持。当前仅支持 "
                        + String.join("、", supportedVersions)
        );
    }
}
