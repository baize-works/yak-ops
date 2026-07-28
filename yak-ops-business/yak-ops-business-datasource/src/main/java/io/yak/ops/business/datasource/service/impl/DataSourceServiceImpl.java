package io.yak.ops.business.datasource.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import io.yak.framework.common.PagingData;
import io.yak.ops.business.datasource.common.dto.DataSourceConnectTestDTO;
import io.yak.ops.business.datasource.common.dto.DataSourceDTO;
import io.yak.ops.business.datasource.common.dto.DataSourceQueryDTO;
import io.yak.ops.business.datasource.common.enums.DataSourceConnStatus;
import io.yak.ops.business.datasource.common.enums.DataSourceDbType;
import io.yak.ops.business.datasource.common.enums.DataSourceEnvironment;
import io.yak.ops.business.datasource.common.enums.DataSourceErrorCode;
import io.yak.ops.business.datasource.common.po.DataSourcePO;
import io.yak.ops.business.datasource.common.vo.DataSourceOptionVO;
import io.yak.ops.business.datasource.common.vo.DataSourceVO;
import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.datasource.exception.DataSourceException;
import io.yak.ops.business.datasource.service.DataSourceService;
import io.yak.ops.business.datasource.service.JdbcConnectionTester;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** 数据源管理服务实现。 */
@Service
@ConditionalOnDataSourceEnabled
@RequiredArgsConstructor
public class DataSourceServiceImpl implements DataSourceService {

  private final DataSourceDao dataSourceDao;
  private final JdbcConnectionTester connectionTester;

  @Override
  @Transactional(
      transactionManager = "opsDataSourceTransactionManager",
      rollbackFor = Exception.class)
  public boolean createDataSource(DataSourceDTO dataSourceDTO) {
    String name = normalizeName(dataSourceDTO.getName());
    ensureNameAvailable(name, null);

    DataSourcePO dataSourcePO = buildDataSource(dataSourceDTO);
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

    DataSourcePO dataSourcePO = buildDataSource(dataSourceDTO);
    dataSourcePO.setId(id);
    dataSourcePO.setName(name);
    dataSourcePO.setConnStatus(DataSourceConnStatus.UNKNOWN);
    dataSourcePO.setCreateTime(existing.getCreateTime());

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
    long total = dataSourceDao.count(queryDTO);
    List<DataSourceVO> records =
        dataSourceDao.selectPage(queryDTO).stream()
            .map(dataSourcePO -> toVO(dataSourcePO, true))
            .collect(Collectors.toList());
    return pagingData(records, total, queryDTO.getPageNo(), queryDTO.getPageSize());
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
    JsonNode params = connectionTester.parseConnectionParams(dataSourcePO.getConnectionParams());

    try {
      boolean connected = connectionTester.test(dataSourcePO.getDbType(), params);
      dataSourceDao.updateConnectionStatus(id, DataSourceConnStatus.CONNECTED.name());
      return connected;
    } catch (RuntimeException exception) {
      dataSourceDao.updateConnectionStatus(id, DataSourceConnStatus.DISCONNECTED.name());
      throw exception;
    }
  }

  @Override
  public boolean testConnection(DataSourceConnectTestDTO connectTestDTO) {
    JsonNode params = connectionTester.parseConnectionParams(connectTestDTO.getConnJson());
    DataSourceDbType dbType = connectionTester.resolveDbType(params, null);
    return connectionTester.test(dbType, params);
  }

  @Override
  public List<DataSourceOptionVO> getOptions(String dbType) {
    String normalizedType =
        StringUtils.hasText(dbType) ? DataSourceDbType.parse(dbType).name() : null;
    return dataSourceDao.selectAll(normalizedType).stream()
        .map(
            dataSourcePO ->
                new DataSourceOptionVO(
                    dataSourcePO.getName(),
                    String.valueOf(dataSourcePO.getId()),
                    dataSourcePO.getDbType().name()))
        .collect(Collectors.toList());
  }

  private DataSourcePO buildDataSource(DataSourceDTO dataSourceDTO) {
    DataSourceDbType dbType = DataSourceDbType.parse(dataSourceDTO.getDbType());
    DataSourceEnvironment environment =
        DataSourceEnvironment.parse(dataSourceDTO.getEnvironment());
    JsonNode params =
        connectionTester.parseConnectionParams(dataSourceDTO.getConnectionParams());
    String normalizedJson = connectionTester.normalize(params);

    DataSourcePO dataSourcePO = new DataSourcePO();
    dataSourcePO.setDbType(dbType);
    dataSourcePO.setJdbcUrl(connectionTester.resolveJdbcUrl(dbType, params));
    dataSourcePO.setEnvironment(environment);
    dataSourcePO.setRemark(normalizeNullable(dataSourceDTO.getRemark()));
    dataSourcePO.setConnectionParams(normalizedJson);
    dataSourcePO.setOriginalJson(normalizedJson);
    return dataSourcePO;
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
    if (StringUtils.hasText(queryDTO.getName())) {
      queryDTO.setName(queryDTO.getName().trim());
    }
    if (StringUtils.hasText(queryDTO.getDbType())) {
      queryDTO.setDbType(DataSourceDbType.parse(queryDTO.getDbType()).name());
    }
    if (StringUtils.hasText(queryDTO.getEnvironment())) {
      queryDTO.setEnvironment(
          DataSourceEnvironment.parse(queryDTO.getEnvironment()).name());
    }
  }

  private DataSourceVO toVO(DataSourcePO dataSourcePO, boolean includeOriginalJson) {
    DataSourceVO dataSourceVO = new DataSourceVO();
    dataSourceVO.setId(dataSourcePO.getId());
    dataSourceVO.setName(dataSourcePO.getName());
    dataSourceVO.setDbType(dataSourcePO.getDbType().name());
    dataSourceVO.setJdbcUrl(dataSourcePO.getJdbcUrl());
    dataSourceVO.setEnvironment(dataSourcePO.getEnvironment().name());
    dataSourceVO.setEnvironmentName(dataSourcePO.getEnvironment().getDisplayName());
    dataSourceVO.setConnStatus(dataSourcePO.getConnStatus().name());
    dataSourceVO.setRemark(dataSourcePO.getRemark());
    dataSourceVO.setCreateTime(dataSourcePO.getCreateTime());
    dataSourceVO.setUpdateTime(dataSourcePO.getUpdateTime());
    if (includeOriginalJson) {
      dataSourceVO.setOriginalJson(dataSourcePO.getOriginalJson());
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
