package io.yak.ops.dao.repository;

import io.yak.ops.common.enums.ReleaseState;
import io.yak.ops.dao.entity.JobDefinitionEntity;
import io.yak.ops.dao.model.query.JobDefinitionQuery;
import io.yak.ops.dao.model.result.JobDefinitionResult;

import java.util.List;

public interface JobDefinitionDao extends IDao<JobDefinitionEntity> {

    boolean saveOrUpdate(JobDefinitionEntity po);

    List<JobDefinitionResult> selectPageWithLatestInstance(
            JobDefinitionQuery query,
            int offset,
            int pageSize
    );

    Long count(JobDefinitionQuery query);

    boolean updateReleaseState(Long id, ReleaseState releaseState);

    List<JobDefinitionEntity> listByIds(List<Long> ids);

    boolean existsByDatasourceId(Long datasourceId);

    List<Long> selectReferencedDatasourceIds(List<Long> datasourceIds);

    boolean existsByClientId(Long clientId);
}
