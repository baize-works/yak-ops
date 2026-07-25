package io.yak.ops.application.service;

import io.yak.ops.application.support.time.TimeVariableRenderService;
import io.yak.ops.application.model.dto.TimeVariableCreateDTO;
import io.yak.ops.application.model.dto.TimeVariablePageReq;
import io.yak.ops.application.model.dto.TimeVariablePreviewReq;
import io.yak.ops.application.model.dto.TimeVariableUpdateDTO;
import io.yak.ops.application.model.response.PaginationResult;
import io.yak.ops.application.model.vo.TimeVariablePreviewVO;
import io.yak.ops.application.model.vo.TimeVariableVO;

public interface TimeVariableService{

    Long create(TimeVariableCreateDTO dto);

    Boolean update(Long id, TimeVariableUpdateDTO dto);

    TimeVariableVO getById(Long id);

    PaginationResult<TimeVariableVO> pageQuery(TimeVariablePageReq req);

    void delete(Long id);

    TimeVariablePreviewVO preview(TimeVariablePreviewReq req);
}
