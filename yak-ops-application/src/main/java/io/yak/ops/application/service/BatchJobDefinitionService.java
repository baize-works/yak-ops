package io.yak.ops.application.service;

import io.yak.ops.common.enums.ReleaseState;
import io.yak.ops.application.model.dto.BatchJobDefinitionQueryDTO;
import io.yak.ops.application.model.dto.batch.BatchGuideMultiJobSaveCommand;
import io.yak.ops.application.model.dto.batch.BatchGuideSingleJobSaveCommand;
import io.yak.ops.application.model.dto.batch.BatchScriptJobSaveCommand;
import io.yak.ops.application.model.response.PaginationResult;
import io.yak.ops.application.model.vo.BatchJobDefinitionVO;
import io.yak.ops.application.model.vo.JobDefinitionEditDetailVO;
import io.yak.ops.application.model.vo.JobDefinitionSaveResultVO;

import java.util.List;

public interface BatchJobDefinitionService {

    JobDefinitionSaveResultVO saveOrUpdate(BatchScriptJobSaveCommand command);

    JobDefinitionSaveResultVO saveOrUpdate(BatchGuideSingleJobSaveCommand command);

    JobDefinitionSaveResultVO saveOrUpdate(BatchGuideMultiJobSaveCommand command);

    String buildHoconConfig(BatchScriptJobSaveCommand command);

    String buildHoconConfig(BatchGuideSingleJobSaveCommand command);

    String buildHoconConfig(BatchGuideMultiJobSaveCommand command);

    BatchJobDefinitionVO selectById(Long id);

    PaginationResult<BatchJobDefinitionVO> paging(BatchJobDefinitionQueryDTO dto);

    Boolean delete(Long jobDefinitionId);

    JobDefinitionEditDetailVO selectEditDetail(Long id);

    Boolean updateReleaseState(Long id, ReleaseState releaseState);

    List<BatchJobDefinitionVO> listByIds(List<Long> ids);
}
