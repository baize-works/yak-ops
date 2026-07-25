package io.yak.ops.dao.repository;

import io.yak.ops.dao.entity.JobDefinitionContentEntity;

import java.util.List;

public interface JobDefinitionContentDao extends IDao<JobDefinitionContentEntity> {

    int save(JobDefinitionContentEntity po);

    List<JobDefinitionContentEntity> queryByJobDefinitionId(Long jobDefinitionId);

    JobDefinitionContentEntity queryLatestByJobDefinitionId(Long jobDefinitionId);

    void deleteByJobDefinitionId(Long jobDefinitionId);
}
