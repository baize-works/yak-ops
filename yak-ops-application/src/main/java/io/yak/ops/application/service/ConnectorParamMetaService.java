package io.yak.ops.application.service;

import io.yak.ops.web.contract.dto.ConnectorParamMetaCreateDTO;
import io.yak.ops.web.contract.dto.ConnectorParamMetaQueryDTO;
import io.yak.ops.web.contract.dto.ConnectorParamMetaUpdateDTO;
import io.yak.ops.web.contract.response.PaginationResult;
import io.yak.ops.web.contract.vo.ConnectorParamMetaOptionVO;
import io.yak.ops.web.contract.vo.ConnectorParamMetaVO;

import java.util.List;

public interface ConnectorParamMetaService {

    Long create(ConnectorParamMetaCreateDTO dto);

    Boolean update(Long id, ConnectorParamMetaUpdateDTO dto);

    ConnectorParamMetaVO getById(Long id);

    PaginationResult<ConnectorParamMetaVO> pageQuery(ConnectorParamMetaQueryDTO dto);

    List<ConnectorParamMetaVO> list(String connectorName, String type);

    void delete(Long id);

    List<ConnectorParamMetaOptionVO> option(
            String connectorName,
            String connectorType,
            String type
    );
}
