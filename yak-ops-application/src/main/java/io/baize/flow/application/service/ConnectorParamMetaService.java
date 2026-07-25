package io.baize.flow.application.service;

import io.baize.flow.web.contract.dto.ConnectorParamMetaCreateDTO;
import io.baize.flow.web.contract.dto.ConnectorParamMetaQueryDTO;
import io.baize.flow.web.contract.dto.ConnectorParamMetaUpdateDTO;
import io.baize.flow.web.contract.response.PaginationResult;
import io.baize.flow.web.contract.vo.ConnectorParamMetaOptionVO;
import io.baize.flow.web.contract.vo.ConnectorParamMetaVO;

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