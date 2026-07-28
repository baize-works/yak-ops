package io.yak.ops.business.datasource.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.fasterxml.jackson.databind.JsonNode;
import io.yak.framework.common.PagingData;
import io.yak.ops.business.datasource.config.ConditionalOnDataSourceEnabled;
import io.yak.ops.business.datasource.dao.DataSourceDao;
import io.yak.ops.business.datasource.exception.DataSourceException;
import io.yak.ops.business.datasource.service.DataSourceService;
import io.yak.ops.business.datasource.service.JdbcConnectionTester;
import io.yak.ops.common.bean.dto.datasource.DataSourceConnectTestDTO;
import io.yak.ops.common.bean.dto.datasource.DataSourceDTO;
import io.yak.ops.common.bean.dto.datasource.DataSourceQueryDTO;
import io.yak.ops.common.bean.po.datasource.DataSourcePO;
import io.yak.ops.common.bean.vo.datasource.DataSourceOptionVO;
import io.yak.ops.common.bean.vo.datasource.DataSourceVO;
import io.yak.ops.common.enums.datasource.DataSourceConnStatus;
import io.yak.ops.common.enums.datasource.DataSourceDbType;
import io.yak.ops.common.enums.datasource.DataSourceEnvironment;
import io.yak.ops.common.enums.datasource.DataSourceErrorCode;
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
    getDataSourceOrThrow(id);
    String name = normalizeName(dataSourceDTO.getName());
    ensureNameAvailable(name, id);

    DataSourcePO dataSourcePO = buildDataSource(dataSourceDTO);
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
            .map(dataSourcePO -> toVO(dataSourcePO, true))
            .collect(Collectors.toList());
    return new PagingData<>(records, page);
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
      dataSourceDao.updateConnectionStatus(id, DataSourceConnStatus.CONNECTED);
      return connected;
    } catch (RuntimeException exception) {
      dataSourceDao.updateConnectionStatus(id, DataSourceConnStatus.DISCONNECTED);
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

  private DataSourcePO buildDataSource(DataSourceDTO dataSourceDTO) {
    DataSourceDbType dbType = parseDbType(dataSourceDTO.getDbType());
    DataSourceEnvironment environment = parseEnvironment(dataSourceDTO.getEnvironment());
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
      queryDTO.setDbType(parseDbType(queryDTO.getDbType()).name());
    }
    if (StringUtils.hasText(queryDTO.getEnvironment())) {
      queryDTO.setEnvironment(parseEnvironment(queryDTO.getEnvironment()).name());
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
