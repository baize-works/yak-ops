package io.baize.flow.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import jakarta.annotation.Resource;
import lombok.NonNull;
import io.baize.flow.common.enums.ReleaseState;
import io.baize.flow.dao.entity.JobDefinitionEntity;
import io.baize.flow.dao.mapper.JobDefinitionMapper;
import io.baize.flow.dao.repository.BaseDao;
import io.baize.flow.dao.repository.JobDefinitionDao;
import io.baize.flow.web.contract.dto.BatchJobDefinitionQueryDTO;
import io.baize.flow.web.contract.vo.BatchJobDefinitionVO;
import org.springframework.stereotype.Repository;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Repository
public class JobDefinitionDaoImpl
        extends BaseDao<JobDefinitionEntity, JobDefinitionMapper>
        implements JobDefinitionDao {

    @Resource
    private JobDefinitionMapper jobDefinitionMapper;

    public JobDefinitionDaoImpl(@NonNull JobDefinitionMapper jobDefinitionMapper) {
        super(jobDefinitionMapper);
    }

    @Override
    public boolean saveOrUpdate(JobDefinitionEntity po) {
        return jobDefinitionMapper.insertOrUpdate(po);
    }

    @Override
    public List<BatchJobDefinitionVO> selectPageWithLatestInstance(
            BatchJobDefinitionQueryDTO dto,
            int offset,
            int pageSize
    ) {
        return jobDefinitionMapper.selectPageWithLatestInstance(dto, offset, pageSize);
    }

    @Override
    public Long count(BatchJobDefinitionQueryDTO dto) {
        return jobDefinitionMapper.selectDefinitionCount(dto);
    }

    public boolean updateReleaseState(Long id, ReleaseState releaseState) {
        if (id == null || releaseState == null) {
            return false;
        }

        JobDefinitionEntity entity = new JobDefinitionEntity();
        entity.setId(id);
        entity.setReleaseState(releaseState);
        entity.initUpdate();

        return this.updateById(entity);
    }

    @Override
    public List<JobDefinitionEntity> listByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> validIds = ids.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .collect(Collectors.toList());

        if (validIds.isEmpty()) {
            return Collections.emptyList();
        }

        LambdaQueryWrapper<JobDefinitionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(JobDefinitionEntity::getId, validIds);

        List<JobDefinitionEntity> records = jobDefinitionMapper.selectList(wrapper);
        if (records == null || records.isEmpty()) {
            return Collections.emptyList();
        }

        return records;
    }

    @Override
    public boolean existsByDatasourceId(Long datasourceId) {
        if (datasourceId == null || datasourceId <= 0) {
            return false;
        }

        LambdaQueryWrapper<JobDefinitionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.select(JobDefinitionEntity::getId)
                // 只有运行状态的任务存在时不允许操作
                .eq(JobDefinitionEntity::getReleaseState, ReleaseState.ONLINE)
                .and(w -> w
                        .eq(JobDefinitionEntity::getSourceDatasourceId, datasourceId)
                        .or()
                        .eq(JobDefinitionEntity::getSinkDatasourceId, datasourceId)
                )
                .last("LIMIT 1");

        return jobDefinitionMapper.selectOne(wrapper) != null;
    }

    @Override
    public List<Long> selectReferencedDatasourceIds(List<Long> datasourceIds) {
        if (datasourceIds == null || datasourceIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> validIds = datasourceIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .collect(Collectors.toList());

        if (validIds.isEmpty()) {
            return Collections.emptyList();
        }

        LambdaQueryWrapper<JobDefinitionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.select(
                JobDefinitionEntity::getSourceDatasourceId,
                JobDefinitionEntity::getSinkDatasourceId
        )
                .and(w -> w
                        .in(JobDefinitionEntity::getSourceDatasourceId, validIds)
                        .or()
                        .in(JobDefinitionEntity::getSinkDatasourceId, validIds)
                );

        List<JobDefinitionEntity> records = jobDefinitionMapper.selectList(wrapper);
        if (records == null || records.isEmpty()) {
            return Collections.emptyList();
        }

        return records.stream()
                .flatMap(record -> java.util.stream.Stream.of(
                        record.getSourceDatasourceId(),
                        record.getSinkDatasourceId()
                ))
                .filter(id -> id != null && validIds.contains(id))
                .distinct()
                .collect(Collectors.toList());
    }

    @Override
    public boolean existsByClientId(Long clientId) {
        if (clientId == null || clientId <= 0) {
            return false;
        }

        LambdaQueryWrapper<JobDefinitionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.select(JobDefinitionEntity::getId)
                .eq(JobDefinitionEntity::getClientId, clientId)
                .last("LIMIT 1");

        return jobDefinitionMapper.selectOne(wrapper) != null;
    }
}