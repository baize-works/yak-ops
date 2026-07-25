package io.baize.flow.application.service;

import io.baize.flow.application.support.time.TimeVariableRenderService;
import io.baize.flow.web.contract.dto.TimeVariableCreateDTO;
import io.baize.flow.web.contract.dto.TimeVariablePageReq;
import io.baize.flow.web.contract.dto.TimeVariablePreviewReq;
import io.baize.flow.web.contract.dto.TimeVariableUpdateDTO;
import io.baize.flow.web.contract.response.PaginationResult;
import io.baize.flow.web.contract.vo.TimeVariablePreviewVO;
import io.baize.flow.web.contract.vo.TimeVariableVO;

public interface TimeVariableService{

    Long create(TimeVariableCreateDTO dto);

    Boolean update(Long id, TimeVariableUpdateDTO dto);

    TimeVariableVO getById(Long id);

    PaginationResult<TimeVariableVO> pageQuery(TimeVariablePageReq req);

    void delete(Long id);

    TimeVariablePreviewVO preview(TimeVariablePreviewReq req);
}