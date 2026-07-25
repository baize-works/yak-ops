package io.yak.ops.dao.repository;


import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.common.enums.ConnStatus;
import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.dao.model.query.DataSourceQuery;

import java.util.List;

public interface DataSourceDao extends IDao<DataSource> {

    boolean checkName(String name);

    boolean checkNameExcludeId(String name, Long id);

    IPage<DataSource> queryPage(DataSourceQuery query);

    List<DataSource> queryByDbType(String dbType);

    int updateConnStatus(Long id, ConnStatus status);


}
