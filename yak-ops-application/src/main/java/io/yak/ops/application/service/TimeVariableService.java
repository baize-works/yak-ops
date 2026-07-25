package io.yak.ops.application.service;

import io.yak.ops.application.support.time.TimeVariableRenderService;
import io.yak.ops.web.contract.dto.TimeVariableCreateDTO;
import io.yak.ops.web.contract.dto.TimeVariablePageReq;
import io.yak.ops.web.contract.dto.TimeVariablePreviewReq;
import io.yak.ops.web.contract.dto.TimeVariableUpdateDTO;
import io.yak.ops.web.contract.response.PaginationResult;
import io.yak.ops.web.contract.vo.TimeVariablePreviewVO;
import io.yak.ops.web.contract.vo.TimeVariableVO;

public interface TimeVariableService{

    Long create(TimeVariableCreateDTO dto);

    Boolean update(Long id, TimeVariableUpdateDTO dto);

    TimeVariableVO getById(Long id);

    PaginationResult<TimeVariableVO> pageQuery(TimeVariablePageReq req);

    void delete(Long id);

    TimeVariablePreviewVO preview(TimeVariablePreviewReq req);
}
