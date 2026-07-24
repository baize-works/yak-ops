package io.baize.flow.api.service;

import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.web.contract.dto.DataSourceDTO;
import io.baize.flow.web.contract.response.PaginationResult;
import io.baize.flow.web.contract.vo.DBOptionVO;
import io.baize.flow.web.contract.vo.DataSourceVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;


public interface DataSourceService {

    /**
     * Creates and persists a new datasource instance.
     *
     * <p>Before saving, the implementation should validate
     * plugin-specific parameters and optionally test connectivity.</p>
     *
     * @param dto creation request containing plugin type,
     *            connection parameters, environment, etc.
     * @return created datasource descriptor including generated ID
     * @throws RuntimeException if validation or connectivity test fails
     */
    DataSource createDataSource(DataSourceDTO dto);

    /**
     * Updates an existing datasource instance.
     *
     * <p>If connection parameters change, connectivity should be revalidated.</p>
     *
     * @param id primary key of the datasource
     * @param dto updated values (only non-null fields are applied)
     * @return the updated datasource ID
     * @throws RuntimeException if datasource does not exist or validation fails
     */
    DataSource updateDataSource(Long id, DataSourceDTO dto);

    /**
     * Retrieves a datasource by its primary key.
     *
     * @param id primary key
     * @return datasource descriptor
     * @throws RuntimeException if datasource does not exist
     */
    DataSource selectById(Long id);

    /**
     * Returns a paginated list of datasources.
     *
     * <p>Filters may include name, plugin type, creator, or environment.</p>
     *
     * @param dto query conditions and pagination parameters
     * @return paginated result including total count and records
     */
    PaginationResult<DataSourceVO> queryDataSourceListPaging(DataSourceDTO dto);

    /**
     * Soft deletes a datasource.
     *
     * @param id primary key
     * @return {@code true} if deletion succeeded
     */
    void delete(Long id);

    /**
     * Tests connectivity of an existing datasource.
     *
     * @param id primary key
     * @return {@code true} if connection succeeds
     */
    Boolean connectionTest(Long id);

    /**
     * Returns a list of datasource options filtered by database type.
     *
     * <p>Mainly used for populating dropdown selectors in the UI.</p>
     *
     * @param dbType database type (e.g. MySQL, Oracle, Kafka)
     * @return list of id/name option pairs
     */
    List<DBOptionVO> option(String dbType);

    /**
     * Batch soft deletion of datasources.
     *
     * @param ids datasource IDs
     * @return {@code true} if all deletions succeed
     */
    boolean batchDelete(List<Long> ids);

    /**
     * Batch connection test for multiple datasources.
     *
     * @param ids datasource IDs
     * @return {@code true} only if all connections succeed
     */
    Boolean batchConnectionTest(List<Long> ids);

    /**
     * Tests connectivity using connection parameters
     * without persisting the datasource.
     *
     * <p>This method is typically used in datasource creation
     * or editing forms to validate parameters before saving.</p>
     *
     * @param connJson JSON string containing plugin-specific parameters
     * @return {@code true} if connection succeeds
     */
    Boolean connectionTestWithParam(String connJson);

    /**
     * Retrieves all datasources.
     *
     * <p>No pagination applied.</p>
     *
     * @return list of all datasources
     */
    List<DataSourceVO> listAll();

    /**
     * Uploads a JDBC driver file for a specific plugin.
     *
     * <p>The uploaded driver will be stored and associated with
     * the specified plugin type.</p>
     *
     * @param file uploaded JDBC driver (usually a .jar)
     * @param pluginType plugin identifier (e.g. mysql, postgres)
     * @param overwrite whether to overwrite an existing driver
     * @return result metadata such as file path or status
     */
    Map<String, Object> uploadJdbcDriver(
            MultipartFile file,
            String pluginType,
            boolean overwrite
    );
}