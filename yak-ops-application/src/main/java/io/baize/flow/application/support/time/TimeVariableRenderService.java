package io.baize.flow.application.support.time;

import io.baize.flow.dao.entity.TimeVariable;
import io.baize.flow.web.contract.dto.TimeVariableRenderReq;
import io.baize.flow.web.contract.vo.TimeVariableRenderVO;

import java.util.List;

public interface TimeVariableRenderService {

    TimeVariableRenderVO render(TimeVariableRenderReq req);

    String renderContent(String content);

    List<TimeVariable> getAllEnabledVariables();
}
