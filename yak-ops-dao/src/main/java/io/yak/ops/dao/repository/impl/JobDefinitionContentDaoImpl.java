package io.yak.ops.dao.repository.impl;


import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import javax.annotation.Resource;
import lombok.NonNull;
import io.yak.ops.dao.entity.JobDefinitionContentEntity;
import io.yak.ops.dao.mapper.JobDefinitionContentMapper;
import io.yak.ops.dao.repository.BaseDao;
import io.yak.ops.dao.repository.JobDefinitionContentDao;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class JobDefinitionContentDaoImpl
        extends BaseDao<JobDefinitionContentEntity, JobDefinitionContentMapper>
        implements JobDefinitionContentDao {

    @Resource
    private JobDefinitionContentMapper jobDefinitionContentMapper;

    public JobDefinitionContentDaoImpl(@NonNull JobDefinitionContentMapper jobDefinitionContentMapper) {
        super(jobDefinitionContentMapper);
    }

    @Override
    public int save(JobDefinitionContentEntity po) {
        return jobDefinitionContentMapper.insert(po);
    }

    @Override
    public List<JobDefinitionContentEntity> queryByJobDefinitionId(Long jobDefinitionId) {
        LambdaQueryWrapper<JobDefinitionContentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(JobDefinitionContentEntity::getJobDefinitionId, jobDefinitionId);
        return jobDefinitionContentMapper.selectList(wrapper);
    }

    @Override
    public JobDefinitionContentEntity queryLatestByJobDefinitionId(Long jobDefinitionId) {
        return jobDefinitionContentMapper.selectOne(
                new LambdaQueryWrapper<JobDefinitionContentEntity>()
                        .eq(JobDefinitionContentEntity::getJobDefinitionId, jobDefinitionId)
                        .orderByDesc(JobDefinitionContentEntity::getVersion)
                        .last("limit 1")
        );
    }

    @Override
    public void deleteByJobDefinitionId(Long jobDefinitionId) {
        jobDefinitionContentMapper.delete(
                new LambdaQueryWrapper<JobDefinitionContentEntity>()
                        .eq(JobDefinitionContentEntity::getJobDefinitionId, jobDefinitionId)
        );
    }
}
