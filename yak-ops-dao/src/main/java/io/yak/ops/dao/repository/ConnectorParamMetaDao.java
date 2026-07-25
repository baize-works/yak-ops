package io.yak.ops.dao.repository;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.yak.ops.dao.entity.ConnectorParamMetaEntity;
import io.yak.ops.web.contract.dto.ConnectorParamMetaQueryDTO;

import java.util.List;

public interface ConnectorParamMetaDao extends IDao<ConnectorParamMetaEntity> {

    boolean checkDuplicate(String type, String connectorName, String paramName);

    boolean checkDuplicateExcludeId(String type, String connectorName, String paramName, Long id);

    IPage<ConnectorParamMetaEntity> queryPage(ConnectorParamMetaQueryDTO dto);

    List<ConnectorParamMetaEntity> queryList(String connectorName, String type);

    List<ConnectorParamMetaEntity> queryOptionList(
            String connectorName,
            String connectorType,
            String type);
}
