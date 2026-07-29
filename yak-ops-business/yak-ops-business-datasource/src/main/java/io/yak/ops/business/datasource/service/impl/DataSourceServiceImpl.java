package io.yak.ops.business.datasource.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.framework.common.PagingData;
import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.config.DataSourceProperties;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.datasource.exception.DataSourceException;
import io.yak.ops.business.datasource.plugin.DataSourcePluginRegistry;
import io.yak.ops.business.datasource.service.DataSourceService;
import io.yak.ops.business.datasource.util.DataSourceSecretCodec;
import io.yak.ops.common.bean.dto.datasource.DataSourceConnectTestDTO;
import io.yak.ops.common.bean.dto.datasource.DataSourceDTO;
import io.yak.ops.common.bean.dto.datasource.DataSourceQueryDTO;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.vo.datasource.DataSourceOptionVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceSummaryVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceVO;
import io.yak.ops.common.enums.datasource.DataSourceConnStatus;
import io.yak.ops.common.enums.datasource.DataSourceDbType;
import io.yak.ops.common.enums.datasource.DataSourceEnvironment;
import io.yak.ops.common.enums.datasource.DataSourceErrorCode;
import io.yak.ops.spi.datasource.DataSourceConnection;
import io.yak.ops.spi.datasource.DataSourcePlugin;
import io.yak.ops.spi.datasource.DataSourcePluginException;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** 数据源管理服务实现。业务层只负责编排，连接能力由插件提供。 */
@Service
@ConditionalOnDataSourceEnabled
@RequiredArgsConstructor
public class DataSourceServiceImpl implements DataSourceService {

  private final DataSourceDao dataSourceDao;
  private final DataSourcePluginRegistry pluginRegistry;
  private final DataSourceProperties properties;
  private final DataSourceSecretCodec secretCodec;

  @Override
  @Transactional(
      transactionManager = "opsDataSourceTransactionManager",
      rollbackFor = Exception.class)
  public boolean createDataSource(DataSourceDTO dataSourceDTO) {
    String name = normalizeName(dataSourceDTO.getName());
    ensureNameAvailable(name, null);

    DataSourcePO dataSourcePO = buildDataSource(dataSourceDTO, dataSourceDTO.getConnectionParams());
    dataSourcePO.setName(name);
    dataSourcePO.setConnStatus(DataSourceConnStatus.UNKNOWN);

    if (dataSourceDao.addDataSource(dataSourcePO) <= 0) {
      throw new DataSourceException(DataSourceErrorCode.CREATE_FAILED);
    }
    return true;
  }

  @Override
  @Transactional(
      transactionManager = "opsDataSourceTransactionManager",
      rollbackFor = Exception.class)
  public boolean updateDataSource(Long id, DataSourceDTO dataSourceDTO) {
    DataSourcePO existing = getDataSourceOrThrow(id);
    String name = normalizeName(dataSourceDTO.getName());
    ensureNameAvailable(name, id);

    DataSourceDbType requestedType = parseDbType(dataSourceDTO.getDbType());
    if (requestedType != existing.getDbType()) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_DB_TYPE,
          "编辑数据源时不允许修改数据源类型");
    }

    DataSourcePlugin plugin = pluginRegistry.get(requestedType);
    String mergedConnectionJson =
        secretCodec.mergeStoredSecrets(
            plugin,
            dataSourceDTO.getConnectionParams(),
            existing.getConnectionParams());
    DataSourcePO dataSourcePO = buildDataSource(dataSourceDTO, mergedConnectionJson);
    dataSourcePO.setId(id);
    dataSourcePO.setName(name);
    dataSourcePO.setConnStatus(DataSourceConnStatus.UNKNOWN);

    if (dataSourceDao.editDataSource(dataSourcePO) <= 0) {
      throw new DataSourceException(DataSourceErrorCode.UPDATE_FAILED);
    }
    return true;
  }

  @Override
  public DataSourceVO getDataSource(Long id) {
    return toVO(getDataSourceOrThrow(id), true);
  }

  @Override
  public PagingData<DataSourceVO> getDataSourcePage(DataSourceQueryDTO queryDTO) {
    normalizeQuery(queryDTO);
    IPage<DataSourcePO> page = dataSourceDao.selectPage(queryDTO);
    List<DataSourceVO> records =
        page.getRecords().stream()
            .map(dataSourcePO -> toVO(dataSourcePO, false))
            .collect(Collectors.toList());
    return new PagingData<>(records, page);
  }

  @Override
  public DataSourceSummaryVO getSummary() {
    DataSourceSummaryVO summary = dataSourceDao.selectSummary();
    return summary == null ? new DataSourceSummaryVO() : summary;
  }

  @Override
  public PagingData<DataSourceVO> getAllDataSources() {
    List<DataSourceVO> records =
        dataSourceDao.selectAll(null).stream()
            .map(dataSourcePO -> toVO(dataSourcePO, false))
            .collect(Collectors.toList());
    return pagingData(records, records.size(), 1, Math.max(1, records.size()));
  }

  @Override
  @Transactional(
      transactionManager = "opsDataSourceTransactionManager",
      rollbackFor = Exception.class)
  public boolean deleteDataSource(Long id) {
    getDataSourceOrThrow(id);
    if (!dataSourceDao.deleteById(id)) {
      throw new DataSourceException(DataSourceErrorCode.DELETE_FAILED);
    }
    return true;
  }

  @Override
  public boolean testConnection(Long id) {
    DataSourcePO dataSourcePO = getDataSourceOrThrow(id);
    DataSourcePlugin plugin = pluginRegistry.get(dataSourcePO.getDbType());
    DataSourceConnection connection = parseConnection(plugin, dataSourcePO.getConnectionParams());

    try {
      plugin.testConnection(connection, connectionTimeoutSeconds());
      dataSourceDao.updateConnectionStatus(id, DataSourceConnStatus.CONNECTED);
      return true;
    } catch (RuntimeException exception) {
      dataSourceDao.updateConnectionStatus(id, DataSourceConnStatus.DISCONNECTED);
      throw connectException(exception);
    }
  }

  @Override
  public boolean testConnection(DataSourceConnectTestDTO connectTestDTO) {
    if (connectTestDTO == null) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
          "连接测试参数不能为空");
    }

    DataSourcePlugin plugin;
    String connectionJson = connectTestDTO.getConnJson();
    if (connectTestDTO.getDataSourceId() != null) {
      DataSourcePO existing = getDataSourceOrThrow(connectTestDTO.getDataSourceId());
      DataSourceDbType existingType = existing.getDbType();
      if (StringUtils.hasText(connectTestDTO.getDbType())
          && parseDbType(connectTestDTO.getDbType()) != existingType) {
        throw new DataSourceException(
            DataSourceErrorCode.INVALID_DB_TYPE,
            "连接测试的数据源类型与已保存数据源不一致");
      }
      plugin = pluginRegistry.get(existingType);
      connectionJson =
          secretCodec.mergeStoredSecrets(
              plugin,
              connectionJson,
              existing.getConnectionParams());
    } else {
      DataSourceDbType dbType =
          StringUtils.hasText(connectTestDTO.getDbType())
              ? parseDbType(connectTestDTO.getDbType())
              : pluginRegistry.resolveConnectionType(connectionJson);
      plugin = pluginRegistry.get(dbType);
    }

    DataSourceConnection connection = parseConnection(plugin, connectionJson);
    try {
      plugin.testConnection(connection, connectionTimeoutSeconds());
      return true;
    } catch (RuntimeException exception) {
      throw connectException(exception);
    }
  }

  @Override
  public List<DataSourceOptionVO> getOptions(String dbType) {
    DataSourceDbType normalizedType =
        StringUtils.hasText(dbType) ? parseDbType(dbType) : null;
    return dataSourceDao.selectAll(normalizedType).stream()
        .map(
            dataSourcePO ->
                new DataSourceOptionVO(
                    dataSourcePO.getName(),
                    String.valueOf(dataSourcePO.getId()),
                    dataSourcePO.getDbType().name()))
        .collect(Collectors.toList());
  }

  private DataSourcePO buildDataSource(
      DataSourceDTO dataSourceDTO,
      String connectionJson) {
    DataSourceDbType dbType = parseDbType(dataSourceDTO.getDbType());
    DataSourceEnvironment environment = parseEnvironment(dataSourceDTO.getEnvironment());
    DataSourcePlugin plugin = pluginRegistry.get(dbType);
    DataSourceConnection connection = parseConnection(plugin, connectionJson);

    DataSourcePO dataSourcePO = new DataSourcePO();
    dataSourcePO.setDbType(dbType);
    dataSourcePO.setJdbcUrl(connection.jdbcUrl());
    dataSourcePO.setEnvironment(environment);
    dataSourcePO.setRemark(normalizeNullable(dataSourceDTO.getRemark()));
    dataSourcePO.setConnectionParams(connection.normalizedJson());
    dataSourcePO.setOriginalJson(connection.normalizedJson());
    return dataSourcePO;
  }

  private DataSourceConnection parseConnection(DataSourcePlugin plugin, String connectionJson) {
    try {
      return plugin.parseConnection(connectionJson);
    } catch (DataSourcePluginException exception) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
          exception.getMessage(),
          exception);
    } catch (RuntimeException exception) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
          exception.getMessage(),
          exception);
    }
  }

  private DataSourceException connectException(RuntimeException exception) {
    if (exception instanceof DataSourceException) {
      return (DataSourceException) exception;
    }
    return new DataSourceException(
        DataSourceErrorCode.CONNECT_FAILED,
        exception.getMessage(),
        exception);
  }

  private int connectionTimeoutSeconds() {
    return Math.max(1, properties.getConnectionTest().getTimeoutSeconds());
  }

  private DataSourcePO getDataSourceOrThrow(Long id) {
    if (id == null || id <= 0) {
      throw new DataSourceException(DataSourceErrorCode.NOT_FOUND);
    }
    DataSourcePO dataSourcePO = dataSourceDao.selectById(id);
    if (dataSourcePO == null) {
      throw new DataSourceException(DataSourceErrorCode.NOT_FOUND);
    }
    return dataSourcePO;
  }

  private void ensureNameAvailable(String name, Long excludeId) {
    if (dataSourceDao.existsByName(name, excludeId)) {
      throw new DataSourceException(DataSourceErrorCode.DUPLICATE_NAME);
    }
  }

  private String normalizeName(String name) {
    if (!StringUtils.hasText(name)) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
          "数据源名称不能为空");
    }
    return name.trim();
  }

  private String normalizeNullable(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private void normalizeQuery(DataSourceQueryDTO queryDTO) {
    if (queryDTO == null) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_CONNECTION_PARAMS,
          "分页查询参数不能为空");
    }
    if (StringUtils.hasText(queryDTO.getName())) {
      queryDTO.setName(queryDTO.getName().trim());
    }
    if (StringUtils.hasText(queryDTO.getKeyword())) {
      queryDTO.setKeyword(queryDTO.getKeyword().trim());
    }
    if (StringUtils.hasText(queryDTO.getDbType())) {
      queryDTO.setDbType(parseDbType(queryDTO.getDbType()).name());
    }
    if (StringUtils.hasText(queryDTO.getEnvironment())) {
      queryDTO.setEnvironment(parseEnvironment(queryDTO.getEnvironment()).name());
    }
    if (StringUtils.hasText(queryDTO.getConnStatus())) {
      queryDTO.setConnStatus(parseConnectionStatus(queryDTO.getConnStatus()).name());
    }
  }

  private DataSourceDbType parseDbType(String value) {
    try {
      return DataSourceDbType.parse(value);
    } catch (IllegalArgumentException exception) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_DB_TYPE,
          exception.getMessage(),
          exception);
    }
  }

  private DataSourceEnvironment parseEnvironment(String value) {
    try {
      return DataSourceEnvironment.parse(value);
    } catch (IllegalArgumentException exception) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_ENVIRONMENT,
          exception.getMessage(),
          exception);
    }
  }

  private DataSourceConnStatus parseConnectionStatus(String value) {
    try {
      return DataSourceConnStatus.parse(value);
    } catch (IllegalArgumentException exception) {
      throw new DataSourceException(
          DataSourceErrorCode.INVALID_CONNECTION_STATUS,
          "不支持的连接状态：" + value,
          exception);
    }
  }

  private DataSourceVO toVO(DataSourcePO dataSourcePO, boolean includeOriginalJson) {
    DataSourceVO dataSourceVO = new DataSourceVO();
    dataSourceVO.setId(dataSourcePO.getId());
    dataSourceVO.setName(dataSourcePO.getName());
    dataSourceVO.setDbType(dataSourcePO.getDbType().name());
    dataSourceVO.setJdbcUrl(secretCodec.maskSensitiveText(dataSourcePO.getJdbcUrl()));
    dataSourceVO.setEnvironment(dataSourcePO.getEnvironment().name());
    dataSourceVO.setEnvironmentName(dataSourcePO.getEnvironment().getDisplayName());
    dataSourceVO.setConnStatus(dataSourcePO.getConnStatus().name());
    dataSourceVO.setRemark(dataSourcePO.getRemark());
    dataSourceVO.setCreateTime(dataSourcePO.getCreateTime());
    dataSourceVO.setUpdateTime(dataSourcePO.getUpdateTime());
    if (includeOriginalJson) {
      DataSourcePlugin plugin = pluginRegistry.get(dataSourcePO.getDbType());
      dataSourceVO.setOriginalJson(
          secretCodec.maskConnectionJson(plugin, dataSourcePO.getOriginalJson()));
    }
    return dataSourceVO;
  }

  private PagingData<DataSourceVO> pagingData(
      List<DataSourceVO> records,
      long total,
      int pageNo,
      int pageSize) {
    long pages = pageSize <= 0 ? 0 : (total + pageSize - 1) / pageSize;
    PagingData<DataSourceVO> pagingData = new PagingData<>();
    pagingData.setBizData(records);
    pagingData.setPagination(
        PagingData.Pagination.builder()
            .total(total)
            .pages(pages)
            .pageNo(pageNo)
            .pageSize(pageSize)
            .build());
    return pagingData;
  }
}
