package io.yak.ops.infrastructure.client.gateway;

import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.yak.ops.application.client.model.LinkUpClientAuthInfo;
import io.yak.ops.application.client.model.LinkUpClientEndpoint;
import io.yak.ops.application.client.model.LinkUpClientProbeResult;
import io.yak.ops.application.client.port.LinkUpClientProbeGateway;
import io.yak.ops.application.support.utils.MetricValueParser;
import io.yak.ops.engine.legacy.LegacyClientAuthentication;
import io.yak.ops.engine.legacy.LegacyRestClient;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * REST-based implementation of {@link LinkUpClientProbeGateway}.
 *
 * <p>This gateway probes a LinkUp endpoint by calling the LinkUp REST
 * overview API. If the overview API can be reached and the LinkUp version can
 * be resolved, the endpoint is considered live.</p>
 *
 * <p>The active master flag is resolved by calling the system monitoring API.
 * This step is best-effort only. A failure or host mismatch during active master
 * detection should not make the endpoint dead, because standalone deployments may
 * report host as localhost while users configure the real IP address.</p>
 */
@Slf4j
@Component
public class LinkUpRestClientProbeGateway implements LinkUpClientProbeGateway {

    /**
     * Key used to resolve LinkUp engine version from overview response.
     */
    private static final String PROJECT_VERSION_KEY = "projectVersion";

    /**
     * Key used to resolve host from system monitoring response.
     */
    private static final String HOST_KEY = "host";

    /**
     * Key used to resolve whether the node is master from system monitoring response.
     */
    private static final String IS_MASTER_KEY = "isMaster";

    @Resource
    private LegacyRestClient linkUpRestClient;

    /**
     * Probes a LinkUp endpoint through the REST overview API.
     *
     * <p>If the endpoint is reachable and the version can be resolved, a live probe
     * result will be returned. Otherwise, a dead probe result will be returned with
     * the corresponding error message.</p>
     *
     * @param endpoint LinkUp endpoint to be probed
     * @param auth authentication information used when calling LinkUp REST API
     * @return probe result of the endpoint
     */
    @Override
    public LinkUpClientProbeResult probe(
            LinkUpClientEndpoint endpoint,
            LinkUpClientAuthInfo auth
    ) {
        if (endpoint == null) {
            return LinkUpClientProbeResult.dead(
                    null,
                    "LinkUp endpoint 不能为空"
            );
        }

        if (StringUtils.isBlank(endpoint.getBaseUrl())) {
            return LinkUpClientProbeResult.dead(
                    endpoint,
                    "LinkUp endpoint baseUrl 不能为空"
            );
        }

        LegacyClientAuthentication clientAuth = buildAuth(auth);

        try {
            Map<String, Object> overview = linkUpRestClient.overview(
                    endpoint.getBaseUrl(),
                    endpoint.getContextPath(),
                    null,
                    clientAuth
            );

            String clientVersion = resolveClientVersion(overview);

            if (StringUtils.isBlank(clientVersion)) {
                return LinkUpClientProbeResult.dead(
                        endpoint,
                        "LinkUp 客户端连接成功，但未获取到版本信息"
                );
            }

            endpoint.setClientVersion(clientVersion);

            /*
             * Active master detection is only an enhancement.
             *
             * In standalone mode, the engine may report host as localhost, while the
             * user configures a real IP such as 192.168.x.x. In that case, overview
             * has already proved that the endpoint is reachable, so this method should
             * still return live.
             */
            resolveActiveMasterSafely(endpoint, clientAuth);

            return LinkUpClientProbeResult.live(
                    endpoint,
                    clientVersion,
                    overview
            );
        } catch (Exception e) {
            log.warn(
                    "Probe LinkUp client endpoint failed, baseUrl={}",
                    endpoint.getBaseUrl(),
                    e
            );

            return LinkUpClientProbeResult.dead(
                    endpoint,
                    e.getMessage()
            );
        }
    }

    /**
     * Resolves whether the endpoint is active master.
     *
     * <p>This method is best-effort. Any exception here should not affect endpoint
     * liveness, because the overview API has already completed successfully before
     * this method is called.</p>
     *
     * @param endpoint endpoint to be checked
     * @param auth LinkUp REST authentication information
     */
    private void resolveActiveMasterSafely(
            LinkUpClientEndpoint endpoint,
            LegacyClientAuthentication auth
    ) {
        if (endpoint == null || StringUtils.isBlank(endpoint.getBaseUrl())) {
            return;
        }

        try {
            List<Map<String, Object>> systemMonitoringInformations =
                    linkUpRestClient.systemMonitoringInformation(
                            endpoint.getBaseUrl(),
                            endpoint.getContextPath(),
                            auth
                    );

            if (systemMonitoringInformations == null
                    || systemMonitoringInformations.isEmpty()) {
                return;
            }

            for (Map<String, Object> systemMonitoringInformation : systemMonitoringInformations) {
                if (systemMonitoringInformation == null || systemMonitoringInformation.isEmpty()) {
                    continue;
                }

                String engineHost = MetricValueParser.parseString(
                        systemMonitoringInformation.get(HOST_KEY)
                );

                Boolean master = MetricValueParser.parseBoolean(
                        systemMonitoringInformation.get(IS_MASTER_KEY)
                );

                if (!Boolean.TRUE.equals(master)) {
                    continue;
                }

                if (matchEndpointHost(endpoint, engineHost)) {
                    endpoint.setActiveMaster(true);
                    return;
                }
            }

            /*
             * Do not force activeMaster=false here.
             *
             * Reason:
             * - In cluster mode, ActivationService will decide whether active master
             *   must be found.
             * - In single mode, ActivationService can fallback to first live master.
             * - This gateway should not turn a reachable endpoint into a dead endpoint
             *   just because host matching failed.
             */
        } catch (Exception e) {
            log.warn(
                    "Resolve LinkUp active master failed, baseUrl={}",
                    endpoint.getBaseUrl(),
                    e
            );
        }
    }

    /**
     * Checks whether the host reported by LinkUp engine matches the configured endpoint.
     *
     * <p>Users may configure either host or hostname. Therefore both fields are compared.</p>
     *
     * @param endpoint configured endpoint
     * @param engineHost host returned by LinkUp engine
     * @return true if matched
     */
    private boolean matchEndpointHost(
            LinkUpClientEndpoint endpoint,
            String engineHost
    ) {
        if (endpoint == null || StringUtils.isBlank(engineHost)) {
            return false;
        }

        return StringUtils.equalsIgnoreCase(engineHost, endpoint.getHost())
                || StringUtils.equalsIgnoreCase(engineHost, endpoint.getHostname());
    }

    /**
     * Converts core authentication information to engine client authentication model.
     *
     * @param authInfo core authentication information
     * @return LinkUp REST client authentication model
     */
    private LegacyClientAuthentication buildAuth(LinkUpClientAuthInfo authInfo) {
        LegacyClientAuthentication auth = new LegacyClientAuthentication();

        if (authInfo == null) {
            return auth;
        }

        auth.setAuthEnabled(Boolean.TRUE.equals(authInfo.getAuthEnabled()));
        auth.setUsername(authInfo.getUsername());
        auth.setPassword(authInfo.getPassword());

        return auth;
    }

    /**
     * Resolves LinkUp client version from overview response.
     *
     * @param overview overview response returned by LinkUp REST API
     * @return resolved client version, or null when it cannot be resolved
     */
    private String resolveClientVersion(Map<String, Object> overview) {
        if (overview == null || overview.isEmpty()) {
            return null;
        }

        Object projectVersion = overview.get(PROJECT_VERSION_KEY);

        if (projectVersion == null) {
            return null;
        }

        return StringUtils.trimToNull(String.valueOf(projectVersion));
    }
}
