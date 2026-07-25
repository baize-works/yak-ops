package io.baize.flow.application.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.application.service.ConnectorParamMetaService;
import io.baize.flow.domain.exceptions.ServiceException;
import io.baize.flow.dao.entity.ConnectorParamMetaEntity;
import io.baize.flow.dao.repository.ConnectorParamMetaDao;
import io.baize.flow.web.contract.dto.ConnectorParamMetaCreateDTO;
import io.baize.flow.web.contract.dto.ConnectorParamMetaQueryDTO;
import io.baize.flow.web.contract.dto.ConnectorParamMetaUpdateDTO;
import io.baize.flow.web.contract.response.PaginationResult;
import io.baize.flow.web.contract.vo.ConnectorParamMetaOptionVO;
import io.baize.flow.web.contract.vo.ConnectorParamMetaVO;
import io.baize.flow.plugin.spi.enums.Status;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ConnectorParamMetaServiceImpl implements ConnectorParamMetaService {

    private static final String DEFAULT_TYPE = "connector";
    private static final String DEFAULT_CONNECTOR_NAME = "Jdbc";

    @Resource
    private ConnectorParamMetaDao connectorParamMetaDao;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long create(ConnectorParamMetaCreateDTO dto) {
        validateCreateDto(dto);

        try {
            if (connectorParamMetaDao.checkDuplicate(
                    dto.getType(),
                    dto.getConnectorName(),
                    dto.getParamName()
            )) {
                throw new ServiceException(Status.CONNECTOR_PARAM_META_ALREADY_EXISTS);
            }

            ConnectorParamMetaEntity entity = new ConnectorParamMetaEntity();
            BeanUtils.copyProperties(dto, entity);

            normalizeEntity(entity);

            connectorParamMetaDao.insert(entity);
            return entity.getId();
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Create connector param meta failed, dto={}", dto, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean update(Long id, ConnectorParamMetaUpdateDTO dto) {
        validateId(id);
        validateUpdateDto(dto);

        ConnectorParamMetaEntity existing = getEntityOrThrow(id);

        try {
            String targetType = StringUtils.isNotBlank(dto.getType())
                    ? dto.getType()
                    : existing.getType();

            String targetConnectorName = StringUtils.isNotBlank(dto.getConnectorName())
                    ? dto.getConnectorName()
                    : existing.getConnectorName();

            String targetParamName = StringUtils.isNotBlank(dto.getParamName())
                    ? dto.getParamName()
                    : existing.getParamName();

            if (connectorParamMetaDao.checkDuplicateExcludeId(
                    targetType,
                    targetConnectorName,
                    targetParamName,
                    id
            )) {
                throw new ServiceException(Status.CONNECTOR_PARAM_META_ALREADY_EXISTS);
            }

            ConnectorParamMetaEntity entity = new ConnectorParamMetaEntity();
            BeanUtils.copyProperties(dto, entity);
            entity.setId(id);

            normalizeEntity(entity);
            entity.initUpdate();

            return connectorParamMetaDao.updateById(entity);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Update connector param meta failed, id={}, dto={}", id, dto, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    public ConnectorParamMetaVO getById(Long id) {
        validateId(id);

        try {
            return toVO(getEntityOrThrow(id));
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Query connector param meta by id failed, id={}", id, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    public PaginationResult<ConnectorParamMetaVO> pageQuery(ConnectorParamMetaQueryDTO dto) {
        if (dto == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "queryDTO");
        }

        if (dto.getPageNum() == null || dto.getPageNum() <= 0) {
            dto.setPageNum(1L);
        }
        if (dto.getPageSize() == null || dto.getPageSize() <= 0) {
            dto.setPageSize(10L);
        }

        try {
            IPage<ConnectorParamMetaEntity> pageResult = connectorParamMetaDao.queryPage(dto);
            List<ConnectorParamMetaVO> records = pageResult.getRecords()
                    .stream()
                    .map(this::toVO)
                    .collect(Collectors.toList());

            return PaginationResult.buildSuc(records, pageResult);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Page query connector param meta failed, dto={}", dto, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    public List<ConnectorParamMetaVO> list(String connectorName, String type) {
        try {
            return connectorParamMetaDao.queryList(
                    normalizeConnectorName(connectorName),
                    normalizeType(type)
            )
                    .stream()
                    .map(this::toVO)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error(
                    "List connector param meta failed, connectorName={}, type={}",
                    connectorName,
                    type,
                    e
            );
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    public List<ConnectorParamMetaOptionVO> option(
            String connectorName,
            String connectorType,
            String type
    ) {
        String finalConnectorName = normalizeConnectorName(connectorName);
        String finalConnectorType = normalizeConnectorType(connectorType);
        String finalType = normalizeType(type);

        try {
            return connectorParamMetaDao.queryOptionList(
                    finalConnectorName,
                    finalConnectorType,
                    finalType
            )
                    .stream()
                    .map(this::toOptionVO)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error(
                    "Query connector param option failed, connectorName={}, connectorType={}, type={}",
                    connectorName,
                    connectorType,
                    type,
                    e
            );
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        validateId(id);
        getEntityOrThrow(id);

        try {
            connectorParamMetaDao.deleteById(id);
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Delete connector param meta failed, id={}", id, e);
            throw new ServiceException(Status.INTERNAL_SERVER_ERROR_ARGS, e.getMessage());
        }
    }

    private void validateCreateDto(ConnectorParamMetaCreateDTO dto) {
        if (dto == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "connectorParamMetaCreateDTO");
        }
        if (StringUtils.isBlank(dto.getType())) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "type");
        }
        if (StringUtils.isBlank(dto.getConnectorName())) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "connectorName");
        }
        if (StringUtils.isBlank(dto.getConnectorType())) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "connectorType");
        }
        if (StringUtils.isBlank(dto.getParamName())) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "paramName");
        }
    }

    private void validateUpdateDto(ConnectorParamMetaUpdateDTO dto) {
        if (dto == null) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "connectorParamMetaUpdateDTO");
        }
    }

    private void validateId(Long id) {
        if (id == null || id <= 0) {
            throw new ServiceException(Status.REQUEST_PARAMS_NOT_VALID_ERROR, "id");
        }
    }

    private ConnectorParamMetaEntity getEntityOrThrow(Long id) {
        ConnectorParamMetaEntity entity = connectorParamMetaDao.queryById(id);
        if (entity == null) {
            throw new ServiceException(Status.CONNECTOR_PARAM_META_NOT_EXIST);
        }
        return entity;
    }

    private ConnectorParamMetaVO toVO(ConnectorParamMetaEntity entity) {
        ConnectorParamMetaVO vo = new ConnectorParamMetaVO();
        BeanUtils.copyProperties(entity, vo);
        return vo;
    }

    private ConnectorParamMetaOptionVO toOptionVO(ConnectorParamMetaEntity entity) {
        ConnectorParamMetaOptionVO vo = new ConnectorParamMetaOptionVO();
        vo.setValue(entity.getParamName());
        vo.setLabel(resolveOptionLabel(entity));
        vo.setDescription(entity.getParamDesc());
        vo.setDefaultValue(entity.getDefaultValue());
        vo.setExampleValue(entity.getExampleValue());
        vo.setParamType(entity.getParamType());
        vo.setRequiredFlag(entity.getRequiredFlag());
        return vo;
    }

    private String resolveOptionLabel(ConnectorParamMetaEntity entity) {
        if (StringUtils.isNotBlank(entity.getRemark())) {
            return entity.getRemark();
        }
        if (StringUtils.isNotBlank(entity.getParamDesc())) {
            return entity.getParamDesc();
        }
        return entity.getParamName();
    }

    private void normalizeEntity(ConnectorParamMetaEntity entity) {
        if (entity == null) {
            return;
        }

        if (StringUtils.isNotBlank(entity.getType())) {
            entity.setType(entity.getType().trim());
        }

        if (StringUtils.isNotBlank(entity.getConnectorName())) {
            entity.setConnectorName(entity.getConnectorName().trim());
        }

        if (StringUtils.isNotBlank(entity.getConnectorType())) {
            entity.setConnectorType(entity.getConnectorType().trim().toLowerCase());
        }


        if (StringUtils.isNotBlank(entity.getParamName())) {
            entity.setParamName(entity.getParamName().trim());
        }

        if (entity.getRequiredFlag() == null) {
            entity.setRequiredFlag(0);
        }
    }

    private String normalizeConnectorName(String connectorName) {
        if (StringUtils.isBlank(connectorName)) {
            return DEFAULT_CONNECTOR_NAME;
        }
        return connectorName.trim();
    }

    private String normalizeConnectorType(String connectorType) {
        if (StringUtils.isBlank(connectorType)) {
            return null;
        }
        return connectorType.trim().toLowerCase();
    }

    private String normalizeDbType(String dbType) {
        if (StringUtils.isBlank(dbType)) {
            return null;
        }
        return dbType.trim().toUpperCase();
    }

    private String normalizeType(String type) {
        if (StringUtils.isBlank(type)) {
            return DEFAULT_TYPE;
        }
        return type.trim();
    }
}