package io.baize.flow.dao.repository;


import com.baomidou.mybatisplus.core.metadata.IPage;
import io.baize.flow.common.enums.ConnStatus;
import io.baize.flow.dao.entity.DataSource;
import io.baize.flow.web.contract.dto.DataSourceDTO;

import java.util.List;

public interface DataSourceDao extends IDao<DataSource> {

    boolean checkName(String name);

    boolean checkNameExcludeId(String name, Long id);

    IPage<DataSource> queryPage(DataSourceDTO dto);

    List<DataSource> queryByDbType(String dbType);

    int updateConnStatus(Long id, ConnStatus status);


}
