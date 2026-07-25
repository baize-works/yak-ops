package io.yak.ops.dao.repository.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import javax.annotation.Resource;
import lombok.NonNull;
import io.yak.ops.common.enums.ReleaseState;
import io.yak.ops.dao.entity.JobDefinitionEntity;
import io.yak.ops.dao.mapper.JobDefinitionMapper;
import io.yak.ops.dao.repository.BaseDao;
import io.yak.ops.dao.repository.JobDefinitionDao;
import io.yak.ops.dao.model.query.JobDefinitionQuery;
import io.yak.ops.dao.model.result.JobDefinitionResult;
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
    public List<JobDefinitionResult> selectPageWithLatestInstance(
            JobDefinitionQuery query,
            int offset,
            int pageSize
    ) {
        return jobDefinitionMapper.selectPageWithLatestInstance(query, offset, pageSize);
    }

    @Override
    public Long count(JobDefinitionQuery query) {
        return jobDefinitionMapper.selectDefinitionCount(query);
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
            return java.util.Collections.emptyList();
        }

        List<Long> validIds = ids.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        if (validIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        LambdaQueryWrapper<JobDefinitionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(JobDefinitionEntity::getId, validIds);

        List<JobDefinitionEntity> records = jobDefinitionMapper.selectList(wrapper);
        if (records == null || records.isEmpty()) {
            return java.util.Collections.emptyList();
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
            return java.util.Collections.emptyList();
        }

        List<Long> validIds = datasourceIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        if (validIds.isEmpty()) {
            return java.util.Collections.emptyList();
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
            return java.util.Collections.emptyList();
        }

        return records.stream()
                .flatMap(record -> java.util.stream.Stream.of(
                        record.getSourceDatasourceId(),
                        record.getSinkDatasourceId()
                ))
                .filter(id -> id != null && validIds.contains(id))
                .distinct()
                .collect(java.util.stream.Collectors.toList());
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
