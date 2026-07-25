package io.yak.ops.dao.repository;


import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.common.enums.ConnStatus;
import io.yak.ops.dao.entity.DataSource;
import io.yak.ops.web.contract.dto.DataSourceDTO;

import java.util.List;

public interface DataSourceDao extends IDao<DataSource> {

    boolean checkName(String name);

    boolean checkNameExcludeId(String name, Long id);

    IPage<DataSource> queryPage(DataSourceDTO dto);

    List<DataSource> queryByDbType(String dbType);

    int updateConnStatus(Long id, ConnStatus status);


}
