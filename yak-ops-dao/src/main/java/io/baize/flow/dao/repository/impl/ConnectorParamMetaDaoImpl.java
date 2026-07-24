package io.baize.flow.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import jakarta.annotation.Resource;
import lombok.NonNull;
import org.apache.commons.lang3.StringUtils;
import io.baize.flow.dao.entity.ConnectorParamMetaEntity;
import io.baize.flow.dao.mapper.ConnectorParamMetaMapper;
import io.baize.flow.dao.repository.BaseDao;
import io.baize.flow.dao.repository.ConnectorParamMetaDao;
import io.baize.flow.web.contract.dto.ConnectorParamMetaQueryDTO;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ConnectorParamMetaDaoImpl
        extends BaseDao<ConnectorParamMetaEntity, ConnectorParamMetaMapper>
        implements ConnectorParamMetaDao {

    @Resource
    private ConnectorParamMetaMapper connectorParamMetaMapper;

    public ConnectorParamMetaDaoImpl(@NonNull ConnectorParamMetaMapper connectorParamMetaMapper) {
        super(connectorParamMetaMapper);
    }

    @Override
    public boolean checkDuplicate(String type, String connectorName, String paramName) {
        LambdaQueryWrapper<ConnectorParamMetaEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ConnectorParamMetaEntity::getType, type)
                .eq(ConnectorParamMetaEntity::getConnectorName, connectorName)
                .eq(ConnectorParamMetaEntity::getParamName, paramName);
        return connectorParamMetaMapper.selectCount(wrapper) > 0;
    }

    @Override
    public boolean checkDuplicateExcludeId(String type, String connectorName, String paramName, Long id) {
        LambdaQueryWrapper<ConnectorParamMetaEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ConnectorParamMetaEntity::getType, type)
                .eq(ConnectorParamMetaEntity::getConnectorName, connectorName)
                .eq(ConnectorParamMetaEntity::getParamName, paramName)
                .ne(id != null, ConnectorParamMetaEntity::getId, id);
        return connectorParamMetaMapper.selectCount(wrapper) > 0;
    }

    @Override
    public IPage<ConnectorParamMetaEntity> queryPage(ConnectorParamMetaQueryDTO dto) {
        LambdaQueryWrapper<ConnectorParamMetaEntity> wrapper = new LambdaQueryWrapper<ConnectorParamMetaEntity>()
                .eq(StringUtils.isNotBlank(dto.getType()), ConnectorParamMetaEntity::getType, dto.getType())
                .eq(StringUtils.isNotBlank(dto.getConnectorName()), ConnectorParamMetaEntity::getConnectorName, dto.getConnectorName())
                .like(StringUtils.isNotBlank(dto.getParamName()), ConnectorParamMetaEntity::getParamName, dto.getParamName())
                .orderByDesc(ConnectorParamMetaEntity::getUpdateTime)
                .orderByDesc(ConnectorParamMetaEntity::getId);

        IPage<ConnectorParamMetaEntity> page = new Page<>(dto.getPageNum(), dto.getPageSize());
        return connectorParamMetaMapper.selectPage(page, wrapper);
    }

    @Override
    public List<ConnectorParamMetaEntity> queryList(String connectorName, String type) {
        LambdaQueryWrapper<ConnectorParamMetaEntity> wrapper = new LambdaQueryWrapper<ConnectorParamMetaEntity>()
                .eq(StringUtils.isNotBlank(connectorName), ConnectorParamMetaEntity::getConnectorName, connectorName)
                .eq(StringUtils.isNotBlank(type), ConnectorParamMetaEntity::getType, type)
                .orderByAsc(ConnectorParamMetaEntity::getParamName)
                .orderByAsc(ConnectorParamMetaEntity::getId);

        return connectorParamMetaMapper.selectList(wrapper);
    }

    @Override
    public List<ConnectorParamMetaEntity> queryOptionList(
            String connectorName,
            String connectorType,
            String type) {

        LambdaQueryWrapper<ConnectorParamMetaEntity> wrapper =
                new LambdaQueryWrapper<ConnectorParamMetaEntity>()
                        .eq(StringUtils.isNotBlank(type),
                                ConnectorParamMetaEntity::getType,
                                type)
                        .eq(StringUtils.isNotBlank(connectorName),
                                ConnectorParamMetaEntity::getConnectorName,
                                connectorName)
                        .eq(StringUtils.isNotBlank(connectorType),
                                ConnectorParamMetaEntity::getConnectorType,
                                connectorType)
                        .orderByDesc(ConnectorParamMetaEntity::getRequiredFlag)
                        .orderByAsc(ConnectorParamMetaEntity::getParamName)
                        .orderByAsc(ConnectorParamMetaEntity::getId);

        return connectorParamMetaMapper.selectList(wrapper);
    }
}