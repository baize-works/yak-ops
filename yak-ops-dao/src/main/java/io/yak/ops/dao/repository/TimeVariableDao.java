package io.yak.ops.dao.repository;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.dao.entity.TimeVariable;
import io.yak.ops.web.contract.dto.TimeVariablePageReq;

import java.util.List;

public interface TimeVariableDao extends IDao<TimeVariable> {

    boolean checkDuplicate(String paramName);

    boolean checkDuplicateExcludeId(String paramName, Long id);

    IPage<TimeVariable> queryPage(TimeVariablePageReq req);

    List<TimeVariable> queryEnabledList();
}
