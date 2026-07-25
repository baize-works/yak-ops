package io.baize.flow.infrastructure.client.gateway;

import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.application.client.model.SeaTunnelClientAuthInfo;
import io.baize.flow.application.client.model.SeaTunnelClientEndpoint;
import io.baize.flow.application.client.model.SeaTunnelClientProbeResult;
import io.baize.flow.application.client.port.SeaTunnelClientProbeGateway;
import io.baize.flow.application.support.utils.MetricValueParser;
import io.baize.flow.engine.legacy.LegacyClientAuthentication;
import io.baize.flow.engine.legacy.LegacyRestClient;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * REST-based implementation of {@link SeaTunnelClientProbeGateway}.
 *
 * <p>This gateway probes a SeaTunnel endpoint by calling the SeaTunnel REST
 * overview API. If the overview API can be reached and the SeaTunnel version can
 * be resolved, the endpoint is considered live.</p>
 *
 * <p>The active master flag is resolved by calling the system monitoring API.
 * This step is best-effort only. A failure or host mismatch during active master
 * detection should not make the endpoint dead, because standalone deployments may
 * report host as localhost while users configure the real IP address.</p>
 */
@Slf4j
@Component
public class SeaTunnelRestClientProbeGateway implements SeaTunnelClientProbeGateway {

    /**
     * Key used to resolve SeaTunnel engine version from overview response.
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
    private LegacyRestClient seaTunnelRestClient;

    /**
     * Probes a SeaTunnel endpoint through the REST overview API.
     *
     * <p>If the endpoint is reachable and the version can be resolved, a live probe
     * result will be returned. Otherwise, a dead probe result will be returned with
     * the corresponding error message.</p>
     *
     * @param endpoint SeaTunnel endpoint to be probed
     * @param auth authentication information used when calling SeaTunnel REST API
     * @return probe result of the endpoint
     */
    @Override
    public SeaTunnelClientProbeResult probe(
            SeaTunnelClientEndpoint endpoint,
            SeaTunnelClientAuthInfo auth
    ) {
        if (endpoint == null) {
            return SeaTunnelClientProbeResult.dead(
                    null,
                    "SeaTunnel endpoint 不能为空"
            );
        }

        if (StringUtils.isBlank(endpoint.getBaseUrl())) {
            return SeaTunnelClientProbeResult.dead(
                    endpoint,
                    "SeaTunnel endpoint baseUrl 不能为空"
            );
        }

        LegacyClientAuthentication clientAuth = buildAuth(auth);

        try {
            Map<String, Object> overview = seaTunnelRestClient.overview(
                    endpoint.getBaseUrl(),
                    endpoint.getContextPath(),
                    null,
                    clientAuth
            );

            String clientVersion = resolveClientVersion(overview);

            if (StringUtils.isBlank(clientVersion)) {
                return SeaTunnelClientProbeResult.dead(
                        endpoint,
                        "SeaTunnel 客户端连接成功，但未获取到版本信息"
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

            return SeaTunnelClientProbeResult.live(
                    endpoint,
                    clientVersion,
                    overview
            );
        } catch (Exception e) {
            log.warn(
                    "Probe SeaTunnel client endpoint failed, baseUrl={}",
                    endpoint.getBaseUrl(),
                    e
            );

            return SeaTunnelClientProbeResult.dead(
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
     * @param auth SeaTunnel REST authentication information
     */
    private void resolveActiveMasterSafely(
            SeaTunnelClientEndpoint endpoint,
            LegacyClientAuthentication auth
    ) {
        if (endpoint == null || StringUtils.isBlank(endpoint.getBaseUrl())) {
            return;
        }

        try {
            List<Map<String, Object>> systemMonitoringInformations =
                    seaTunnelRestClient.systemMonitoringInformation(
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
                    "Resolve SeaTunnel active master failed, baseUrl={}",
                    endpoint.getBaseUrl(),
                    e
            );
        }
    }

    /**
     * Checks whether the host reported by SeaTunnel engine matches the configured endpoint.
     *
     * <p>Users may configure either host or hostname. Therefore both fields are compared.</p>
     *
     * @param endpoint configured endpoint
     * @param engineHost host returned by SeaTunnel engine
     * @return true if matched
     */
    private boolean matchEndpointHost(
            SeaTunnelClientEndpoint endpoint,
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
     * @return SeaTunnel REST client authentication model
     */
    private LegacyClientAuthentication buildAuth(SeaTunnelClientAuthInfo authInfo) {
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
     * Resolves SeaTunnel client version from overview response.
     *
     * @param overview overview response returned by SeaTunnel REST API
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