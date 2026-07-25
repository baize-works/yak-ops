package io.yak.ops.application.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.seatunnel.plugin.datasource.api.jdbc.DataSourceProcessor;
import org.apache.seatunnel.plugin.datasource.api.utils.DataSourceUtils;
import io.yak.ops.application.service.DataSourceService;
import io.yak.ops.common.enums.ConnStatus;
import io.yak.ops.common.utils.ConvertUtil;
import io.yak.ops.common.utils.JSONUtils;
import io.yak.ops.domain.exceptions.ServiceException;
import io.yak.ops.dao.model.query.DataSourceQuery;
import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.dao.repository.DataSourceDao;
import io.yak.ops.dao.repository.JobDefinitionDao;
import io.yak.ops.application.model.dto.DataSourceDTO;
import io.yak.ops.application.model.response.PaginationResult;
import io.yak.ops.application.model.vo.DBOptionVO;
import io.yak.ops.application.model.vo.DataSourceVO;
import io.yak.ops.plugin.spi.datasource.BaseConnectionParam;
import io.yak.ops.plugin.spi.datasource.ConnectionParam;
import io.yak.ops.plugin.spi.enums.DbType;
import io.yak.ops.plugin.spi.enums.Status;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DataSourceServiceImpl extends BaseServiceImpl implements DataSourceService {

    private static final long MAX_JDBC_DRIVER_SIZE = 200L * 1024 * 1024;
    private static final String JDBC_DRIVER_DIR = "jdbc-drivers";
    private static final String JDBC_JAR_SUFFIX = ".jar";

    @Resource
    private DataSourceDao dataSourceDao;

    @Resource
    private JobDefinitionDao jobDefinitionDao;


    @Override
    @Transactional(rollbackFor = Exception.class)
    public DataSource createDataSource(DataSourceDTO dto) {
        validateCreateRequest(dto);

        try {
            BaseConnectionParam connectionParam =
                    DataSourceUtils.buildConnectionParams(dto.getDbType(), dto.getConnectionParams());

            DataSourceUtils.checkDatasourceParam(connectionParam);

            checkConnection(dto.getDbType(), connectionParam);

            DataSource entity = ConvertUtil.sourceToTarget(dto, DataSource.class);
            entity.setName(dto.getName().trim());
            entity.setConnectionParams(JSONUtils.toJsonString(connectionParam));
            entity.setOriginalJson(dto.getConnectionParams());

            entity.setConnStatus(ConnStatus.CONNECTED_SUCCESS);

            entity.initInsert();

            dataSourceDao.insert(entity);
            return entity;
        } catch (DuplicateKeyException e) {
            log.warn("Create data source failed due to duplicate key, name={}", dto.getName(), e);
            throw new ServiceException(Status.DATASOURCE_EXIST);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Create data source failed, name={}, dbType={}", dto.getName(), dto.getDbType(), e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DataSource updateDataSource(Long id, DataSourceDTO dto) {
        validateId(id);

        DataSource existing = getDataSourceOrThrow(id);
        validateUpdateRequest(id, dto);

        try {
            BaseConnectionParam connectionParam =
                    DataSourceUtils.buildConnectionParams(dto.getDbType(), dto.getConnectionParams());
            DataSourceUtils.checkDatasourceParam(connectionParam);

            // 修改也需要限制，离线任务下次运行时会导致任务被变更
            checkDataSourceNotUsed(id);

            DataSource entity = ConvertUtil.sourceToTarget(dto, DataSource.class);
            entity.setId(id);
            entity.setName(dto.getName().trim());
            entity.setConnectionParams(JSONUtils.toJsonString(connectionParam));
            entity.setOriginalJson(dto.getConnectionParams());
            entity.setConnStatus(existing.getConnStatus());
            entity.initUpdate();

            dataSourceDao.updateById(entity);
            return entity;
        } catch (DuplicateKeyException e) {
            log.warn("Update data source failed due to duplicate key, id={}, name={}", id, dto.getName(), e);
            throw new ServiceException(Status.DATASOURCE_EXIST);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Update data source failed, id={}, name={}, dbType={}", id, dto.getName(), dto.getDbType(), e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    public DataSource selectById(Long id) {
        validateId(id);
        return getDataSourceOrThrow(id);
    }

    @Override
    public PaginationResult<DataSourceVO> queryDataSourceListPaging(DataSourceDTO dto) {
        try {
            DataSourceQuery query = ConvertUtil.sourceToTarget(dto, DataSourceQuery.class);
            IPage<DataSource> pageResult = dataSourceDao.queryPage(query);
            List<DataSourceVO> records =
                    ConvertUtil.sourceListToTarget(pageResult.getRecords(), DataSourceVO.class);

            records.forEach(this::fillDerivedFields);

            return PaginationResult.buildSuc(records, pageResult);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Query data source list paging failed, dto={}", dto, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long datasourceId) {
        validateId(datasourceId);
        getDataSourceOrThrow(datasourceId);

        try {
            checkDataSourceNotUsed(datasourceId);
            dataSourceDao.deleteById(datasourceId);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Delete data source failed, id={}", datasourceId, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean batchDelete(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "ids");
        }

        try {
            List<Long> distinctIds = ids.stream()
                    .filter(id -> id != null && id > 0)
                    .distinct()
                    .collect(java.util.stream.Collectors.toList());

            if (distinctIds.isEmpty()) {
                throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "ids");
            }

            for (Long id : distinctIds) {
                getDataSourceOrThrow(id);
            }

            checkDataSourcesNotUsed(distinctIds);

            return dataSourceDao.deleteByIds(distinctIds);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Batch delete data sources failed, ids={}", ids, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    public Boolean connectionTest(Long id) {
        validateId(id);
        DataSource dataSource = getDataSourceOrThrow(id);
        return testConnection(dataSource);
    }

    @Override
    public Boolean batchConnectionTest(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "ids");
        }

        return ids.parallelStream().allMatch(this::connectionTest);
    }

    @Override
    public Boolean connectionTestWithParam(String connJson) {
        if (StringUtils.isBlank(connJson)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "connectionParams");
        }

        try {
            DbType dbType = extractDbType(connJson);
            ConnectionParam param = DataSourceUtils.buildConnectionParams(dbType, connJson);
            return checkConnection(dbType, param);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Connection test with param failed", e);
            throw new ServiceException(Status.DATASOURCE_CONNECT_TEST_ERROR, e.getMessage());
        }
    }

    @Override
    public List<DataSourceVO> listAll() {
        try {
            List<DataSource> entities = dataSourceDao.queryAll();
            List<DataSourceVO> result = ConvertUtil.sourceListToTarget(entities, DataSourceVO.class);
            result.forEach(this::fillDerivedFields);
            return result;
        } catch (Exception e) {
            log.error("List all data sources failed", e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    public Map<String, Object> uploadJdbcDriver(MultipartFile file, String pluginType, boolean overwrite) {
        validateJdbcDriverFile(file);

        String originalFilename = file.getOriginalFilename();
        assert originalFilename != null;
        String filename = Paths.get(originalFilename).getFileName().toString();
        Path targetDir = Paths.get(System.getProperty("user.dir"), JDBC_DRIVER_DIR);

        try {
            Files.createDirectories(targetDir);

            Path targetFile = targetDir.resolve(filename).normalize();
            if (!targetFile.startsWith(targetDir)) {
                throw new ServiceException(Status.DATASOURCE_FILE_NAME_INVALID);
            }

            if (Files.exists(targetFile) && !overwrite) {
                throw new ServiceException(Status.DATASOURCE_FILE_EXIST);
            }

            Path tempFile = Files.createTempFile(targetDir, filename + ".", ".uploading");
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING);

                CopyOption[] moveOptions = overwrite
                        ? new CopyOption[]{StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE}
                        : new CopyOption[]{StandardCopyOption.ATOMIC_MOVE};

                Files.move(tempFile, targetFile, moveOptions);
            } finally {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (IOException ex) {
                    log.warn("Delete temp jdbc driver file failed, tempFile={}", tempFile, ex);
                }
            }

            Map<String, Object> result = new HashMap<>(4);
            result.put("fileName", filename);
            result.put("absolutePath", targetFile.toAbsolutePath().toString());
            result.put("driverLocation", filename);
            result.put("pluginType", pluginType);

            return result;
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Upload jdbc driver failed, fileName={}", filename, e);
            throw new ServiceException(Status.DATASOURCE_UPLOAD_FAILED, e.getMessage());
        }
    }

    @Override
    public List<DBOptionVO> option(String dbType) {
        try {
            List<DataSource> entities = dataSourceDao.queryByDbType(dbType);
            return entities.stream()
                    .map(this::toOptionVO)
                    .collect(java.util.stream.Collectors.toList());
        } catch (Exception e) {
            log.error("Query data source options failed, dbType={}", dbType, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }


    private void checkDataSourceNotUsed(Long datasourceId) {
        boolean usedByBatchJob = jobDefinitionDao.existsByDatasourceId(datasourceId);
        if (usedByBatchJob) {
            throw new ServiceException("The data source is currently used by a job and cannot be deleted."
            );
        }
    }

    private void checkDataSourcesNotUsed(List<Long> datasourceIds) {
        List<Long> batchReferencedIds = jobDefinitionDao.selectReferencedDatasourceIds(datasourceIds);
        List<Long> referencedIds = batchReferencedIds.stream()
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        if (!referencedIds.isEmpty()) {
            throw new ServiceException(
                    Status.REQUEST_PARAMS_NOT_VALID_ERROR,
                    "Data sources are used by batch job definitions and cannot be deleted. datasourceIds=" + referencedIds
            );
        }
    }

    public Boolean checkConnection(DbType dbType, ConnectionParam param) {
        try {
            DataSourceProcessor processor = DataSourceUtils.getDatasourceProcessor(dbType);
            boolean connected = processor.getConnectionManager().checkDataSourceConnectivity(param);
            if (!connected) {
                throw new ServiceException(Status.DATASOURCE_CONNECT_FAILED);
            }
            return true;
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Check data source connection failed, dbType={}", dbType, e);
            throw new ServiceException(Status.DATASOURCE_CONNECT_TEST_ERROR, e.getMessage());
        }
    }

    private void validateCreateRequest(DataSourceDTO dto) {
        validateDto(dto);

        String name = dto.getName().trim();
        if (dataSourceDao.checkName(name)) {
            throw new ServiceException(Status.DATASOURCE_EXIST);
        }

        if (checkDescriptionLength(dto.getRemark())) {
            throw new ServiceException(Status.DESCRIPTION_TOO_LONG_ERROR);
        }
    }

    private void validateUpdateRequest(Long id, DataSourceDTO dto) {
        validateDto(dto);

        String name = dto.getName().trim();
        if (dataSourceDao.checkNameExcludeId(name, id)) {
            throw new ServiceException(Status.DATASOURCE_EXIST);
        }

        if (checkDescriptionLength(dto.getRemark())) {
            throw new ServiceException(Status.DESCRIPTION_TOO_LONG_ERROR);
        }
    }

    private void validateDto(DataSourceDTO dto) {
        if (dto == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "dataSourceDTO");
        }
        if (StringUtils.isBlank(dto.getName())) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "name");
        }
        if (dto.getDbType() == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "dbType");
        }
        if (StringUtils.isBlank(dto.getConnectionParams())) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "connectionParams");
        }
    }

    private void validateId(Long id) {
        if (id == null || id <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "id");
        }
    }

    private void validateJdbcDriverFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ServiceException(Status.DATASOURCE_FILE_EMPTY);
        }

        String originalFilename = file.getOriginalFilename();
        if (StringUtils.isBlank(originalFilename)) {
            throw new ServiceException(Status.DATASOURCE_FILE_NAME_INVALID);
        }

        String safeFilename = Paths.get(originalFilename).getFileName().toString();
        if (StringUtils.isBlank(safeFilename)) {
            throw new ServiceException(Status.DATASOURCE_FILE_NAME_INVALID);
        }

        if (!StringUtils.endsWithIgnoreCase(safeFilename, JDBC_JAR_SUFFIX)) {
            throw new ServiceException(Status.DATASOURCE_FILE_TYPE_ERROR);
        }

        if (file.getSize() > MAX_JDBC_DRIVER_SIZE) {
            throw new ServiceException(Status.DATASOURCE_FILE_TOO_LARGE);
        }
    }

    private DataSource getDataSourceOrThrow(Long id) {
        DataSource entity = dataSourceDao.queryById(id);
        if (entity == null) {
            throw new ServiceException(Status.DATASOURCE_NOT_EXIST);
        }
        return entity;
    }

    private DbType extractDbType(String connJson) {
        String type = JSONUtils.getNodeString(connJson, "type");
        if (StringUtils.isBlank(type)) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "type");
        }

        try {
            return DbType.valueOf(type);
        } catch (IllegalArgumentException e) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "type");
        }
    }

    private Boolean testConnection(DataSource dataSource) {
        updateConnectionStatus(dataSource.getId(), ConnStatus.CONNECTING);
        try {
            ConnectionParam param = DataSourceUtils.buildConnectionParams(
                    dataSource.getDbType(),
                    dataSource.getConnectionParams()
            );

            boolean connected = checkConnection(dataSource.getDbType(), param);
            updateConnectionStatus(
                    dataSource.getId(),
                    connected ? ConnStatus.CONNECTED_SUCCESS : ConnStatus.CONNECTED_FAILED
            );
            return connected;
        } catch (ServiceException e) {
            updateConnectionStatus(dataSource.getId(), ConnStatus.CONNECTED_FAILED);
            throw e;
        } catch (Exception e) {
            log.error("Connection test failed, dataSourceId={}", dataSource.getId(), e);
            updateConnectionStatus(dataSource.getId(), ConnStatus.CONNECTED_FAILED);
            throw new ServiceException(Status.DATASOURCE_CONNECT_TEST_ERROR, e.getMessage());
        }
    }

    private void updateConnectionStatus(Long id, ConnStatus status) {
        try {
            dataSourceDao.updateConnStatus(id, status);
        } catch (Exception e) {
            log.error("Update connection status failed, id={}, status={}", id, status, e);
        }
    }

    private void fillDerivedFields(DataSourceVO vo) {
        if (vo == null) {
            return;
        }

        try {
            String jdbcUrl = JSONUtils.getNodeString(vo.getConnectionParams(), "url");
            vo.setJdbcUrl(jdbcUrl);
        } catch (Exception e) {
            log.warn("Parse jdbc url from connection params failed");
        }

        if (vo.getEnvironment() != null) {
            vo.setEnvironmentName(vo.getEnvironment().getDescription());
        }
    }

    private DBOptionVO toOptionVO(DataSource entity) {
        DBOptionVO option = new DBOptionVO();
        option.setValue(entity.getId());
        option.setLabel(entity.getName());
        option.setDbType(entity.getDbType());
        return option;
    }
}
