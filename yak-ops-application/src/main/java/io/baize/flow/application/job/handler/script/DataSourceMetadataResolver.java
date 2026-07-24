package io.baize.flow.application.job.handler.script;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.dao.repository.DataSourceDao;
import io.baize.flow.plugin.spi.enums.DbType;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSourceMetadataResolver {

    private final DataSourceDao dataSourceDao;

    public DbType resolveDbType(Long datasourceId) {
        if (datasourceId == null || datasourceId <= 0) {
            return null;
        }

        try {
            DataSource dataSource = dataSourceDao.queryById(datasourceId);
            if (dataSource == null) {
                log.warn("Can not find datasource by id, datasourceId={}", datasourceId);
                return null;
            }

            return dataSource.getDbType();
        } catch (Exception e) {
            log.warn("Resolve datasource dbType failed, datasourceId={}", datasourceId, e);
            return null;
        }
    }
}