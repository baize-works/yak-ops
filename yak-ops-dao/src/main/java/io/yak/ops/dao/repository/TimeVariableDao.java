package io.yak.ops.dao.repository;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.dao.entity.TimeVariable;
import io.yak.ops.dao.model.query.TimeVariablePageQuery;

import java.util.List;

public interface TimeVariableDao extends IDao<TimeVariable> {

    boolean checkDuplicate(String paramName);

    boolean checkDuplicateExcludeId(String paramName, Long id);

    IPage<TimeVariable> queryPage(TimeVariablePageQuery req);

    List<TimeVariable> queryEnabledList();
}
