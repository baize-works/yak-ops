package io.yak.ops.dao.repository;

import io.yak.ops.common.enums.ReleaseState;
import io.yak.ops.dao.entity.JobDefinitionEntity;
import io.yak.ops.web.contract.dto.BatchJobDefinitionQueryDTO;
import io.yak.ops.web.contract.vo.BatchJobDefinitionVO;

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
