package io.baize.flow.dao.repository;

import io.baize.flow.common.enums.ReleaseState;
import io.baize.flow.dao.entity.JobDefinitionEntity;
import io.baize.flow.web.contract.dto.BatchJobDefinitionQueryDTO;
import io.baize.flow.web.contract.vo.BatchJobDefinitionVO;

import java.util.List;

public interface JobDefinitionDao extends IDao<JobDefinitionEntity> {

    boolean saveOrUpdate(JobDefinitionEntity po);

    List<BatchJobDefinitionVO> selectPageWithLatestInstance(
            BatchJobDefinitionQueryDTO dto,
            int offset,
            int pageSize
    );

    Long count(BatchJobDefinitionQueryDTO dto);

    boolean updateReleaseState(Long id, ReleaseState releaseState);

    List<JobDefinitionEntity> listByIds(List<Long> ids);

    boolean existsByDatasourceId(Long datasourceId);

    List<Long> selectReferencedDatasourceIds(List<Long> datasourceIds);

    boolean existsByClientId(Long clientId);
}
