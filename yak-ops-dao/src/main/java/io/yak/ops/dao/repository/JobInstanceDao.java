package io.yak.ops.dao.repository;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.domain.enums.JobMode;
import io.yak.ops.domain.enums.JobStatus;
import io.yak.ops.dao.entity.JobInstance;
import io.yak.ops.web.contract.dto.SeaTunnelJobInstanceDTO;
import io.yak.ops.web.contract.vo.JobInstanceVO;

import java.util.Date;
import java.util.List;

public interface JobInstanceDao extends IDao<JobInstance> {

    IPage<JobInstanceVO> pageWithDefinition(SeaTunnelJobInstanceDTO dto);

    JobInstanceVO selectDetailById(Long id);

    boolean existsRunningInstance(Long definitionId);

    void deleteByDefinitionId(Long definitionId);

    List<JobInstance> listRunningLikeInstances();

    int failRunningInstancesByClientId(Long clientId, String errorMessage);

    void updateStatus(Long instanceId, JobStatus status, String errorMessage);

    void updateStatusAndEngineId(Long instanceId, JobStatus status, String engineJobId);

    void updateSubmitResult(Long instanceId, String engineJobId, JobStatus submitStatus, Date submitTime);

    List<JobInstanceVO> listRunningByJobType(JobMode jobMode);

    List<JobInstance> selectRunningInstanceByDefinitionIds(List<Long> definitionIds);
}
