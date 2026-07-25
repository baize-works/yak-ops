package io.baize.flow.application.service.impl.client;

import jakarta.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.application.service.DataSourceService;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.infrastructure.verify.DatasourceConnectivityVerificationStrategy;
import io.baize.flow.infrastructure.verify.DatasourceConnectivityVerificationStrategyFactory;
import io.baize.flow.infrastructure.verify.cache.ClientDatasourceVerifyMemoryCache;
import io.baize.flow.infrastructure.verify.modal.DatasourceVerifyContext;
import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.dao.entity.SeaTunnelClient;
import io.baize.flow.dao.repository.SeaTunnelClientDao;
import io.baize.flow.web.contract.dto.ClientDatasourceVerifyDTO;
import io.baize.flow.web.contract.vo.ClientDatasourceVerifyVO;
import io.baize.flow.plugin.spi.enums.DbType;
import io.baize.flow.plugin.spi.enums.Status;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

/**
 * Application service used to verify whether a datasource can be used by a specific
 * SeaTunnel client.
 *
 * <p>This service is responsible for request validation, datasource/client loading,
 * cache handling, verification context creation, and delegating the actual verification
 * logic to the corresponding strategy.</p>
 */
@Service
public class SeaTunnelClientDatasourceVerifyAppService {

    /**
     * Default timeout for datasource verification.
     */
    private static final long DEFAULT_DATASOURCE_VERIFY_TIMEOUT_MS = 15000L;

    /**
     * Default polling interval used by remote verification strategies.
     */
    private static final long DEFAULT_DATASOURCE_VERIFY_POLL_INTERVAL_MS = 1000L;

    @Resource
    private SeaTunnelClientDao seaTunnelClientDao;

    @Resource
    private DataSourceService dataSourceService;

    @Resource
    private ClientDatasourceVerifyMemoryCache verifyMemoryCache;

    @Resource
    private DatasourceConnectivityVerificationStrategyFactory strategyFactory;

    /**
     * Verifies datasource connectivity through the specified SeaTunnel client.
     *
     * <p>For automatic trigger mode, successful verification results can be cached
     * to avoid repeated remote checks during job configuration.</p>
     *
     * @param clientId SeaTunnel client id
     * @param dto datasource verification request
     * @return datasource verification result
     */
    public ClientDatasourceVerifyVO verifyDatasource(
            Long clientId,
            ClientDatasourceVerifyDTO dto
    ) {
        validateRequest(clientId, dto);

        SeaTunnelClient client = getEntity(clientId);

        if (StringUtils.isBlank(client.getBaseUrl())) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端 baseUrl 不能为空, clientId=" + clientId
            );
        }

        DataSource datasource = dataSourceService.selectById(dto.getDatasourceId());
        if (datasource == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "数据源不存在, datasourceId=" + dto.getDatasourceId()
            );
        }

        DbType dbType = datasource.getDbType();
        if (dbType == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "数据源类型不能为空, datasourceId=" + dto.getDatasourceId()
            );
        }

        DatasourceVerifyContext context = buildContext(client, datasource, dbType, dto);

        boolean autoMode = StringUtils.equalsIgnoreCase(dto.getTriggerMode(), "AUTO");
        boolean forceRefresh = Boolean.TRUE.equals(dto.getForceRefresh());

        String cacheKey = verifyMemoryCache.buildKey(
                client,
                datasource,
                dto.getPluginName(),
                dto.getConnectorType(),
                dto.getRole()
        );

        // Reuse cached successful verification result in auto mode unless force refresh is requested.
        if (autoMode && !forceRefresh) {
            ClientDatasourceVerifyVO cached = verifyMemoryCache.get(cacheKey);
            if (cached != null) {
                fillBaseInfo(cached, client, datasource);
                return cached;
            }
        }

        // Select the proper verification strategy based on datasource and connector context.
        DatasourceConnectivityVerificationStrategy strategy =
                strategyFactory.getStrategy(context);

        ClientDatasourceVerifyVO result = strategy.verify(context);

        fillBaseInfo(result, client, datasource);
        result.setFromCache(false);

        // Only successful auto verification results are cached.
        if (autoMode && Boolean.TRUE.equals(result.getSuccess())) {
            verifyMemoryCache.put(cacheKey, result);
        }

        return result;
    }

    /**
     * Validates required request parameters before executing datasource verification.
     */
    private void validateRequest(
            Long clientId,
            ClientDatasourceVerifyDTO dto
    ) {
        if (clientId == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "clientId 不能为空"
            );
        }

        if (dto == null || dto.getDatasourceId() == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "datasourceId 不能为空"
            );
        }
    }

    /**
     * Builds the verification context consumed by datasource verification strategies.
     */
    private DatasourceVerifyContext buildContext(
            SeaTunnelClient client,
            DataSource datasource,
            DbType dbType,
            ClientDatasourceVerifyDTO dto
    ) {
        long timeoutMs = dto.getTimeoutMs() == null || dto.getTimeoutMs() <= 0
                ? DEFAULT_DATASOURCE_VERIFY_TIMEOUT_MS
                : dto.getTimeoutMs();

        long pollIntervalMs = dto.getPollIntervalMs() == null || dto.getPollIntervalMs() <= 0
                ? DEFAULT_DATASOURCE_VERIFY_POLL_INTERVAL_MS
                : dto.getPollIntervalMs();

        return DatasourceVerifyContext.builder()
                .client(client)
                .datasource(datasource)
                .dbType(dbType)
                .pluginName(dto.getPluginName())
                .connectorType(dto.getConnectorType())
                .role(dto.getRole())
                .timeoutMs(timeoutMs)
                .pollIntervalMs(pollIntervalMs)
                .build();
    }

    /**
     * Fills common client and datasource information into the verification result.
     *
     * <p>This keeps the frontend response stable no matter whether the result comes
     * from cache or from a newly executed verification strategy.</p>
     */
    private void fillBaseInfo(
            ClientDatasourceVerifyVO vo,
            SeaTunnelClient client,
            DataSource datasource
    ) {
        if (vo == null) {
            return;
        }

        if (client != null) {
            vo.setClientId(client.getId());
            vo.setClientName(client.getClientName());
            vo.setClientBaseUrl(client.getBaseUrl());
        }

        if (datasource != null) {
            vo.setDatasourceId(datasource.getId());
            vo.setDatasourceName(datasource.getName());
            vo.setDatasourceType(
                    datasource.getDbType() == null ? null : datasource.getDbType().name()
            );
        }

        if (vo.getItems() == null) {
            vo.setItems(new ArrayList<>());
        }
    }

    /**
     * Gets a SeaTunnel client entity by id.
     *
     * @param id SeaTunnel client id
     * @return existing SeaTunnel client entity
     */
    private SeaTunnelClient getEntity(Long id) {
        if (id == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端 ID 不能为空"
            );
        }

        SeaTunnelClient entity = seaTunnelClientDao.queryById(id);

        if (entity == null) {
            throw new ServiceException(
                    Status.INTERNAL_SERVER_ERROR_ARGS,
                    "客户端不存在, id=" + id
            );
        }

        return entity;
    }
}