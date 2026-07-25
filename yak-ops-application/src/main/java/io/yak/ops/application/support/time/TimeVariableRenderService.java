package io.yak.ops.application.support.time;

import io.yak.ops.dao.entity.TimeVariable;
import io.yak.ops.web.contract.dto.TimeVariableRenderReq;
import io.yak.ops.web.contract.vo.TimeVariableRenderVO;

import java.util.List;

public interface TimeVariableRenderService {

    TimeVariableRenderVO render(TimeVariableRenderReq req);

    String renderContent(String content);

    List<TimeVariable> getAllEnabledVariables();
}
